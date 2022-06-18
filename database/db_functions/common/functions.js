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

async function get_item (db, name, type, parent) {
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

function get_word_keys(word) {
  return {
    deck_id: word.deck_id,
    word_order: word.word_order,
    image_path: word.image_path,
    [word.target_language]: word[word.target_language],
    [word.source_language ? word.source_language : 'source_translation']: word[word.source_language],
    [`${word.target_language}_sound_path`]: word[`${word.target_language}_sound_path`],
    artist_id: word.artist_content_id
  }
}

function group_words(wordArray) {
  let groupedWords = {};
  
  for (let word of wordArray) {
    if (!groupedWords.hasOwnProperty(word.item_id)) {
      groupedWords[word.item_id] = [];
    }
    groupedWords[word.item_id].push(get_word_keys(word));
  }
  
  return groupedWords;
}


module.exports = {
  roV, get_item, group_words
}