const { addItem } = require('./item_creation');


async function addUser(pool, name) {
    const addUserQuery = "INSERT INTO users (username, user_picture) VALUES ($1, 'no_pic.png');";
    const addUserParam = [name];
    await pool.query(addUserQuery, addUserParam)

    await addItem(pool, {
        'owner': name,
        'name': `${name}_root`,
        'item_type': 'root_folder'
    })
    const queryText = `
        UPDATE users
        SET root_id = (SELECT item_id FROM items WHERE owner = $1 AND item_type = 'root_folder')
        WHERE username = $2;`
    await pool.query(queryText, [name, name])
}


async function deleteUser(pool, name) {
    const queryString = 'DELETE FROM users WHERE username = $1';

    await pool.query(queryString, [name]).catch(err => console.log(err));
}


async function getUserInfo(pool, owner) {
    const queryString = 'SELECT * FROM users WHERE username = $1;';

    const userInfo = await pool.query(queryString, [owner])
    .then((res) => res.rows[0]).catch(() => false);

    return userInfo ? userInfo : false;
}

async function getUsernameFromParent(pool, parent) {
    const queryString = 'SELECT owner FROM items WHERE item_id = $1 LIMIT 1;';
    const username = await pool.query(queryString, [parent])
    .then((res) => res.rows[0]).catch(() => false);

    return username ? username : false; 
}

module.exports = {
    addUser, deleteUser, getUserInfo, getUsernameFromParent
}