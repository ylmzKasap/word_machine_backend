const app = require('../app');
const request = require('supertest');

const db = require('../database/test_database');
const {roV } = require('../database/db_functions/other_functions');
const setup = require('../database/db_functions/setup');
const { glob } = require('../database/build_database');

const { getItemInfo } = require('../database/db_functions/item_functions');
const test_utils = require('../test/test_functions');
const { fail_with_json } = require('../test/test_functions');


setup.setupBeforeAndAfter(db);


const itemByNameQuery = `
    SELECT * FROM items
        LEFT JOIN contents ON items.item_id = contents.content_id
    WHERE item_name = $1 AND owner = $2 AND parent_id = $3 AND item_type = $4;`


describe('Create a deck', () => {
    const createDeckUrl = `/create_deck/${glob.user_1}`;

    test('Create valid deck', async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "myDeck",
                "content": {"words": ["elevator", "square", "natural"]},
                "parent_id": 1,
                "category_id": null
            });
        
        expect(response.status).toEqual(200);

        const deck = await db.query(itemByNameQuery, ["myDeck", glob.user_1, 1, "file"]);

        expect(roV(deck).item_name).toEqual("myDeck");
        expect(roV(deck).item_order).toEqual("6");
        expect(roV(deck).category_id).toBe(null);
        expect(roV(deck).words).toEqual("elevator.png,square.png,natural.png");
    });

    test('Fail on duplicate deck', async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_1",
                "content": {"words": ["elevator", "square", "natural"]},
                "parent_id": 1,
                "category_id": null
            });
        
        fail_with_json(response, 400, "Deck 'deck_1' already exists.");
    });

    test("Should work even there are other types of files with the same name", async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "folder_1",
                "content": {"words": ["elevator", "square", "natural"]},
                "parent_id": 1,
                "category_id": null
            });
        
        expect(response.status).toEqual(200);
    });

    test('Deck name and words should not include forbidden characters', async () => {
        const deckResponse = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck<33",
                "content": {"words": ["elevator", "square", "natural"]},
                "parent_id": 1,
                "category_id": null
            });
        
        fail_with_json(deckResponse, 400, "Forbidden character");

        const wordResponse = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_33",
                "content": {"words": ["ele,vator", "squa<re", "natural"]},
                "parent_id": 1,
                "category_id": null
            });
        
        fail_with_json(wordResponse, 400, "Forbidden character");
    });

    test('Parent must exist', async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_33",
                "content": {"words": ["elevator", "square", "natural"]},
                "parent_id": 3463,
                "category_id": null
            });
        
        fail_with_json(response, 400, "Invalid directory");
    });

    test("Directory must be owned by the same user", async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_33",
                "content": {"words": ["elevator", "square", "natural"]},
                "parent_id": 2,
                "category_id": null
            });
        
        fail_with_json(response, 400, "Invalid directory");
    });

    test('Should work with a valid input in category', async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "myDeck",
                "content": {"words": ["elevator", "square", "natural"]},
                "parent_id": 5,
                "category_id": 8
            });
        
        expect(response.status).toEqual(200);

        const deck = await db.query(itemByNameQuery, ["myDeck", glob.user_1, 5, "file"]);

        expect(roV(deck).item_name).toEqual("myDeck");
        expect(roV(deck).parent_id).toEqual(5);
        expect(roV(deck).category_id).toBe("8");
        expect(roV(deck).words).toEqual("elevator.png,square.png,natural.png");
    });

    test("Category must exist", async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_33",
                "content": {"words": ["elevator", "square", "natural"]},
                "parent_id": 5,
                "category_id": 3023
            });
        
        fail_with_json(response, 400, "Invalid category");
    });

    test("Category must be in the same directory", async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_33",
                "content": {"words": ["elevator", "square", "natural"]},
                "parent_id": 5,
                "category_id": 30
            });
        
        fail_with_json(response, 400, "Invalid category");
    });

    test("Category id must be null in a regular folder", async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_33",
                "content": {"words": ["elevator", "square", "natural"]},
                "parent_id": 1,
                "category_id": 5
            });
        
        fail_with_json(response, 400, "Invalid directory");
    });

    test("Images must exist", async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_33",
                "content": {"words": ["elevator", "EXISTANCE", "natural"]},
                "parent_id": 5,
                "category_id": 8
            });
        
        fail_with_json(response, 400, "Images not found: EXISTANCE.");
    });

    test("Body values must be present and valid", async () => {
        await test_utils.check_type_blank({
            "deckName": "deck_15521",
            "content": {"words": ["elevator", "square", "natural"]},
            "parent_id": 5,
            "category_id": 8
        }, createDeckUrl, 'post', app, db);

        // Values of words is not an array
        const wordsResponse = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_521",
                "content": {"words": 'yes'},
                "parent_id": 5,
                "category_id": 8
        });

        fail_with_json(wordsResponse, 400, "Type mismatch");

        // All words cannot be blank
        const spaceWords = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_141",
                "content": {"words": ["    ", "		", "     "]},
                "parent_id": 5,
                "category_id": 8
        });

        fail_with_json(spaceWords, 400, "Blank value");

        // All words cannot be blank
        const extraContent = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_141",
                "content": {"words": ["square", "elevator"], 'extra': 'value'},
                "parent_id": 5,
                "category_id": 8
        });

        fail_with_json(extraContent, 400, "Missing or extra body");
    });
})


