const err_utils = require('../database/db_functions/index');
const item_utils = require('../database/db_functions/item_functions');
const dir_utils = require('../database/db_functions/directory');
const { updateDirectory } = require('../database/db_functions/item_relocation');
const test_utils = require("../test/other_functions");

// Change item order in a directory.
const change_item_order = async (req, res) => {
    const { username } = req.params;
    const { item_id, new_order, direction, category_id } = req.body;

    const db = req.app.get('database');

    // Body mismatch
    if (test_utils.is_blank([item_id, new_order, direction, category_id])
        || Object.keys(req.body).length > 4) {
        return res.status(400).send({"errDesc": "Missing or extra body"});
    };

    // Type mismatch
    if (typeof item_id !== 'number' || typeof new_order !== 'number'
        || typeof direction !== 'string'
        || (category_id !== null && typeof category_id !== 'number')) {
            return res.status(400).send({"errDesc": "Type mismatch"});
    }

    if (test_utils.fullSpace.test(direction)) {
        return res.status(400).send({"errDesc": "Blank value"});
    }

    const itemInfo = await item_utils.getItemInfo(db, item_id);
    if (!itemInfo
        || itemInfo.owner !== username
        || itemInfo.item_type === 'root_folder'
        || new_order <= 0
        || !['before', 'after'].includes(direction)) {
        return res.status(400).send({"errDesc": "Bad request"});
    }

    let categoryError = false;
    if (category_id !== null) {
        // Provided category must be valid.
        var categoryInfo = await item_utils.getItemInfo(db, category_id);
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
        const dirInfo = await item_utils.getItemInfo(db, itemInfo.parent_id);
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

    // Item moved to the same place.
    if (parseInt(itemInfo.item_order) === new_order) {
        if (category_id !== null) {
            if (parseInt(itemInfo.category_id) === category_id) {
                return res.status(200).send({"errDesc": 'No change needed'});
            }
        } else {
            if (itemInfo.category_id === category_id) {
                return res.status(200).send({"errDesc": 'No change needed'});
            }
        }
    }
    
    await item_utils.updateItemOrder(
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
    if (test_utils.is_blank([item_id, target_id]) || Object.keys(req.body).length > 2) {
        return res.status(400).send({"errDesc": "Missing or extra body"});
    };

    // Type mismatch
    if (typeof item_id !== 'number' || (target_id !== null && typeof target_id !== 'number')) {
        return res.status(400).send({"errDesc": "Type mismatch"});
    }

    // Cannot move into itself
    if (item_id === target_id) {
        return res.status(400).send({"errDesc": "Invalid directory"});
    }
    
    const itemInfo = await item_utils.getItemInfo(db, item_id);
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
        const targetInfo = await item_utils.getItemInfo(db, target_id);
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
        const parentInfo = await item_utils.getItemInfo(db, itemInfo.parent_id);

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
        const folder_tree = await dir_utils.getRecursiveTree(db, username, item_id);
        const treeIds = folder_tree.map(item => parseInt(item.item_id));
        if (treeIds.includes(new_target_id)) {
            return res.status(400).send(
                {"errDesc": `This directory is a subdirectory of '${itemInfo.item_name}'`});
        }
    }

    const updateStatus = await updateDirectory(
        db, username, item_id, itemInfo.parent_id, new_target_id, null);

    if (!updateStatus.error) {
        return res.status(200).send();
    } else {
        const description = err_utils.handleError(updateStatus.code);
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