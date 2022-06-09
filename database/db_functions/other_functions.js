const roV = (queryResult, order=0) => {
    // Returns a row value of a database query.
  
    try {
      const rowValue = queryResult.rows[order];
      return rowValue;
    } 
    catch {
      console.log('Cannot get row value.', queryResult.rows, order);
    }
}

async function get_file (db, name, type, parent) {
  const getItem = `
    SELECT * FROM items
      WHERE item_name = $1 AND item_type = $2 AND parent_id = $3
      LIMIT 1;
    `

    const itemInfo = await db.query(getItem, [name, type, parent])
    .then(res => res.rows[0])
    .catch(() => null);

    return itemInfo ? itemInfo : null;  
  }


module.exports = {
    roV, get_file
}