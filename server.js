require('dotenv').config();
const db_tests = require('./database/build_database');
const startApp = require('./app');
const development_db = require('./database/development_database');
const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

let database;
if (isProduction) {
  database = new Pool({
    connectionString: process.env.DATABASE_URL
  , ssl: {
    rejectUnauthorized: false,
  }});
} else {
  database = new Pool({
    connectionString: development_db});
}

const app = startApp(database);

async function main() {
}

main()

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Listening on port ${port}`));