import express from "express";
import connectPgSimple from "connect-pg-simple";
import db from "./db.js";
import passport from "./passportConfig.js";
import session from "express-session";
import loginSignup from "./login-signup.js";
import { generatePresignedUrl, listBuckets, listObjects, listFolders, renameFile, deleteFile, uploadFile } from "./s3functions.js";


const app=express();
const port=8080;
const pgSession=connectPgSimple(session);

app.use(session({
  store: new pgSession({
    pool: db,            
    tableName: "session" 
  }),
  secret: "secretlysecret",    
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
  }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));
app.use("/", loginSignup);
app.use(express.static("public"));




app.get("/",(req,res)=>{
    res.render("login.ejs");
})
app.get("/signup",(req,res)=>{
    res.render("signup.ejs");
})

app.get("/uploads", async(req, res) => {
    if (req.isAuthenticated()) {
        const folders= await listObjects(req.user.username);
        console.log("folders:",folders);
        console.log("folders.objects: ",folders.objects);
        res.render("upload.ejs",{folders:folders.objects});
    }
    else {
        res.redirect("/");
    }
});

app.get("/uploadFile", async(req,res)=>{
    try{
    if (req.isAuthenticated()) {
        const sessionUsername=req.user.username;
        const {folder, fileName}= req.query;
        const key= folder === "/" ? fileName : `${folder}${fileName}`; 
        const url=await uploadFile(sessionUsername, key);
        console.log("Presigned URL generated:", url);
        res.json({url,key});
    }
}
    catch(err){
        console.log("Error in /uploadFile route", err);
    }
})

app.get("/createFolder", async(req,res)=>{
    try{
    if (req.isAuthenticated()) {
        const sessionUsername=req.user.username;
        const folderName=req.query.folderName;
        const key= folderName.endsWith('/') ? folderName : `${folderName}/`;
        const url=await uploadFile(sessionUsername, key);
        console.log(url);
        res.json({url,key});
    }
}
    catch(err){
        console.log("Error in /createFolder route", err);
    }
})

app.get("/mydata",async(req,res)=>{

    if (req.isAuthenticated()) {
        
    const sessionUsername=req.user.username;

    const {objects,totalObjects, totalSize}=await listObjects(sessionUsername);

    const keys = objects.map(obj => obj.Key);
     //keys is an array of all the file names in the bucket

    const result=await generatePresignedUrl(sessionUsername, keys);

    res.render("mydata.ejs",{
        result: result,
        objects:{objects, totalObjects, totalSize},
        sessionUsername:sessionUsername
    });

    }
    else {
        res.redirect("/");
    }
})

app.get("/data",async (req,res)=>{
    if (req.isAuthenticated()) {
        
    const users=await listBuckets()
    const sessionUsername=req.session.passport.user.username;
    res.render("data.ejs", {users:users, sessionUsername:sessionUsername, result:[]});
    }
    else {
        res.redirect("/");
    }
})

app.get("/delete", async(req, res) => {
    if (req.isAuthenticated()) {
        await deleteFile(req.user.username,req.query.key);
        res.redirect("/mydata");
    }
});

app.post("/rename", async(req,res)=>{
    if (req.isAuthenticated()) {
        const oldKey=req.body.itemKeyInput;
        const newKey=req.body.newName;
        await renameFile(req.user.username, oldKey, newKey);
        res.redirect("/mydata");
    }
});

app.get("/userdata",async(req,res)=>{
    try{
    if (req.isAuthenticated()) {
        const selectedUser=req.query.username;
        const sessionUsername=req.user.username;
        const users=await listBuckets()
        const {objects, totalObjects, totalSize }=await listObjects(selectedUser);
        const keys = objects.map(obj => obj.Key);

        const result=await generatePresignedUrl(selectedUser, keys);
        
        res.render("data.ejs",{
            users:users, 
            sessionUsername:sessionUsername,
            result: result,
            selectedUser: selectedUser
        });


    }
}
    catch(err){
        console.log("Error in /userdata route", err);
    }

});

app.listen(port, (err)=>{
    console.log("listening on port ", port);
    if(err){
        console.log("error in listening: ", err);
    }
})