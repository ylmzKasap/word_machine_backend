const { add_root } = require('./item_creation');


async function add_user(pool, name) {
    const addUserQuery = "INSERT INTO users (username, user_picture) VALUES ($1, 'no_pic.png');";
    const addUserParam = [name];
    await pool.query(addUserQuery, addUserParam)
    await add_root(pool, name);
}


async function delete_user(pool, name) {
    const queryString = 'DELETE FROM users WHERE username = $1';

    await pool.query(queryString, [name]).catch(err => console.log(err));
}


async function get_user_info(pool, owner) {
    const queryString = 'SELECT * FROM users WHERE username = $1;';

    const userInfo = await pool.query(queryString, [owner])
    .then((res) => res.rows[0]).catch(() => false);

    return userInfo ? userInfo : false;
}

async function get_username_from_parent(pool, parent) {
    const queryString = 'SELECT owner FROM items WHERE item_id = $1 LIMIT 1;';
    const username = await pool.query(queryString, [parent])
    .then((res) => res.rows[0]).catch(() => false);

    return username ? username : false; 
}

module.exports = {
    add_user,
    delete_user,
    get_user_info,
    get_username_from_parent
}