describe('Create a folder', () => {
    const createFolderUrl = `/create_folder/${glob.user_1}`;

    test('Create valid regular folder', async () => {
        const response = await request(app(db))
            .post(createFolderUrl)
            .send({
                "folder_name": "myFolder",
                "parent_id": 1,
                "folder_type": "regular_folder"
            });
        
        expect(response.status).toEqual(200);

        const folder = await db.query(itemByNameQuery, ["myFolder", glob.user_1, 1, "folder"]);

        expect(roV(folder).item_name).toEqual("myFolder");
        expect(roV(folder).item_type).toEqual("folder");
        expect(roV(folder).item_order).toEqual("6");
        expect(roV(folder).category_id).toBe(null);
    });

    test('Create valid thematic folder', async () => {
        const response = await request(app(db))
            .post(createFolderUrl)
            .send({
                "folder_name": "myFolder",
                "parent_id": 1,
                "folder_type": "thematic_folder"
            });
        
        expect(response.status).toEqual(200);

        const folder = await db.query(itemByNameQuery, ["myFolder", glob.user_1, 1, "thematic_folder"]);

        expect(roV(folder).item_name).toEqual("myFolder");
        expect(roV(folder).item_type).toEqual("thematic_folder");
        expect(roV(folder).item_order).toEqual("6");
        expect(roV(folder).category_id).toBe(null);
    });

    test('Fail on duplicate folder', async () => {
        const response = await request(app(db))
            .post(createFolderUrl)
            .send({
                "folder_name": "folder_2",
                "parent_id": 1,
                "folder_type": "regular_folder"
            });
        
        fail_with_json(response, 400, "Folder 'folder_2' already exists.");
    });

    test('Create regular folder with the same name as thematic folder', async () => {
        const response = await request(app(db))
            .post(createFolderUrl)
            .send({
                "folder_name": "folder_2",
                "parent_id": 1,
                "folder_type": "thematic_folder"
            });
        
        expect(response.status).toEqual(200);

        const folder = await db.query(itemByNameQuery, ["folder_2", glob.user_1, 1, "thematic_folder"]);

        expect(roV(folder).item_name).toEqual("folder_2");
        expect(roV(folder).item_type).toEqual("thematic_folder");
        expect(roV(folder).item_order).toEqual("6");
        expect(roV(folder).category_id).toBe(null);
    });

    test('Folder type must be either regular or thematic', async () => {
        const response = await request(app(db))
            .post(createFolderUrl)
            .send({
                "folder_name": "folder_2",
                "parent_id": 1,
                "folder_type": "folder"
            });
        
        fail_with_json(response);
    });

    test('Folder name cannot contain forbidden characters', async () => {
        const response = await request(app(db))
            .post(createFolderUrl)
            .send({
                "folder_name": "ye<s",
                "parent_id": 1,
                "folder_type": "regular_folder"
            });
        
        fail_with_json(response, 400, 'Forbidden character');
    });

    test('Directory must be owned by the same user and not thematic', async () => {
        // Some other user's directory
        const invalidUser = await request(app(db))
            .post(createFolderUrl)
            .send({
                "folder_name": "yes",
                "parent_id": 2,
                "folder_type": "regular_folder"
            });
        
        fail_with_json(invalidUser, 400, "Invalid directory");

        // Cannot add a folder in a thematic folder
        const invalidType = await request(app(db))
            .post(createFolderUrl)
            .send({
                "folder_name": "yes",
                "parent_id": 5,
                "folder_type": "regular_folder"
            });
        
        fail_with_json(invalidType, 400, "Invalid directory");
    });

    test("Body values must be present and valid", async () => {
        await test_utils.check_type_blank({
            "folder_name": "folder_1252",
            "parent_id": 1,
            "folder_type": "regular_folder"
        }, createFolderUrl, 'post', app, db);
    }); 
})


