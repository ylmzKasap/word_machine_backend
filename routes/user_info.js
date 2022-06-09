const dir_utils = require('../database/db_functions/directory');
const item_utils = require('../database/db_functions/item_functions');
const user_utils = require('../database/db_functions/user_creation');

// Serve User Info.
const serve_user = async (req, res) => {
    const { username, directory_id } = req.params;

    const db = req.app.get('database');
    const info = await user_utils.getUserInfo(db, username);

    const dirId = directory_id === 'home' ? await dir_utils.getRoot(db, username) : directory_id;
    
    if (info) {
        if (dirId) {
            const [directory, dirInfo] = await dir_utils.getDirectory(db, username, dirId);

            if (directory) {
                return res.status(200).send([directory, dirInfo]);
            } else {
                return res.status(404).send({"errDesc": "Directory not found"})
            }

        } else {
            return res.status(200).send(info);
        }
    } else {
        return res.status(404).send({"errDesc": "User not found"});
    }
};

// Serve Item Info.
const serve_item = async (req, res) => {
    const { username, directory_id, item_id } = req.params;
    
    const db = req.app.get('database');
    const pathExists = await item_utils.checkFilePath(db, username, directory_id, item_id);

    if (!pathExists) {
        return res.status(404).send({"errDesc": "Item not found"});
    }

    const itemInfo = await item_utils.getItemInfo(db, item_id);
    
    if (itemInfo === null) {
        return res.status(404).send({"errDesc": "Deck not found"});
    } else {
        return res.status(200).send(itemInfo);
    }
};

module.exports = {
    serve_user, serve_item
}
