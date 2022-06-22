const item_utils = require('../database/db_functions/item_functions');
const dir_utils = require('../database/db_functions/directory');
const test_utils = require("../test/other_functions");
const utils = require("./functions");

const { add_item, add_deck } = require('../database/db_functions/item_creation');
const  { update_directory } = require('../database/db_functions/item_relocation');

module.exports = async (req, res) => {
    const { username } = req.params;
    const { item_id, new_parent, category_id, action } = req.body;

    const db = req.app.get('database');

    // Body mismatch
    if (test_utils.does_not_exist([item_id, new_parent, category_id, action]) 
        || Object.keys(req.body).length > 4) {
            return res.status(400).send({"errDesc": "Missing or extra body"});
    };

    // Type mismatch
    if ([item_id, new_parent, action].some(x => typeof x !== 'string')
        || (category_id !== null && typeof category_id !== 'string')) {
            return res.status(400).send({"errDesc": "Type mismatch"});
    };

    if (test_utils.fullSpace.test(action)) {
        return res.status(400).send({"errDesc": "Blank value"});
    };

    if (!(['copy', 'cut'].includes(action))) {
        return res.status(400).send({"errDesc": 'Bad request'});
    }

    // Get copied item.
    const itemInfo = await item_utils.get_item_info(db, item_id);
    if (itemInfo) {
        if (itemInfo.owner !== username) {
            return res.status(400).send({"errDesc": 'Inavlid directory'});
        }
        // Should not move a root folder.
        if (itemInfo.item_type === 'root_folder') {
            return res.status(400).send({"errDesc": 'Bad request'});
        }
    } else {
        return res.status(400).send({"errDesc": 'Item does not exist anymore.'});
    }

    // Get the directory the item is copied or moved into.
    const dirInfo = await item_utils.get_item_info(db, new_parent);
    let dirError = false;
    if (dirInfo) {
        if (dirInfo.owner !== username) {
            dirError = true;
        }
        // Can only move into directories.
        if (!['root_folder', 'folder', 'thematic_folder'].includes(dirInfo.item_type)) {
            dirError = true;
        }
        // Cannot move directories into a thematic folder.
        if (['folder', 'thematic_folder'].includes(
            itemInfo.item_type) 
            && dirInfo.item_type === 'thematic_folder') {
            dirError = true;
        }
        // Cannot move category out of a thematic folder.
        if (itemInfo.item_type === 'category' && dirInfo.item_type !== 'thematic_folder') {
            dirError = true;
        }
    } else {
        dirError = true;
    }

    if (dirError) {
        return res.status(400).send({"errDesc": 'Invalid directory'});
    }

    let categoryError = false;
    let categoryInfo;
    if (category_id !== null) {
        categoryInfo = await item_utils.get_item_info(db, category_id);
        if (categoryInfo.owner !== username) {
            categoryError = true;
        }
        // Category is not in the directory.
        if (categoryInfo.parent_id !== new_parent) {
            categoryError = true;
        }
        // Category_id must be null in a non-thematic directory.
        if (
            dirInfo.item_type !== 'thematic_folder'
            && category_id !== null) {
                categoryError = true;
        }
        // Categories cannot have a category id.
        if (itemInfo.item_type === 'category'){
            categoryError = true;
        }
        if (itemInfo.category_id == category_id) {
            return res.status(200).send({"errDesc": 'No change needed'});
        }
    } else {
        if (itemInfo.parent_id === new_parent) {
            return res.status(200).send({"errDesc": 'No change needed'});
        }
    }

    // Category id must exist in a thematic directory except for categories.
    if (dirInfo.item_type === 'thematic_folder') {
        if (itemInfo.item_type !== 'category' && category_id === null) {
            categoryError = true;
        }
    }

    if (categoryError) {
        return res.status(400).send({"errDesc": 'Invalid category'});
    }

    if (categoryInfo) {
        if (itemInfo.target_language !== categoryInfo.category_target_language) {
            return res.status(400).send({"errDesc": "Category target language is different."});
        } else if (itemInfo.source_language !== categoryInfo.category_source_language) {
            return res.status(400).send({"errDesc": "Category source language is different."});
        }
    }
    
    // Check whether a folder is copied into its own subdirectory.
    if (itemInfo.item_type === 'folder') {
        const subtree = await dir_utils.get_recursive_tree(db, username, item_id);
        const subIds = subtree.map(item => item.item_id);

        if (subIds.includes(new_parent) || item_id === new_parent) {
            return res.status(400).send(
                {"errDesc": `This directory is a subdirectory of '${itemInfo.item_name}'.`});
        }
    }

    const titleType = itemInfo.item_type.charAt(0).toUpperCase() + itemInfo.item_type.slice(1);
    // Insert copied item.
    if (action === 'copy') {
        if (itemInfo.item_type !== 'deck') {
            return res.status(400).send({"errDesc": 'Can only copy a deck.'});
        }
        const deckInfo = await item_utils.get_deck_info(db, item_id);
        const targetWords = deckInfo.words.map(w => w[deckInfo.target_language]);
        await add_deck(db, username, itemInfo.item_name, new_parent, targetWords,
            deckInfo.target_language, deckInfo.source_language, category_id)
            .catch((err) => res.status(400).send(
                {"errDesc": `${titleType} '${itemInfo.item_name}' already exists in the directory.`}));
    }
    // Update the directory of the cut item.
    else if (action === 'cut') {
        const newDirectory = await dir_utils.get_directory(db, username, new_parent);
        let categoryItems;

        if (itemInfo.item_type === 'category') {
            categoryItems = await dir_utils.get_directory(db, username, itemInfo.parent_id, item_id);

            if (utils.find_unique_violation(
                newDirectory[0], categoryItems, ['item_type', 'owner', 'item_name'])) {
                    return  res.status(400).send(
                        {"errDesc": 'Paste failed: There are items with the same name'})
                }
        }
        
        const updateStatus = await update_directory(
            db, username, item_id, itemInfo.parent_id, new_parent, category_id)

        if (updateStatus.error) {
            return res.status(400).send(
                {"errDesc": `${titleType} '${itemInfo.item_name}' already exists in the directory.`})
        }

        if (itemInfo.item_type === 'category') {
            // Move the category items. 
            for (let item of categoryItems) {
                await item_utils.update_column_value(db, item.item_id, 'parent_id', new_parent);
            }
        }
         
    }
    return res.status(200).send();
};