describe('Create a category', () => {
    const createCategoryUrl = `/create_category/${glob.user_1}`;

    test('Create valid category', async () => {
        const response = await request(app(db))
            .post(createCategoryUrl)
            .send({
                "category_name": "my_category",
                "parent_id": 6,
                "content": {"color": "#AA7854"}
            });
        
        expect(response.status).toEqual(200);

        const category = await db.query(itemByNameQuery, ["my_category", glob.user_1, 6, "category"]);

        expect(roV(category).item_name).toEqual("my_category");
        expect(roV(category).item_type).toEqual("category");
        expect(roV(category).item_order).toEqual("3");
        expect(roV(category).color).toBe('#AA7854');
        expect(roV(category).category_id).toBe(null);
    });

    test('Fail on duplicate values', async () => {
        const response = await request(app(db))
            .post(createCategoryUrl)
            .send({
                "category_name": "category_3",
                "parent_id": 6,
                "content": {"color": "#AA7854"}
            });
        
        fail_with_json(response, 400, "Category 'category_3' already exists.");
    });

    test('Cannot be outside a thematic folder', async () => {
        // Root folder
        const rootResponse = await request(app(db))
            .post(createCategoryUrl)
            .send({
                "category_name": "my_category",
                "parent_id": 1,
                "content": {"color": "#AA7854"}
            });
        
        fail_with_json(rootResponse, 400, "Invalid directory");

        // Regular folder
        const folderResponse = await request(app(db))
            .post(createCategoryUrl)
            .send({
                "category_name": "my_category",
                "parent_id": 4,
                "content": {"color": "#AA7854"}
            });
        
        fail_with_json(folderResponse, 400, "Invalid directory");
    });

    test('Category must belong to the same user', async () => {
        const response = await request(app(db))
            .post(createCategoryUrl)
            .send({
                "category_name": "my_category",
                "parent_id": 30,
                "content": {"color": "#AA7854"}
            });
        
        fail_with_json(response, 400, "Invalid directory");
    });

    test('Color value must be a valid hexidecimal', async () => {
        const response = await request(app(db))
            .post(createCategoryUrl)
            .send({
                "category_name": "my_category_223",
                "parent_id": 6,
                "content": {"color": "#AA754"}
            }, createCategoryUrl, app, db);
        
        fail_with_json(response, 400, "Invalid input");
    });

    test("Body values must be present and valid", async () => {
        await test_utils.check_type_blank({
            "category_name": "my_category_2323",
            "parent_id": 6,
            "content": {"color": "#AA7854"}
        }, createCategoryUrl, 'post', app, db);

        // Extra key in content
        const extraVal = await request(app(db))
            .post(createCategoryUrl)
            .send({
                "category_name": "my_category_22523",
                "parent_id": 6,
                "content": {"color": "#AAA754", 'unrelated': 'value'}
        }, createCategoryUrl, app, db);
        
        fail_with_json(extraVal, 400, "Missing or extra body");
    });
});

describe('Delete', () => {
    const deleteUrl = `/delete_item/${glob.user_1}`;
    test('A file', async () => {
        const response = await request(app(db))
            .delete(deleteUrl)
            .send({
                "item_id": 27
            });
        
        expect(response.status).toEqual(200);
        expect(await getItemInfo(db, 27)).toBe(false);
    });

    test('A folder and all subdirectories', async () => {
        const response = await request(app(db))
            .delete(deleteUrl)
            .send({
                "item_id": 24
            });
        
        expect(response.status).toEqual(200);
        expect(await getItemInfo(db, 24)).toBe(false);
        expect(await getItemInfo(db, 25)).toBe(false);
        expect(await getItemInfo(db, 26)).toBe(false);
    });

    test('A thematic folder and all items', async () => {
        const response = await request(app(db))
            .delete(deleteUrl)
            .send({
                "item_id": 5
            });
        
        expect(response.status).toEqual(200);
        expect(await getItemInfo(db, 5)).toBe(false);
        // Delete categories
        expect(await getItemInfo(db, 8)).toBe(false);
        expect(await getItemInfo(db, 9)).toBe(false);
        // Delete category items
        expect(await getItemInfo(db, 12)).toBe(false);
        expect(await getItemInfo(db, 15)).toBe(false);
    });

    test('Category and all of its items', async () => {
        const response = await request(app(db))
            .delete(deleteUrl)
            .send({
                "item_id": 11
            });
        
        expect(response.status).toEqual(200);
        expect(await getItemInfo(db, 11)).toBe(false);
        expect(await getItemInfo(db, 18)).toBe(false);
        expect(await getItemInfo(db, 20)).toBe(false);
    });

    test('Must not delete a root folder', async () => {
        const response = await request(app(db))
            .delete(deleteUrl)
            .send({
                "item_id": 1
            });
        
        expect(fail_with_json(response, 400, "Cannot delete root folder"));
    });

    test('Deleted item must belong to the user in param', async () => {
        const response = await request(app(db))
            .delete(deleteUrl)
            .send({
                "item_id": 29
            });
        
        expect(fail_with_json(response));
    });

    test('Deleted item must exist', async () => {
        const response = await request(app(db))
            .delete(deleteUrl)
            .send({
                "item_id": 29353
            });
        
        expect(fail_with_json(response, 400, "Item does not exist anymore..."));
    });
    

    test("Body values must be present and valid", async () => {
        await test_utils.check_type_blank({
            "item_id": 7
        }, deleteUrl, 'delete', app, db);
    });
})

