async function createUsersTable(pool) {
    await pool.query(`CREATE TABLE users (
        user_id BIGSERIAL PRIMARY KEY NOT NULL,
        username VARCHAR(30) UNIQUE NOT NULL,
        user_picture VARCHAR(200),
        root_id INT UNIQUE
    );`).catch(err => console.log(err));
}


async function createItemTable(pool) {
    await pool.query(`CREATE TABLE items (
        item_id BIGSERIAL PRIMARY KEY NOT NULL,
        owner VARCHAR(40) NOT NULL REFERENCES users (username)
        ON DELETE CASCADE,
        item_type VARCHAR(20) NOT NULL,
        item_name VARCHAR(40) NOT NULL,
        parent_id INT REFERENCES items (item_id)
        ON DELETE CASCADE,
        item_order DECIMAL NOT NULL,
        category_id BIGINT REFERENCES items (item_id) ON DELETE CASCADE,
        CONSTRAINT unique_items UNIQUE (owner, item_type, item_name, parent_id)
    );`).catch(err => console.log(err));
}


async function createContentTable(pool) {
    await pool.query(`CREATE TABLE contents (
        content_number BIGSERIAL PRIMARY KEY NOT NULL,
        content_id INT NOT NULL REFERENCES items (item_id) ON DELETE CASCADE,
        words VARCHAR(4000),
        color VARCHAR(40)
    );`).catch(err => console.log(err));
}


async function dropTable(pool, table) {
    await pool.query(`DROP TABLE ${table};`).catch(err => console.log(err));
}

module.exports = {
    createUsersTable, createItemTable, createContentTable, dropTable
}