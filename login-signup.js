import express from "express";
import bcrypt from "bcrypt";
import passport from "./passportConfig.js";
import pkg from "passport-local";
// import GoogleStrategy from "passport-google-oauth2"; //import googlestrategy
import db from './db.js';
import { createBucket } from "./s3functions.js";


const router = express.Router();
const LocalStrategy = pkg.Strategy;
const saltRounds = 10;

router.get("/logout", (req, res) => {
    req.logOut((err) => {
        if (err) {
            res.next(err);
            console.log("error in logging out: ", err);
        }
        res.redirect("/");
    })
})

router.post("/login", passport.authenticate("local", {
    successRedirect: "/uploads",
    failureRedirect: "/"
}));

// router.get("/auth/google", passport.authenticate("google", {
//     scope: ["profile", "email"]
// }));

// router.get("/auth/google/form",passport.authenticate("google",{
//     successRedirect:"/form",
//     failureRedirect:"/login"
// }))
router.post("/signup", async (req, res) => {
    console.log("block: post(signup).");
    try {
        const username = req.body.username;
        const password = req.body.password;

        const checkresult = await db.query("select * from users where username=($1)", [username]);
        if (checkresult.rows.length > 0) {
            res.redirect("/");

        } else {
            bcrypt.hash(password, saltRounds, async (err, hash) => {
                if (err) {
                    console.log("error in bcrypt: ", err);
                }
                else {
                    const insertresult = await db.query("INSERT INTO users (username, password) VALUES ($1, $2) returning *", [username, hash]);
                    // console.log("insert result: ", insertresult);
                    const user = insertresult.rows[0];

                    
                    console.log(user);
                    await createBucket(user.username);
                    req.login(user, (err) => {
                        console.log("success");
                        res.redirect("/uploads");
                    });
                }

            })

        }

    }
    catch (err) {
        console.log("error in post signup catch block executing. err: ", err);

    }

})

passport.use("local", new LocalStrategy(async (username, password, cb) => {
    const checkresult = await db.query("select * from users where username= ($1)", [username]);
    if (checkresult.rows.length > 0) {
        const user = checkresult.rows[0];
        const storedHashPassword = user.password;
        bcrypt.compare(password, storedHashPassword, (err, valid) => {
            if (valid) {
                //Passed password check
                return cb(null, user);
            } else {
                //Did not pass password check
                return cb(null, false);
            }
        })
    }
    else {
        return cb("user not found");

    }
}))


export default router;
