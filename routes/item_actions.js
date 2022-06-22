const err_utils = require('../database/db_functions/common/index');
const item_utils = require('../database/db_functions/item_functions');
const dir_utils = require('../database/db_functions/directory');
const { update_directory } = require('../database/db_functions/item_relocation');
const test_utils = require("../test/other_functions");

// Change item order in a directory.
const change_item_order = async (req, res) => {
    const { username } = req.params;
    const { item_id, new_order, direction, category_id } = req.body;

    const db = req.app.get('database');

    // Body mismatch
    if (test_utils.does_not_exist([item_id, new_order, direction, category_id])
        || Object.keys(req.body).length > 4) {
        return res.status(400).send({"errDesc": "Missing or extra body"});
    };

    // Type mismatch
    if (([item_id, new_order, direction].some(x => typeof x !== 'string'))
        || (category_id !== null && typeof category_id !== 'string')) {
            return res.status(400).send({"errDesc": "Type mismatch"});
    }

    const itemInfo = await item_utils.get_item_info(db, item_id);
    if (!itemInfo
        || itemInfo.owner !== username
        || itemInfo.item_type === 'root_folder'
        || new_order <= 0
        || !['before', 'after'].includes(direction)) {
        return res.status(400).send({"errDesc": "Bad request"});
    }

    let categoryError = false;
    let categoryInfo;
    if (category_id !== null) {
        // Provided category must be valid.
        categoryInfo = await item_utils.get_item_info(db, category_id);
        if (!categoryInfo) {
            categoryError = true;
        }
        // Category's item type must be a category.
        if (categoryInfo.item_type !== 'category') {
            categoryError = true;
        }
        // Moved item cannot be a category if it has a category_id.
        if (itemInfo.item_type === 'category'){
            categoryError = true;
        }
        // Category does not belong to the user in params.
        if (categoryInfo.owner !== username) {
            categoryError = true;
        }
        // Category and moved item are not in the same folder.
        if (categoryInfo.parent_id !== itemInfo.parent_id) {
            categoryError = true;
        }    
    } else {
        const dirInfo = await item_utils.get_item_info(db, itemInfo.parent_id);
        if (!dirInfo) {
            categoryError = true;
        } else {
            // Items must have a category in a thematic folder.
            if (dirInfo.item_type === 'thematic_folder'
                && itemInfo.item_type !== 'category'
                && category_id === null) {
                    categoryError = true;
                }
        }
    }

    if (categoryError) {
        return res.status(400).send({"errDesc": "Invalid category"});
    }

    if (categoryInfo) {
        if (itemInfo.target_language !== categoryInfo.category_target_language) {
            return res.status(400).send({"errDesc": "Category target language is different."});
        } else if (itemInfo.source_language !== categoryInfo.category_source_language) {
            return res.status(400).send({"errDesc": "Category source language is different."});
        }
    }

    // Item moved to the same place.
    if (itemInfo.item_order === new_order) {
        if (category_id !== null) {
            if (itemInfo.category_id === category_id) {
                return res.status(200).send({"errDesc": 'No change needed'});
            }
        } else {
            if (itemInfo.category_id === category_id) {
                return res.status(200).send({"errDesc": 'No change needed'});
            }
        }
    }
    
    await item_utils.update_item_order(
        db, username, item_id, new_order, direction, itemInfo.parent_id, category_id)
        .then(() => res.status(200).send())
        .catch(() => res.status(400).send({"errDesc": "Something went wrong..."}));
};


// Send an item to a specific folder.
const set_item_directory = async (req, res) => {
    const { username } = req.params;
    const { item_id, target_id } = req.body;

    const db = req.app.get('database');

    // Body mismatch
    if (test_utils.does_not_exist([item_id, target_id]) || Object.keys(req.body).length > 2) {
        return res.status(400).send({"errDesc": "Missing or extra body"});
    };

    // Type mismatch
    if (typeof item_id !== 'string' || (target_id !== null && typeof target_id !== 'string')) {
        return res.status(400).send({"errDesc": "Type mismatch"});
    }

    // Cannot move into itself
    if (item_id === target_id) {
        return res.status(400).send({"errDesc": "Invalid directory"});
    }
    
    const itemInfo = await item_utils.get_item_info(db, item_id);
    if (!itemInfo
        || itemInfo.owner !== username
        || itemInfo.item_type === 'root_folder') {
        return res.status(400).send({"errDesc": "Bad request"});
    }

    let new_target_id;
    let new_target_name;
    let new_target_type;
    let targetError = false;
    if (target_id) {
        // Moving item into a subfolder.
        const targetInfo = await item_utils.get_item_info(db, target_id);
        if (!targetInfo) {
            targetError = true;
        }

        if (targetInfo.owner !== username) {
            return res.status(400).send({"errDesc": "Invalid directory"});
        }

        new_target_id = target_id;
        new_target_name = targetInfo.item_name;
        new_target_type = targetInfo.item_type;

        // Only move to directories.
        if (!['root_folder', 'folder'].includes(targetInfo.item_type)) {
            return res.status(400).send({"errDesc": "Invalid directory"});
        }
    } else {
        // Moving item back to the parent.
        const parentInfo = await item_utils.get_item_info(db, itemInfo.parent_id);

        if (!parentInfo) {
            targetError = true;
        }

        // Cannot move beyond root folder.
        if (parentInfo.item_type === 'root_folder') {
            return res.status(400).send({"errDesc": "Invalid directory"});
        }

        new_target_id = parentInfo.parent_id;
        new_target_name = 'parent folder';
        new_target_type = parentInfo.item_type;
    }

    if (targetError) {
        return res.status(400).send({"errDesc": "Parent directory does not exist anymore."});
    }

    // Categories can only be moved into thematic folders.
    if (itemInfo.item_type === 'category' && new_target_type !== 'thematic_folder') {
        return res.status(400).send({"errDesc": "Invalid directory"});
    }

    // Cannot move item into its own subdirectory
    if (itemInfo.item_type === 'folder') {
        const folder_tree = await dir_utils.get_recursive_tree(db, username, item_id);
        const treeIds = folder_tree.map(item => item.item_id);
        if (treeIds.includes(new_target_id)) {
            return res.status(400).send(
                {"errDesc": `This directory is a subdirectory of '${itemInfo.item_name}'`});
        }
    }

    const updateStatus = await update_directory(
        db, username, item_id, itemInfo.parent_id, new_target_id, null);

    if (!updateStatus.error) {
        return res.status(200).send();
    } else {
        const description = err_utils.handle_error(updateStatus.code);
        return res.status(400).send(
            description == 'Unique Violation' ? 
            {"errDesc": `'${itemInfo.item_name}' already exists in` 
                + ` ${target_id ? `'${new_target_name}'`: 'the parent folder'}.`}
            : {"errDesc": "Something went wrong..."});
    }
};

module.exports = {
    change_item_order, set_item_directory
}