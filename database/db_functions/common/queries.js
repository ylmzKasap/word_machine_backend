const deckQuery = `
    SELECT * FROM items
        LEFT JOIN deck_content on items.item_id = deck_content.deck_key
        LEFT JOIN words on deck_content.deck_key = words.deck_id
        LEFT JOIN word_content on words.media_id = word_content_id
        LEFT JOIN translations on word_content.word_content_id = translations.translation_id
        LEFT JOIN sound_paths on word_content.word_content_id = sound_paths.sound_id
    WHERE item_id = $1
    ORDER BY word_order`

module.exports = {
    deckQuery
}