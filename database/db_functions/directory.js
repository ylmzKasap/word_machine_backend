async function checkDirectory(pool, owner, dir_id) {
    const queryText = `
        SELECT * FROM items WHERE owner = $1
        AND item_id = $2
        AND item_type IN ('folder', 'thematic_folder', 'root_folder')
        LIMIT 1;`;

    const checkDir = await pool.query(queryText, [owner, dir_id])
    .then((res) => res.rows[0]).catch(() => false);

    return checkDir ? {'exists': true, 'info': checkDir} : {'exists': false, 'info': null};
}

async function getDirectory(pool, owner, dir_id, category_id='') {
    // Return values:
    // Directory exists -> [itemsOfDirectory, directoryInfo]
    // Directory does not exist -> [false]

    const dir = await checkDirectory(pool, owner, dir_id);
    if (!dir.exists) {
        return [false];
    }

    const queryText = `
        SELECT * FROM items
        LEFT JOIN contents ON items.item_id = contents.content_id
        WHERE owner = $1 AND parent_id = $2${category_id && ` AND category_id = $3`};`
    const parameters = category_id ? [owner, dir_id, category_id] : [owner, dir_id];

    const directory = await pool.query(queryText, parameters)
    .catch(() => null);

    return directory === null ? [false] : [directory.rows, dir.info];
}


async function getRoot(pool, owner) {
    const queryString = 'SELECT root_id FROM users WHERE username = $1;';

    const rootInfo = await pool.query(queryString, [owner])
    .then(res => res.rows[0])
    .catch(() => false);

    return rootInfo ? rootInfo.root_id : false;
}


async function getGrandparent(pool, parent_id, owner) {
    const queryText = `
        SELECT parent_id FROM items WHERE item_id = $1 AND owner = $2;`;

    const grandparent_id = await pool.query(queryText, [parent_id, owner])
    .then(res => res.rows[0])
    .catch(() => false);

    return grandparent_id ? grandparent_id.parent_id : false;
}


async function reorderDirectory(pool, owner, directory_id) {
    const queryText = `
        UPDATE 
            items
        SET
            item_order = T2.row_number
        FROM 
            (SELECT item_id, item_order, category_id, row_number()
                OVER (
                    PARTITION BY category_id
                    ORDER BY category_id, item_order)
                FROM items
                WHERE owner = $1 AND parent_id = $2)
            AS T2
        WHERE T2.item_id = items.item_id;
    `

    await pool.query(queryText, [owner, directory_id]);    
    return {"error": false, "code": ""};
}

async function getRecursiveTree(pool, owner, item_id) {
    const queryText = `
        WITH RECURSIVE item_tree AS (
            SELECT
                t1.item_id,
                t1.item_type,
                t1.item_name,
                t1.parent_id,
                t1.item_order,
                1 as depth,
                t1.item_id::VARCHAR as path
            FROM items t1
            WHERE owner = $1 AND parent_id = $2

            UNION ALL

            SELECT
                t2.item_id,
                t2.item_type,
                t2.item_name,
                t2.parent_id,
                t2.item_order,
                depth + 1,
                path::VARCHAR || '/' || t2.item_id::VARCHAR
            FROM items t2
            JOIN item_tree ht ON ht.item_id = t2.parent_id
        ) SELECT * FROM item_tree;
    `;
    const tree = await pool.query(queryText, [owner, item_id]);
    return tree.rows;
}

module.exports = {
    checkDirectory, getDirectory, getRoot, getGrandparent, reorderDirectory, getRecursiveTree
}