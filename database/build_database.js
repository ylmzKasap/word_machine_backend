const table_utils = require('./db_functions/table_creation');
const user_utils = require('./db_functions/user_creation');
const item_utils = require('./db_functions/item_creation');
const media_utils = require('./db_functions/media_creation');


const glob = {
    user_1: 'hayri',
    user_2: 'mahmut'
}

async function setup(db) {
    const words = ['square', 'palace', 'coffee table', 'elevator', 'roof'];
    const worter = ['Quadrat', 'Palast', 'Kaffetisch', 'Aufzug', 'dach'];
    const kelimeler = ['meydan', 'saray', 'sehpa', 'asansör', 'çatı'];

    // Create tables
    await table_utils.create_users_table(db);
    await table_utils.create_item_table(db);
    await table_utils.create_artist_table(db);
    await table_utils.create_reference_table(db);
    await table_utils.create_word_content_table(db);
    await table_utils.create_sound_table(db);
    await table_utils.create_sound_approval_table(db);
    await table_utils.create_deck_content_table(db);
    await table_utils.create_word_table(db);
    await table_utils.create_category_content_table(db);

    // Add users
    await user_utils.add_user(db, glob.user_1);
    await user_utils.add_user(db, glob.user_2);

    // Add images
    await media_utils.add_image(db, 'Van Gogh', 'van_gogh.com', 'images/square_2.png', 'admin', {english: 'square', turkish: 'karesini almak', german: 'zu quadrieren'});
    await media_utils.add_image(db, 'Van Gogh', 'van_gogh.com', 'images/square.png', 'admin', {english: 'square', turkish: 'meydan', german: 'Quadrat'});
    await media_utils.add_image(db, 'Caravaggio', 'caravaggio.com', 'images/palace.png', 'admin', {english: 'palace', turkish: 'saray', german: 'Palast'});
    await media_utils.add_image(db, 'Paul Gaugin', 'paul.com', 'images/coffee_table.jpg', 'admin', {english: 'coffee table', turkish: 'sehpa', german: 'Kaffetisch', greek: 'τραπεζάκι του καφέ'});
    await media_utils.add_image(db, 'Caspar David Friedrich', 'caspar.org', 'images/elevator.png', 'admin', {english: 'elevator', turkish: 'asansör', german: 'Aufzug'});
    await media_utils.add_image(db, 'Cladue Monet', 'monet.org', 'images/roof.png', 'admin', {english: 'roof', turkish: 'çatı', german: 'dach'});
    
    // Add sounds
    await media_utils.add_sound(db, 'images/square_2.png', 'english', 'sounds/square.mp3');
    await media_utils.add_sound(db, 'images/square.png', 'english', 'sounds/square.mp3');
    await media_utils.add_sound(db, 'images/square.png', 'turkish', 'sounds/meydan.mp3');

    // Add user_1 files.
    // Root
    await item_utils.add_folder(db, glob.user_1, 'folder_1', 'folder', 1);
    await item_utils.add_folder(db, glob.user_1, 'folder_2', 'folder', 1);
    await item_utils.add_folder(db, glob.user_1, 'thematic_1', 'thematic_folder', 1);
    await item_utils.add_folder(db, glob.user_1, 'thematic_2', 'thematic_folder', 1);
    await item_utils.add_deck(db, glob.user_1, 'deck_1', 1, ['square', 'palace', 'coffee table'], 'english', 'turkish');

    // Categories
    await item_utils.add_category(db, glob.user_1, 'category_1', 5, '#333');
    await item_utils.add_category(db, glob.user_1, 'category_2', 5, '#666');
    await item_utils.add_category(db, glob.user_1, 'category_1', 6, '#999');
    await item_utils.add_category(db, glob.user_1, 'category_3', 6, '#BBB');

    // Category items
    await item_utils.add_deck(db, glob.user_1, 'deck_1', 5, words, 'english', 'turkish', 8);
    await item_utils.add_deck(db, glob.user_1, 'deck_2', 5, words, 'english', 'turkish', 8);
    await item_utils.add_deck(db, glob.user_1, 'deck_3', 5, worter, 'german', 'english', 9);
    await item_utils.add_deck(db, glob.user_1, 'deck_4', 5, worter, 'german', 'english', 9);
    await item_utils.add_deck(db, glob.user_1, 'deck_5', 6, kelimeler, 'turkish', 'german', 10);
    await item_utils.add_deck(db, glob.user_1, 'deck_6', 6, kelimeler, 'turkish', 'german', 10);
    await item_utils.add_deck(db, glob.user_1, 'deck_1', 6, worter, 'german', 'turkish', 11);
    await item_utils.add_deck(db, glob.user_1, 'deck_7', 6, worter, 'german', 'turkish', 11);
    await item_utils.add_deck(db, glob.user_1, 'haha yes', 6, worter, 'german', 'english', 11);

    // Folder Content
    await item_utils.add_deck(db, glob.user_1, 'deck_1', 4, words, 'english', 'german');
    await item_utils.add_folder(db, glob.user_1, 'folder_3', 'folder', 4);
    await item_utils.add_folder(db, glob.user_1, 'thematic_1', 'thematic_folder', 4);

    await item_utils.add_folder(db, glob.user_1, 'folder_444', 'folder', 3);
    await item_utils.add_folder(db, glob.user_1, 'folder_1', 'folder', 24);
    await item_utils.add_folder(db, glob.user_1, 'thematic_22', 'thematic_folder', 25);
    await item_utils.add_deck(db, glob.user_1, 'deck_11', 25, words, 'english', 'turkish');

    // Add user 2 files
    await item_utils.add_folder(db, glob.user_2, 'folder_1', 'folder', 2);
    await item_utils.add_folder(db, glob.user_2, 'folder_2', 'folder', 2);
    await item_utils.add_folder(db, glob.user_2, 'thematic_1', 'thematic_folder', 2);
    await item_utils.add_category(db, glob.user_2, 'category_1', 30, '#333');
    await item_utils.add_category(db, glob.user_2, 'category_2', 30, '#F28');
    await item_utils.add_deck(db, glob.user_2, 'deck_1', 30, kelimeler, 'turkish', 'german', 31);
    await item_utils.add_deck(db, glob.user_2, 'deck_2', 30, worter, 'german', 'english', 32);
    await item_utils.add_deck(db, glob.user_2, 'deck_1', 2, words, 'english', 'turkish');
    await item_utils.add_deck(db, glob.user_2, 'deck_1', 29, words, 'english', 'german');
    await item_utils.add_folder(db, glob.user_2, 'folder_1', 'folder', 28);
}


async function teardown(db) {
    await table_utils.drop_table(db, 'words');
    await table_utils.drop_table(db, 'deck_content');
    await table_utils.drop_table(db, 'category_content');
    await table_utils.drop_table(db, 'sound_approval');
    await table_utils.drop_table(db, 'sound_paths');
    await table_utils.drop_table(db, 'artist_references');
    await table_utils.drop_table(db, 'word_content');
    await table_utils.drop_table(db, 'artists');
    await table_utils.drop_table(db, 'items');
    await table_utils.drop_table(db, 'users');
}

module.exports = {
    setup, teardown, glob
}