async function add_image(
    pool, artist_name, reference_link, image_path, submitted_by, translation_object) {
        
    const insert_order = ['english', 'turkish', 'german', 'spanish', 'french', 'greek'];
    const translations = insert_order.map(l => translation_object[l] ? translation_object[l] : null);

    let placeholders = [];
    for (let i = 5; i < translations.length + 5; i++) {
        placeholders.push(`$${i}`);
    }
    const placeholderString = placeholders.join(', ');

    const imageQuerry = `
        WITH artist_table AS (
            INSERT INTO artists
                (artist_name)
            VALUES
                ($1)
            ON CONFLICT
                (artist_name) DO NOTHING
            RETURNING
                artist_id),
        content_table AS (
            INSERT INTO word_content
                (artist_content_id, image_path, submitted_by)
            SELECT
                (SELECT * FROM artist_table
                    UNION SELECT artist_id FROM artists WHERE artist_name = $1), $2, $3
            RETURNING
                word_content_id, artist_content_id
        ),
        translation_table AS (
            INSERT INTO translations
                (translation_id, english, turkish, german, spanish, french, greek)
            SELECT
                word_content_id , ${placeholderString}
            FROM
                content_table
            RETURNING
                translation_id
        ),
        translation_approval_table AS (
            INSERT INTO translation_approval
                (approval_id)
            SELECT
                translation_id
            FROM
                translation_table
        ),
        sound_table AS (
            INSERT INTO sound_paths
                (sound_id)
            SELECT
                word_content_id FROM content_table
            RETURNING
                sound_id
        ),
        approval_table AS (
            INSERT INTO sound_approval
                (approval_id)
            SELECT
                sound_id FROM sound_table
        )
        INSERT INTO artist_references
            (referred_id, reference_link)
        SELECT
            artist_content_id, $4
        FROM
            content_table
        ON CONFLICT
            DO NOTHING;`
    await pool.query(imageQuerry, 
        [artist_name, image_path, submitted_by, reference_link, ...translations]);
}

async function add_sound(pool, translation_id, language, sound_path) {
    const queryString = `
        WITH translation_table AS (
            SELECT
                translation_id, sound_id
            FROM
                translations
            LEFT JOIN
                sound_paths
            ON
                translations.translation_id = sound_paths.sound_id
            WHERE
                translation_id = $1
        )
        UPDATE
            sound_paths
        SET
            ${language}_sound_path = $2
        FROM
            translation_table
        WHERE
            sound_paths.sound_id = translation_table.sound_id;
    `
    await pool.query(queryString, [translation_id, sound_path]);
}

module.exports = {
    add_image, add_sound
}