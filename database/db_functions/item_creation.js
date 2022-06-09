const directoryUtils = require('./directory');
const { getItemInfo } = require('./item_functions');


async function addItem(pool, infObj) {
    const { name, item_type, owner, parent, content } = infObj;
    let { category_id } = infObj;

    if (!category_id) {category_id = null};
    const categoryQuery = category_id ? ` AND category_id = $7` : "AND category_id IS NULL";
    const orderSubQuery = `
        (SELECT count(*) + 1 FROM items
        WHERE owner = $1 AND parent_id = $2${categoryQuery})`;

    if (item_type === 'root_folder') {
        const queryString = `
            INSERT INTO items (owner, item_name, item_type, item_order)
            VALUES ($1, $2, $3, 0);`
        await pool.query(queryString, [owner, name, item_type]);
    } 
        
    else if (['folder', 'file', 'category', 'thematic_folder'].includes(item_type)) {
        const queryString = `
            INSERT INTO items (owner, item_name, item_type, parent_id, item_order, category_id)
            VALUES ($3, $4, $5, $6, ${orderSubQuery}, $7);`
        const parameters = [owner, parent, owner, name, item_type, parent, category_id];
        await pool.query(queryString, parameters);

        // Add the content.
        if (['file', 'category'].includes(item_type)) {
            const contentQuery = `
                SELECT item_id FROM items
                WHERE (owner = $1
                AND item_name = $2
                AND parent_id = $3
                AND item_type = $4)
                LIMIT 1;`
            const contentParms = [owner, name, parent, item_type];
            const item_id = await pool.query(contentQuery, contentParms);

            const content_id = item_id.rows[0].item_id;
            await pool.query(`
                INSERT INTO contents (content_id)
                VALUES (${content_id});`);
                
            Object.keys(content).forEach(cKey => {
                const insertQuerry =  `
                    UPDATE contents SET ${cKey} = $1 WHERE content_id = $2`
                const insertParams = [content[cKey], content_id];
                pool.query(insertQuerry, insertParams)
                .catch(err => console.log(err));
            });
        }
    }
}


async function deleteItem(pool, owner, item_id) {
    const queryText = `
        DELETE FROM items WHERE item_id = $1;`;

    const parentInfo = await getItemInfo(pool, item_id)
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

    const orderStatus = await directoryUtils.reorderDirectory(pool, owner, parent_id);
    return !orderStatus.error;
}


module.exports = {
    addItem, deleteItem
}