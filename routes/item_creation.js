const item_crt_utils = require('../database/db_functions/item_creation');
const item_utils = require('../database/db_functions/item_functions');
const err_utils = require('../database/db_functions/index');
const utils = require("./functions");
const test_utils = require("../test/other_functions");

const itemNameFilter = /[.,\\<>"]/;
const wordNameFilter = /[.,\\/<>:"|?*]/;
const colorFilter = /^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/

// Handle deck creation.
const create_deck = async (req, res) => {
    const { username } = req.params;
    const { deckName, words, parent_id, category_id, target_language, source_language } = req.body;

    const db = req.app.get('database');

    // Body mismatch
    if (test_utils.is_blank([deckName, words, parent_id, category_id])
            || Object.keys(req.body).length > 4) {
            return res.status(400).send({"errDesc": "Missing or extra body"});
    }
    
    // Type mismatch
    if (typeof deckName !== 'string' 
        || !Array.isArray(words)
        || typeof parent_id !== 'number'
        || (typeof category_id !== 'number' && category_id !== null)
        ) {
        return res.status(400).send({"errDesc": "Type mismatch"});
    }

    // Forbidden character
    if (itemNameFilter.test(deckName) || wordNameFilter.test(words.join(''))) {
        return res.status(400).send({"errDesc": "Forbidden character"});
    }

    // Blank values
    const filteredWords = words.filter(
        word => !(test_utils.fullSpace.test(word))
    );

    if (filteredWords.length === 0 || test_utils.fullSpace.test(deckName)) {
        return res.status(400).send({"errDesc": "Blank value"});
    }

    // Prevent invalid directory
    const dirInfo = await item_utils.get_item_info(db, parent_id);
    let dirError = false;
    if (dirInfo) {
        if (dirInfo.owner !== username) {
            // Owner does not have such directory.
            dirError = true;}
        if (!(['folder', 'root_folder'].includes(dirInfo.item_type))) {
            // Directory must be a folder.
            if (category_id === null) {
                dirError = true;
            }
        } else {
            if (category_id !== null) {
                // No categories in a regular folder
                dirError = true;
            }
        }
    } else {
        dirError = true;}

    if (dirError) {
        return res.status(400).send({"errDesc": "Invalid directory"});
    }

    // Prevent invalid category
    if (category_id !== null) {
        const categoryInfo = await item_utils.get_item_info(db, category_id);
        let categoryError = false;
        if (categoryInfo) {
            if (categoryInfo.owner !== username) {
                // Owner does not have such category.
                categoryError = true;
            }
            if (categoryInfo.parent_id !== parent_id) {
                // Directory does not have such category.
                categoryError = true;
            }
        } else {
            categoryError = true;}
        
        if (categoryError) {
            return res.status(400).send({"errDesc": "Invalid category"});
        } 
    }
    
    // Locate image files.
    const [missingImages, missingSounds] = utils.locate_words(
        db, words, target_language);
    
    // Create deck
    await item_crt_utils._item(db, {
        'name': deckName,
        'owner': username,
        'item_type': 'file',
        'parent': parent_id,
        'category_id': category_id,
        'words': foundFiles.join(',')
    })
    .then(() => res.status(200).send())
    .catch(err => {
        const description = err_utils.handle_error(err.code);
        return res.status(400).send(
            description == 'Unique Violation' ? 
            {"errDesc": `Deck '${deckName}' already exists.`} : {"errDesc": description});
    });
};


// Handle folder creation.
const create_folder = async (req, res) => {
    const { username } = req.params;
    const { folder_name, parent_id, folder_type } = req.body;

    const db = req.app.get('database');

    // Body values are missing or extra
    if (test_utils.is_blank([folder_name, parent_id, folder_type]) 
        || Object.keys(req.body).length > 3) {
            return res.status(400).send({"errDesc": "Missing or extra body"});
    }

    // Type mismatches
    if (!([typeof folder_name, typeof folder_type].every(v => v === "string"))
        || typeof parent_id !== 'number') {
            return res.status(400).send({"errDesc": "Type mismatch"});
    }

    // Blank folder name
    if (test_utils.fullSpace.test(folder_name) || test_utils.fullSpace.test(folder_type)) {
        return res.status(400).send({"errDesc": "Blank value"});
    }
    
    // Folder type is invalid
    if (!(['regular_folder', 'thematic_folder'].includes(folder_type))) {
        return res.status(400).send({"errDesc": "Bad request"});
    }

    // Forbidden character in folder name
    if (itemNameFilter.test(folder_name)) {
        return res.status(400).send({"errDesc": "Forbidden character"});
    }
    
    // Invalid directory to create a folder
    const dirInfo = await item_utils.get_item_info(db, parent_id);
    let dirError = false;
    if (dirInfo) {
        if (dirInfo.owner !== username) {
            dirError = true;
        }
        if ((!(['folder', 'root_folder'].includes(dirInfo.item_type)))) {
            dirError = true;
        }
    } else {
        dirError = true;
    }

    if (dirError) {
        return res.status(400).send({"errDesc": "Invalid directory"});
    }

    await item_crt_utils.add_item(db, {
        'name': folder_name,
        'owner': username,
        'item_type': folder_type === 'thematic_folder' ? 'thematic_folder' : 'folder',
        'parent': parent_id,
    })
    .then(() => res.status(200).send())
    .catch(err => {
        const description = err_utils.handle_error(err.code);
        return res.status(400).send(
            description == 'Unique Violation' ?
            {"errDesc":  `Folder '${folder_name}' already exists.`} : {"errDesc": description});
   });
};


// Handle category creation.
const create_category = async (req, res) => {
    const { username } = req.params;
    const { category_name, parent_id, color } = req.body;

    const db = req.app.get('database');

    // Body values are missing or extra
    if (test_utils.is_blank([category_name, parent_id, color]) 
        || Object.keys(req.body).length > 3) {
            return res.status(400).send({"errDesc": "Missing or extra body"});
    }

    // Type mismatches
    if (typeof category_name !== 'string' || typeof parent_id !== 'number'
        || typeof color !== 'string') {
            return res.status(400).send({"errDesc": "Type mismatch"});
    }

    // Forbidden characters
    if (itemNameFilter.test(category_name)){
        return res.status(400).send({"errDesc": "Forbidden character"});
    }

    // Blank category name
    if (test_utils.fullSpace.test(category_name)) {
        return res.status(400).send({"errDesc": "Blank value"});
    }

    // Invalid color value
    if (!colorFilter.test(color)) {
        return res.status(400).send({"errDesc": "Invalid input"});
    }

    // Invalid directory to create a category
    const dirInfo = await item_utils.get_item_info(db, parent_id);
    let dirError = false;
    if (dirInfo) {
        if (dirInfo.owner !== username) {
            dirError = true;
        }
        if (dirInfo.item_type !== 'thematic_folder') {
            dirError = true;
        }
    } else {
        dirError = true;
    }

    if (dirError) {
        return res.status(400).send({"errDesc": "Invalid directory"});
    }

    await item_crt_utils.add_item(db, {
        'name': category_name,
        'owner': username,
        'item_type': 'category',
        'parent': parent_id,
        'color': color
    })
    .then(() => res.status(200).send())
    .catch(err => {
        const description = err_utils.handle_error(err.code);
        return res.status(400).send(
            description == 'Unique Violation' ?
            {"errDesc": `Category '${category_name}' already exists.`} : {"errDesc": description});
    });
};


// Delete File, Folder or Category.
const delete_item = async (req, res) => {
    const { username } = req.params;
    const { item_id } = req.body;
    const db = req.app.get('database');

    // Body values are missing or extra
    if (test_utils.is_blank([item_id]) || Object.keys(req.body).length > 1) {
        return res.status(400).send({"errDesc": "Missing or extra body"});
    }

    // Type mismatch
    if (typeof item_id !== 'number') {
        return res.status(400).send({"errDesc": "Type mismatch"});
    }

    // Invalid directory to delete
    const itemInfo = await item_utils.get_item_info(db, item_id);
    if (itemInfo) {
        if (itemInfo.owner !== username) {
            return res.status(400).send({"errDesc": 'Bad request'});
        }
        if (itemInfo.item_type === "root_folder") {
            return res.status(400).send({"errDesc": 'Cannot delete root folder'});
        }
    } else {
        return res.status(400).send({"errDesc": 'Item does not exist anymore...'});
    }

    const deleteStatus = await item_crt_utils.delete_item(db, username, item_id);

    if (!deleteStatus.error) {
        return res.status(200).send();
    } else {
        return res.status(400).send({"errDesc": 'Item does not exist anymore...'});
    }
};

module.exports = {
    create_deck, create_folder, create_category, delete_item
}