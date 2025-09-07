import {Pool} from "pg";
import env from "dotenv";
env.config();

const db=new Pool({
    connectionString: process.env.connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});


export default db;