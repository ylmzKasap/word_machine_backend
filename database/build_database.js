const table_utils = require('./db_functions/table_creation');
const user_utils = require('./db_functions/user_creation');
const item_utils = require('./db_functions/item_creation');


const glob = {
    user_1: 'hayri',
    user_2: 'mahmut'
}

async function setUp(db) {
    const words = 'roof.png,square.png,elevator.png,sock.png';

    // Create tables
    await table_utils.createUsersTable(db);
    await table_utils.createItemTable(db);
    await table_utils.createContentTable(db);

    // Add users
    await user_utils.addUser(db, glob.user_1);
    await user_utils.addUser(db, glob.user_2);

    // Add user_1 files.
    // Root
    await item_utils.addItem(db, {'name': 'folder_1', 'owner': glob.user_1, 'item_type': 'folder', 'parent': 1});
    await item_utils.addItem(db, {'name': 'folder_2', 'owner': glob.user_1, 'item_type': 'folder', 'parent': 1});
    await item_utils.addItem(db, {'name': 'thematic_1', 'owner': glob.user_1, 'item_type': 'thematic_folder', 'parent': 1});
    await item_utils.addItem(db, {'name': 'thematic_2', 'owner': glob.user_1, 'item_type': 'thematic_folder', 'parent': 1});
    await item_utils.addItem(db, {'name': 'deck_1', 'owner': glob.user_1, 'item_type': 'file', 'parent': 1, 'content': {'words': words}});

    // Categories
    await item_utils.addItem(db, {'name': 'category_1', 'owner': glob.user_1, 'item_type': 'category', 'parent': 5, 'content': {'color': '#333'}});
    await item_utils.addItem(db, {'name': 'category_2', 'owner': glob.user_1, 'item_type': 'category', 'parent': 5, 'content': {'color': '#666'}});
    await item_utils.addItem(db, {'name': 'category_1', 'owner': glob.user_1, 'item_type': 'category', 'parent': 6, 'content': {'color': '#999'}});
    await item_utils.addItem(db, {'name': 'category_3', 'owner': glob.user_1, 'item_type': 'category', 'parent': 6, 'content': {'color': '#BBB'}});

    // Category items
    await item_utils.addItem(db, {'name': 'deck_1', 'owner': glob.user_1, 'item_type': 'file', 'parent': 5, 'category_id': 8, 'content': {'words': words}});
    await item_utils.addItem(db, {'name': 'deck_2', 'owner': glob.user_1, 'item_type': 'file', 'parent': 5, 'category_id': 8, 'content': {'words': words}});
    await item_utils.addItem(db, {'name': 'deck_3', 'owner': glob.user_1, 'item_type': 'file', 'parent': 5, 'category_id': 9, 'content': {'words': words}});
    await item_utils.addItem(db, {'name': 'deck_4', 'owner': glob.user_1, 'item_type': 'file', 'parent': 5, 'category_id': 9, 'content': {'words': words}});
    await item_utils.addItem(db, {'name': 'deck_5', 'owner': glob.user_1, 'item_type': 'file', 'parent': 6, 'category_id': 10, 'content': {'words': words}});
    await item_utils.addItem(db, {'name': 'deck_6', 'owner': glob.user_1, 'item_type': 'file', 'parent': 6, 'category_id': 10, 'content': {'words': words}});
    await item_utils.addItem(db, {'name': 'deck_1', 'owner': glob.user_1, 'item_type': 'file', 'parent': 6, 'category_id': 11, 'content': {'words': words}});
    await item_utils.addItem(db, {'name': 'deck_7', 'owner': glob.user_1, 'item_type': 'file', 'parent': 6, 'category_id': 11, 'content': {'words': words}});
    await item_utils.addItem(db, {'name': 'haha yes', 'owner': glob.user_1, 'item_type': 'file', 'parent': 6, 'category_id': 11, 'content': {'words': words}});

    // Folder Content
    await item_utils.addItem(db, {'name': 'deck_1', 'owner': glob.user_1, 'item_type': 'file', 'parent': 4, 'content': {'words': words}});
    await item_utils.addItem(db, {'name': 'folder_3', 'owner': glob.user_1, 'item_type': 'folder', 'parent': 4});
    await item_utils.addItem(db, {'name': 'thematic_1', 'owner': glob.user_1, 'item_type': 'thematic_folder', 'parent': 4});

    await item_utils.addItem(db, {'name': 'folder_444', 'owner': glob.user_1, 'item_type': 'folder', 'parent': 3});
    await item_utils.addItem(db, {'name': 'folder_1', 'owner': glob.user_1, 'item_type': 'folder', 'parent': 24});
    await item_utils.addItem(db, {'name': 'thematic_22', 'owner': glob.user_1, 'item_type': 'thematic_folder', 'parent': 25});
    await item_utils.addItem(db, {'name': 'deck_11', 'owner': glob.user_1, 'item_type': 'file', 'parent': 25, 'content': {'words': words}});

    // Add user 2 files
    await item_utils.addItem(db, {'name': 'folder_1', 'owner': glob.user_2, 'item_type': 'folder', 'parent': 2});
    await item_utils.addItem(db, {'name': 'folder_2', 'owner': glob.user_2, 'item_type': 'folder', 'parent': 2});
    await item_utils.addItem(db, {'name': 'thematic_1', 'owner': glob.user_2, 'item_type': 'thematic_folder', 'parent': 2});
    await item_utils.addItem(db, {'name': 'category_1', 'owner': glob.user_2, 'item_type': 'category', 'parent': 30, 'content': {'color': '#333'}});
    await item_utils.addItem(db, {'name': 'category_2', 'owner': glob.user_2, 'item_type': 'category', 'parent': 30, 'content': {'color': '#F28'}});
    await item_utils.addItem(db, {'name': 'deck_1', 'owner': glob.user_2, 'item_type': 'file', 'parent': 30, 'category_id': 31, 'content': {'words': words}});
    await item_utils.addItem(db, {'name': 'deck_2', 'owner': glob.user_2, 'item_type': 'file', 'parent': 30, 'category_id': 32, 'content': {'words': words}});
    await item_utils.addItem(db, {'name': 'deck_1', 'owner': glob.user_2, 'item_type': 'file', 'parent': 2, 'content': {'words': words}});
    await item_utils.addItem(db, {'name': 'deck_1', 'owner': glob.user_2, 'item_type': 'file', 'parent': 29, 'content': {'words': words}});
    await item_utils.addItem(db, {'name': 'folder_1', 'owner': glob.user_2, 'item_type': 'folder', 'parent': 28});
}


async function teardown(db) {
    await table_utils.dropTable(db, 'contents');
    await table_utils.dropTable(db, 'items');
    await table_utils.dropTable(db, 'users');
}

module.exports = {
    setUp, teardown, glob
}