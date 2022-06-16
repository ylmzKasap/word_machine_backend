const directoryUtils = require('./directory');
const { get_item_info } = require('./item_functions');


async function add_root(pool, user) {
    const queryString = `
        WITH new_root AS (
            INSERT INTO items
                (owner, item_name, item_type, item_order)
            VALUES
                ($1, $2, $3, 0)
            RETURNING item_id)
        UPDATE
            users
        SET
            root_id = item_id
        FROM
            new_root
        WHERE
            username = $1;  
        `
    await pool.query(queryString, [user, `${user}_root`, 'root_folder']);
}

async function add_folder(pool, owner, folder_name, folder_type, parent_id) {
    const orderSubQuery = `
        (SELECT
            count(*) + 1
        FROM
            items
        WHERE
            owner = $1 AND parent_id = $2 AND category_id IS NULL)`;
    
    const queryString = `
        INSERT INTO items 
            (owner, item_name, item_type, parent_id, item_order)
        VALUES
            ($3, $4, $5, $6, ${orderSubQuery});
    `
    await pool.query(queryString, [owner, parent_id, owner, folder_name, folder_type, parent_id]);
}

async function add_category(pool, owner, category_name, parent_id, color, target, source) {
    const sourceL = source ? source : null;

    const orderSubQuery = `
        (SELECT
            count(*) + 1
        FROM
            items
        WHERE
            owner = $1 AND parent_id = $2 AND category_id IS NULL)`;
    
    const queryString = `
        WITH new_category AS (
            INSERT INTO items 
                (owner, item_name, item_type, parent_id, item_order)
            VALUES
                ($3, $4, 'category', $5, ${orderSubQuery})
            RETURNING item_id)
        INSERT INTO category_content
            (category_key, color, category_target_language, category_source_language)
        SELECT
            new_category.item_id, $6, $7, $8
        FROM
            new_category;`
        
    await pool.query(queryString, [owner, parent_id, owner, category_name, parent_id, color, target, sourceL]);
}

async function add_deck(pool, owner, deck_name, parent_id, wordArray, target, source, category_id) {
    const [operator, categoryVal] = category_id ? ["=", category_id] : ["IS", "NULL"];
    const category = category_id ? category_id : null;

    // Use category's language info if category_id exists.
    let [targetLang, sourceLang] = [target, source];
    if (category_id) {
        const languageQuery = `
        SELECT
            category_target_language, category_source_language
        FROM
            category_content
        WHERE
            category_key = $1
    `
    const categoryLanguages = await pool.query(languageQuery, [category_id])
        .then(res => res.rows[0]).catch(err => console.log(err));

    targetLang = categoryLanguages.category_target_language;
    sourceLang = categoryLanguages.category_source_language;
    } 

    // Insert the deck.
    const orderSubQuery = `
        (SELECT count(*) + 1 FROM items
        WHERE owner = $1 AND parent_id = $2 AND category_id ${operator} ${categoryVal})`;
    
    const queryString = `
        WITH item_table AS (
            INSERT INTO items
                (owner, item_type, item_name, parent_id, item_order, category_id)
            VALUES
                ($3, 'deck', $4, $5, ${orderSubQuery}, $6)
            RETURNING item_id
        )
        INSERT INTO deck_content
            (deck_key, target_language, source_language)
        SELECT
            item_id, $7, $8
        FROM
            item_table
        RETURNING
            deck_key;
    `
    const deck_key = await pool.query(queryString, [
        owner, parent_id, owner, deck_name, parent_id, category, targetLang, sourceLang]);

    // Insert the words.
    const wordQuery = `
        WITH translation_table AS (
            SELECT
                translation_id
            FROM
                translations
            WHERE
                ${targetLang} = $1
            LIMIT 1
        )
        INSERT INTO words
            (media_id, deck_id, word_order)
        SELECT
            translation_id, $2, $3
        FROM
            translation_table;
        `
    for (let i = 1; i < wordArray.length + 1; i++) {
        await pool.query(wordQuery, [wordArray[i-1], deck_key.rows[0].deck_key, i]);
    }
}

async function delete_item(pool, owner, item_id) {
    const queryText = `
        DELETE FROM items WHERE item_id = $1;`;

    const parentInfo = await get_item_info(pool, item_id)
    .catch(() => false);

    if (!parentInfo) {
        return false;
    }
    const parent_id = parentInfo.parent_id;

    const deleteStatus = await pool.query(queryText, [item_id])
    .catch(() => false);
    
    if (!deleteStatus) {
        return false;
    }

    const orderStatus = await directoryUtils.reorder_directory(pool, owner, parent_id);
    return !orderStatus.error;
}


module.exports = {
    add_root, add_folder, add_category, add_deck, delete_item
}