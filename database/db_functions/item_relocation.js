const directoryUtils = require('./directory')

async function updateDirectory(pool, owner, item_id, parent_id, new_parent_id, category_id) {
    const categoryQuery = category_id ? ` AND category_id = $5` : " AND category_id IS NULL";
    // Move the item.
    const queryText = `
        UPDATE items
        SET 
            parent_id = $1,
            category_id = $5,
            item_order = (SELECT count(*) + 1 from items WHERE owner = $2 AND parent_id = $3${categoryQuery})
        WHERE item_id = $4;
    `;

    const moveStatus = await pool.query(queryText, [new_parent_id, owner, new_parent_id, item_id, category_id])
    .catch((err) => ({"error": true, "code": err.code}));

    if (moveStatus.error) {
        return moveStatus;
    }

    // Fix the order of remeaning items.
    const orderStatus = await directoryUtils.reorderDirectory(pool, owner, parent_id)
    .catch((err) => ({"error": true, "code": err.code}));

    return orderStatus;
}

module.exports = {
    updateDirectory
}