import passport from "passport";
import db from "./db.js";

passport.serializeUser((user, cb) => {
    cb(null, user);
    console.log("user.id in serialize user: ",user.id);
});

passport.deserializeUser(async (user, cb) => {

    try {
        const result = await db.query("SELECT * FROM users WHERE id = $1", [user.id]);
        cb(null, result.rows[0]);
    } catch (err) {
        cb(err);
    }
    

});
export default passport;