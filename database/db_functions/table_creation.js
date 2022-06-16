async function create_users_table(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
        user_id BIGSERIAL PRIMARY KEY NOT NULL,
        username VARCHAR(30) UNIQUE NOT NULL,
        user_picture VARCHAR(200),
        root_id INT UNIQUE
    );`).catch(err => console.log(err));
}


async function create_item_table(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS items (
        item_id BIGSERIAL PRIMARY KEY NOT NULL,
        owner VARCHAR(40) NOT NULL REFERENCES users (username) ON DELETE CASCADE,
        item_type VARCHAR(20) NOT NULL,
        item_name VARCHAR(40) NOT NULL,
        parent_id BIGINT REFERENCES items (item_id) ON DELETE CASCADE,
        item_order DECIMAL NOT NULL,
        category_id BIGINT REFERENCES items (item_id) ON DELETE CASCADE,
        CONSTRAINT unique_items UNIQUE (owner, item_type, item_name, parent_id)
    );`).catch(err => console.log(err));
}

async function create_artist_table(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS artists (
        artist_id BIGSERIAL PRIMARY KEY NOT NULL,
        artist_name VARCHAR(50) UNIQUE NOT NULL,
        artist_approved BOOLEAN NOT NULL DEFAULT false
    );`)
}

async function create_reference_table(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS artist_references (
        reference_id BIGSERIAL PRIMARY KEY NOT NULL,
        referred_id BIGINT REFERENCES artists (artist_id),
        reference_link VARCHAR(200) NOT NULL UNIQUE
    );`)
}

async function create_word_content_table(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS word_content (
        word_content_id BIGSERIAL PRIMARY KEY NOT NULL,
        artist_content_id BIGINT REFERENCES artists (artist_id),
        image_path VARCHAR(200) NOT NULL UNIQUE,
        submitted_by VARCHAR(10) NOT NULL,
        image_approved BOOLEAN NOT NULL DEFAULT false
    );`)
}

async function create_translation_table(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS translations (
        translation_id BIGINT PRIMARY KEY REFERENCES word_content (word_content_id),
        english VARCHAR(100),
        turkish VARCHAR(100),
        german VARCHAR(100),
        spanish VARCHAR(100),
        french VARCHAR(100),
        greek VARCHAR(100)
    );`)
}

async function create_translation_approval_table(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS translation_approval (
        approval_id BIGINT PRIMARY KEY REFERENCES translations (translation_id),
        english_translation_approval BOOLEAN NOT NULL DEFAULT false,
        turkish_translation_approval BOOLEAN NOT NULL DEFAULT false,
        german_translation_approval BOOLEAN NOT NULL DEFAULT false,
        spanish_translation_approval BOOLEAN NOT NULL DEFAULT false,
        french_translation_approval BOOLEAN NOT NULL DEFAULT false,
        greek_translation_approval BOOLEAN NOT NULL DEFAULT false
    );`)
}

async function create_sound_table(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS sound_paths (
        sound_id BIGINT PRIMARY KEY REFERENCES translations (translation_id),
        english_sound_path VARCHAR(200),
        turkish_sound_path VARCHAR(200),
        german_sound_path VARCHAR(200),
        spanish_sound_path VARCHAR(200),
        french_sound_path VARCHAR(200),
        greek_sound_path VARCHAR(200)
    );`)
}

async function create_sound_approval_table(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS sound_approval (
        approval_id BIGINT PRIMARY KEY REFERENCES sound_paths (sound_id),
        english_sound_approval BOOLEAN NOT NULL DEFAULT false,
        turkish_sound_approval BOOLEAN NOT NULL DEFAULT false,
        german_sound_approval BOOLEAN NOT NULL DEFAULT false,
        spanish_sound_approval BOOLEAN NOT NULL DEFAULT false,
        french_sound_approval BOOLEAN NOT NULL DEFAULT false,
        greek_sound_approval BOOLEAN NOT NULL DEFAULT false
    );`)
}

async function create_deck_content_table(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS deck_content (
        deck_key BIGINT PRIMARY KEY NOT NULL REFERENCES items (item_id) ON DELETE CASCADE,
        completed BOOLEAN DEFAULT false,
        target_language VARCHAR(50) NOT NULL,
        source_language VARCHAR(50)
    );`)
}

async function create_word_table(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS words (
        word_id BIGSERIAL PRIMARY KEY NOT NULL,
        media_id BIGINT NOT NULL REFERENCES word_content (word_content_id),
        deck_id BIGINT NOT NULL REFERENCES deck_content (deck_key) ON DELETE CASCADE,
        word_order INT NOT NULL
    );`)
}

async function create_category_content_table(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS category_content (
        category_key BIGINT NOT NULL REFERENCES items (item_id) ON DELETE CASCADE,
        category_target_language VARCHAR(50) NOT NULL,
        category_source_language VARCHAR(50) NOT NULL,
        color VARCHAR(40) NOT NULL
    );`)
}

async function drop_table(pool, table) {
    await pool.query(`DROP TABLE IF EXISTS ${table};`).catch(err => console.log(err));
}

module.exports = {
    create_users_table,
    create_item_table,
    create_artist_table,
    create_reference_table,
    create_word_content_table,
    create_translation_table,
    create_translation_approval_table,
    create_sound_table,
    create_sound_approval_table,
    create_deck_content_table,
    create_category_content_table,
    create_word_table,
    drop_table
}