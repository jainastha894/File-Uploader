import {S3Client} from "@aws-sdk/client-s3";
import { CreateBucketCommand, PutObjectCommand, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from 'dotenv';
dotenv.config();


// Create an S3 client
const client= new S3Client({
    region: "ap-south-1",
    credentials:{
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY
    }
});

// Function to create a bucket
async function createBucket(bucketName){
    try{
        const command= new CreateBucketCommand({Bucket:bucketName});
        const response= await client.send(command);
        console.log("Bucket Created Successfully",response);
    }
    catch(err){
        console.log("Error in creating bucket",err);
    }
}

// Function to upload a file
async function uploadFile(bucketName, key){
    try{
        const command=new PutObjectCommand({
            Bucket:bucketName,
            Key:key,
            ContentType: "application/octet-stream"
        });
        const url= await getSignedUrl(client, command);
        return url;
    }
    catch(err){
        console.log("Error in uploading file",err);
    }
}

//Function to list buckets
async function listBuckets(){
    try{
        const command= new ListBucketsCommand({});
        const response= await client.send(command);
        return response.Buckets;
    }
    catch(err){
        console.log("Error in listing buckets",err);
    }
}

//Function to list objects in a bucket
async function listObjects(bucketName){
    let totalObjects=0;
    let totalSize=0;
    try{
        const command= new ListObjectsV2Command({Bucket:bucketName});
        const response= await client.send(command);
        if (response.Contents) {
            response.Contents.forEach((obj)=> {
                totalSize += obj.Size;   // file size in bytes
                totalObjects++;            // count files
            });
        }
        return { objects:response.Contents, totalObjects:totalObjects, totalSize:totalSize };
    }
    catch(err){

        console.log("Error in listing objects",err);
    }
}


//Function to generate a presigned URL for downloading an object
async function generatePresignedUrl(bucketName, objectKeys){
    try{
        if (!Array.isArray(objectKeys)) {
            objectKeys = [objectKeys]; // convert single key to array
        }
        const result=await Promise.all(
            objectKeys.map(async(key)=>{
            const command=new GetObjectCommand({
            Bucket:bucketName,
            Key:key
        });
        const url= await getSignedUrl(client,command);
        return {key, url};
            })
        );
        return result;
        
    }
    
    catch(err){
        console.log("Error in generating presigned URL",err);
    }
}

async function deleteFile(bucketName, objectKey){
    try{
        const command=new DeleteObjectCommand({
            Bucket:bucketName,
            Key:objectKey
        });
        await client.send(command);
        console.log("File Deleted Successfully"); 
    }
    catch(err){
        console.log("Error in deleting file",err);
    }
}

async function renameFile(bucketName, oldKey, newKey){
    try{
        // Copy the object to the new key
        const copyCommand=new CopyObjectCommand({
            Bucket:bucketName,
            CopySource:`${bucketName}/${oldKey}`,
            Key:newKey
        });
        await client.send(copyCommand);
        // Delete the old object
        const deleteCommand=new DeleteObjectCommand({
            Bucket:bucketName,
            Key:oldKey
        });
        await client.send(deleteCommand);
        console.log("File Renamed Successfully"); 
    }
    catch(err){
        console.log("Error in renaming file",err);
    }
}

async function listFolders(bucketName){
    try{
        const command= new ListObjectsV2Command({Bucket:bucketName, Delimiter: '/'});
        const response= await client.send(command);
        return response.CommonPrefixes; // This will contain the folder names
    }
    catch(err){
        console.log("Error in listing folders",err);
    }
}

export {createBucket, uploadFile, listBuckets,listObjects, listFolders, generatePresignedUrl, renameFile, deleteFile};