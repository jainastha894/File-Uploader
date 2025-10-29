import {S3Client} from "@aws-sdk/client-s3";
import {PutBucketCorsCommand,PutPublicAccessBlockCommand, CreateBucketCommand, PutObjectCommand, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
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

// Function to create a bucket and set CORS dynamically
async function createBucket(bucketName) {
  try {
    console.log(`🚀 Creating bucket: ${bucketName}`);

    // 1️⃣ Create the bucket
    const createCommand = new CreateBucketCommand({
      Bucket: bucketName,
      CreateBucketConfiguration: { LocationConstraint: "ap-south-1" },
    });
    await client.send(createCommand);
    console.log(`✅ Bucket created successfully: ${bucketName}`);

    // 2️⃣ Block public access (keep bucket private)
    const publicAccessConfig = new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    });
    await client.send(publicAccessConfig);
    console.log(`✅ Public access blocked for: ${bucketName}`);

    // 3️⃣ Determine frontend origin dynamically
    let allowedOrigins = [];
    if (process.env.NODE_ENV === "production") {
      // Replace this with your actual EB domain
      allowedOrigins.push("http://file-uploader-env.eba-pbztz7zq.ap-south-1.elasticbeanstalk.com/");
    } else {
      // local development
      allowedOrigins.push("http://localhost:8080");
    }

    // 4️⃣ Apply CORS configuration
    const corsConfig = {
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: allowedOrigins,
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    };

    const corsCommand = new PutBucketCorsCommand(corsConfig);
    await client.send(corsCommand);
    console.log(`✅ CORS configured for: ${bucketName} → ${allowedOrigins.join(", ")}`);

  } catch (err) {
    console.error(`❌ Error in creating bucket (${bucketName}):`, err);
  }
}

// Function to upload a file
async function uploadFile(bucketName, key){
    try{
        console.log(key);
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

async function listBuckets() {
    try {
        const command = new ListBucketsCommand({});
        const response = await client.send(command);

        // Filter out Elastic Beanstalk bucket
        const filteredBuckets = response.Buckets.filter(
            b => b.Name !== 'elasticbeanstalk-ap-south-1-279843290698'
        );

        return filteredBuckets;
    } catch (err) {
        console.log("Error in listing buckets", err);
    }
}


async function listObjects(bucketName) {
    let totalObjects = 0;
    let totalSize = 0;

    try {
        const command = new ListObjectsV2Command({ Bucket: bucketName });
        const response = await client.send(command);

        let objects = (response.Contents || []).filter(obj => {
            // ✅ include only actual files, not folders
            return !obj.Key.endsWith("/");
        });

        objects.forEach(obj => {
            totalSize += obj.Size;
            totalObjects++;
        });

        return { 
            objects, 
            totalObjects, 
            totalSize 
        };

    } catch (err) {
        console.log("Error in listing objects", err);
        return { objects: [], totalObjects: 0, totalSize: 0 };
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