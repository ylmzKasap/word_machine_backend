const { group_words } = require('./common/functions');

async function check_directory(pool, owner, dir_id) {
    const queryText = `
        SELECT * FROM items WHERE owner = $1
        AND item_id = $2
        AND item_type IN ('folder', 'thematic_folder', 'root_folder')
        LIMIT 1;`;

    const checkDir = await pool.query(queryText, [owner, dir_id])
    .then((res) => res.rows[0]).catch(() => false);

    return checkDir ? {'exists': true, 'info': checkDir} : {'exists': false, 'info': null};
}

async function get_directory(pool, owner, dir_id, category_id='') {
    // Return values:
    // Directory exists -> [itemsOfDirectory, directoryInfo]
    // Directory does not exist -> [false]

    const dir = await check_directory(pool, owner, dir_id);
    if (!dir.exists) {
        return [false];
    }

    const deckQuery = `
        SELECT * FROM items
        LEFT JOIN deck_content on items.item_id = deck_content.deck_key
        WHERE parent_id = $1 AND item_type = 'deck' ${category_id && `AND category_id = $2`}
    `
    const deckParameters = category_id ? [dir_id, category_id] : [dir_id];
    let allDecks = await pool.query(deckQuery, deckParameters)
        .then(res => res.rows).catch(() => null);
    
    // Get all word info
    const wordQuery = `
        SELECT * FROM items
            LEFT JOIN deck_content on items.item_id = deck_content.deck_key
            LEFT JOIN words on deck_content.deck_key = words.deck_id
            LEFT JOIN word_content on words.media_id = word_content_id
            LEFT JOIN translations on word_content.word_content_id = translations.translation_id
            LEFT JOIN sound_paths on word_content.word_content_id = sound_paths.sound_id
        WHERE owner = $1 AND parent_id = $2 AND item_type = 'deck' ${category_id && `AND category_id = $3`}`
        
    const wordParameters = category_id ? [owner, dir_id, category_id] : [owner, dir_id];
    const allWords = await pool.query(wordQuery, wordParameters)
        .then(res => res.rows).catch(() => null);
   
    const groupedWords = group_words(allWords);
    for (let i = 0; i < allDecks.length; i++) {
        allDecks[i]['words'] = groupedWords[allDecks[`${i}`].item_id];    
    }

    if (category_id) {
        return allDecks;
    }

    const categoryQuery = `
        SELECT * FROM items
            INNER JOIN category_content ON items.item_id = category_content.category_key
        WHERE parent_id = $1
    `
    const allCategories = await pool.query(categoryQuery, [dir_id])
        .then(res => res.rows).catch(() => null);
    
    const folderQuery = `
        SELECT * FROM items WHERE parent_id = $1 AND item_type IN ('folder', 'thematic_folder');
    `
    const allFolders = await pool.query(folderQuery, [dir_id])
        .then(res => res.rows).catch(() => null);
    
    if (allFolders === null || allCategories === null || allDecks === null) {
        return [false];
    }
    
    const allItems = [...allFolders, ...allCategories, ...allDecks];
    return [allItems, dir.info];
}


async function get_root(pool, owner) {
    const queryString = 'SELECT root_id FROM users WHERE username = $1;';

    const rootInfo = await pool.query(queryString, [owner])
    .then(res => res.rows[0])
    .catch(() => false);

    return rootInfo ? rootInfo.root_id : false;
}


async function get_grandparent(pool, parent_id, owner) {
    const queryText = `
        SELECT parent_id FROM items WHERE item_id = $1 AND owner = $2;`;

    const grandparent_id = await pool.query(queryText, [parent_id, owner])
    .then(res => res.rows[0])
    .catch(() => false);

    return grandparent_id ? grandparent_id.parent_id : false;
}


async function reorder_directory(pool, owner, directory_id) {
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

async function get_recursive_tree(pool, owner, item_id) {
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
    check_directory, get_directory, get_root, get_grandparent, reorder_directory, get_recursive_tree
}