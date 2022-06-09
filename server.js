require('dotenv').config();
const db_tests = require('./database/build_database');
const startApp = require('./app');
const development_db = require('./database/development_database');
const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";
const ssl = process.env.NODE_ENV == 'production' ? '?ssl=true' : '';

const database = new Pool({
  connectionString: isProduction ? process.env.DATABASE_URL + ssl : development_db
});

const app = startApp(database);

async function main() {
  await db_tests.teardown(database);
  await db_tests.setUp(database);
}

main()

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Listening on port ${port}`));