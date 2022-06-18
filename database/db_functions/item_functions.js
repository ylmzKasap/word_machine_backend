const directoryUtils = require('./directory');
const queryUtils = require('./common/queries');
const { group_words } = require('./common/functions');


async function get_item_info(pool, item_id) {
    const queryString = `SELECT * FROM items WHERE item_id = $1;`;
    const itemInfo = await pool.query(queryString, [item_id])
        .then((res) => res.rows[0]).catch(() => false);
    if (!itemInfo) return false;

    const item_type = itemInfo.item_type;

    if (['root_folder', 'thematic_folder', 'folder'].includes(item_type)) {
        return itemInfo;
    }

    // Get additional info for deck and categories.
    const detailedQuery = `
        SELECT *
        FROM items
        LEFT JOIN ${item_type}_content on items.item_id = ${item_type}_content.${item_type}_key
        WHERE item_id = $1
    `
    const detailedInfo = await pool.query(detailedQuery, [item_id])
        .then((res) => res.rows[0]).catch(() => false);;

    return detailedInfo ? detailedInfo : false;
}

async function get_deck_info(pool, item_id) {
    const deckInfo = await pool.query(queryUtils.deckQuery, [item_id])
        .then(res => res.rows.length > 0 ? res.rows : false).catch(() => false);

    if (!deckInfo) {
        return false;
    }

    const groupedWords = group_words(deckInfo);
    const deckInfoObj = {
        words: groupedWords[deckInfo[0].item_id],
        target_language: deckInfo[0].target_language,
        source_language: deckInfo[0].source_language
    }

    return deckInfoObj;    
}

async function check_deck_path(pool, owner, dir_id, item_id) {
    const queryText = `
        SELECT * FROM items WHERE owner = $1
        AND item_id = $2
        AND parent_id = $3
        AND item_type = 'deck';
    `

    const checkPath = await pool.query(queryText, [owner, item_id, dir_id])
    .then(res => res.rows.length > 0).catch(() => false);

    return checkPath;
}


async function update_column_value(pool, item_id, column_name, new_value) {
    if (isNaN(new_value)) {
        new_value = `'${new_value}'`};

    const queryText = `
        UPDATE items
        SET
        ${column_name} = $1
        WHERE item_id = $2;
    `
    await pool.query(queryText, [new_value, item_id]);
}


async function update_item_order(pool, owner, item_id, new_order, direction, parent_id, category_id) {
    if (direction === 'before') {
        await update_column_value(pool, item_id, 'item_order', new_order - 0.1);
    } else if (direction === 'after') {
        await update_column_value(pool, item_id, 'item_order', new_order + 0.1);
    }

    if (category_id) {
        await update_column_value(pool, item_id, 'category_id', category_id);
    }

    await directoryUtils.reorder_directory(pool, owner, parent_id);
    return true;    
}


module.exports = {
    get_item_info, check_deck_path, update_column_value, update_item_order, get_deck_info
}