const item_crt_utils = require('../database/db_functions/item_creation');
const item_utils = require('../database/db_functions/item_functions');
const err_utils = require('../database/db_functions/common/index');
const utils = require("./functions");
const test_utils = require("../test/other_functions");

const itemNameFilter = /[.,\\<>"]/;
const wordNameFilter = /[.,\\/<>:"|?*]/;
const colorFilter = /^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/

// Handle deck creation.
const create_deck = async (req, res) => {
    const { username } = req.params;
    const { deckName, parent_id, wordArray, target_language, source_language, category_id } = req.body;

    const db = req.app.get('database');

    // Body mismatch
    if (test_utils.does_not_exist(
            [deckName, parent_id, wordArray, target_language, source_language, category_id])
            || Object.keys(req.body).length > 6) {
            return res.status(400).send({"errDesc": "Missing or extra body"});
    }
    
    // Type mismatch
    if (typeof deckName !== 'string' 
        || !Array.isArray(wordArray)
        || !wordArray.every(w => typeof w === 'string')
        || typeof target_language !== 'string'
        || typeof source_language !== 'string'
        || typeof parent_id !== 'string'
        || (typeof category_id !== 'string' && category_id !== null)
        ) {
        return res.status(400).send({"errDesc": "Type mismatch"});
    }

    // Forbidden character
    if (itemNameFilter.test(deckName) || wordNameFilter.test(wordArray.join(''))) {
        return res.status(400).send({"errDesc": "Forbidden character"});
    }

    // Blank values
    const filteredWords = wordArray.filter(
        word => !(test_utils.fullSpace.test(word))
    );

    if (filteredWords.length === 0) {
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
            if (categoryInfo.category_target_language !== target_language
                || categoryInfo.category_source_language !== source_language) {
                    // Category language is different from deck language.
                    categoryError = true;
                }
        } else {
            categoryError = true;}
        
        if (categoryError) {
            return res.status(400).send({"errDesc": "Invalid category"});
        } 
    }

    // Language is not supported
    if ((!test_utils.availableLanguages.includes(target_language)
        || !test_utils.availableLanguages.includes(source_language))
        || target_language === source_language) {
            return res.status(400).send({"errDesc": "Invalid language"});
        }
    
    /*     // Locate image files.
        const [missingImages, missingSounds] = await utils.locate_words(
            db, wordArray, target_language);

        if (missingImages.length > 0 || missingSounds.length > 0) {
            return res.status(400).send({
                "errDesc": "Some files could not be found",
                "images": missingImages,
                "sounds": missingSounds
            });
        } */
    
    // Create deck
    await item_crt_utils.add_deck(db, 
        username, deckName, parent_id, wordArray, target_language, source_language, category_id
        )
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
    if (test_utils.does_not_exist([folder_name, parent_id, folder_type]) 
        || Object.keys(req.body).length > 3) {
            return res.status(400).send({"errDesc": "Missing or extra body"});
    }

    // Type mismatches
    if (!([folder_name, folder_type, parent_id].every(v => typeof v === "string"))) {
            return res.status(400).send({"errDesc": "Type mismatch"});
    }
    
    // Folder type is invalid
    if (!(['folder', 'thematic_folder'].includes(folder_type))) {
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

    await item_crt_utils.add_folder(db, username, folder_name, folder_type, parent_id)
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
    const { category_name, parent_id, color, target_language, source_language } = req.body;

    const db = req.app.get('database');

    // Body values are missing or extra
    if (test_utils.does_not_exist([category_name, parent_id, color, target_language, source_language]) 
        || Object.keys(req.body).length > 5) {
            return res.status(400).send({"errDesc": "Missing or extra body"});
    }

    // Type mismatches
    if (!([category_name, parent_id, color, target_language, source_language]
        .every(v => typeof v === "string"))) {
        return res.status(400).send({"errDesc": "Type mismatch"});
    }

    // Forbidden characters
    if (itemNameFilter.test(category_name)){
        return res.status(400).send({"errDesc": "Forbidden character"});
    }

    // Invalid color value
    if (!colorFilter.test(color)) {
        return res.status(400).send({"errDesc": "Invalid input"});
    }

    // Language is not supported
    if ((!test_utils.availableLanguages.includes(target_language)
        || !test_utils.availableLanguages.includes(source_language))
        || target_language === source_language) {
            return res.status(400).send({"errDesc": "Invalid language"});
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

    await item_crt_utils.add_category(
        db, username, category_name, parent_id, color, target_language, source_language)
    .then(() => res.status(200).send())
    .catch(err => {
        const description = err_utils.handle_error(err.code);
        return res.status(400).send(
            description == 'Unique Violation' ?
            {"errDesc": `Category '${category_name}' already exists.`} : {"errDesc": description});
    });
};


// Delete Deck, Folder or Category.
const delete_item = async (req, res) => {
    const { username } = req.params;
    const { item_id } = req.body;
    const db = req.app.get('database');

    // Body values are missing or extra
    if (test_utils.does_not_exist([item_id]) || Object.keys(req.body).length > 1) {
        return res.status(400).send({"errDesc": "Missing or extra body"});
    }

    // Type mismatch
    if (typeof item_id !== 'string') {
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