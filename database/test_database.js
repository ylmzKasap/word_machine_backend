const { Pool } = require("pg");

const db = new Pool({
    user: process.env["TEST_USER"],
    password: process.env["TEST_PASSWORD"],
    database: process.env["TEST_DATABASE"],
    host: process.env["TEST_HOST"],
    port: process.env["TEST_PORT"]
});

module.exports = db;