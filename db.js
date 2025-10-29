import {Pool} from "pg";
import env from "dotenv";
env.config();

const db=new Pool({
    connectionString: process.env.CONNECTION_STRING
});


export default db;