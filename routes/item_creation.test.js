const app = require('../app');
const request = require('supertest');

const db = require('../database/test_database');
const {roV } = require('../database/db_functions/common/functions');
const setup = require('../database/setup');
const { glob } = require('../database/build_database');

const { get_item_info } = require('../database/db_functions/item_functions');
const test_utils = require('../test/test_functions');
const { fail_with_json } = require('../test/test_functions');


setup.setup_before_and_after(db);


const itemByNameQuery = `
    SELECT * FROM items
        LEFT JOIN deck_content ON items.item_id = deck_content.deck_key
        LEFT JOIN category_content ON items.item_id = category_content.category_key
        LEFT JOIN words ON deck_content.deck_key = words.deck_id
        LEFT JOIN word_content ON words.media_id = word_content_id
        LEFT JOIN artists ON word_content.artist_content_id = artists.artist_id
        LEFT JOIN artist_references ON artists.artist_id = artist_references.referred_id
        LEFT JOIN translations ON word_content.word_content_id = translations.translation_id
        LEFT JOIN translation_approval ON translations.translation_id = translation_approval.approval_id
        LEFT JOIN sound_paths ON word_content.word_content_id = sound_paths.sound_id
        LEFT JOIN sound_approval ON sound_paths.sound_id = sound_approval.approval_id    
    WHERE item_name = $1 AND parent_id = $2 AND item_type = $3;`


describe('Create a deck', () => {
    const createDeckUrl = `/create_deck/${glob.user_1}`;

    test('Create valid deck', async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "myDeck",
                "wordArray": ["elevator", "square", "palace"],
                "parent_id": "1",
                "target_language": "english",
                "source_language": "turkish",
                "category_id": null
            });
        
        expect(response.status).toEqual(200);

        const deck = await db.query(itemByNameQuery, ["myDeck", 1, "deck"]);

        expect(roV(deck).item_name).toEqual("myDeck");
        expect(roV(deck).item_order).toEqual("6");
        expect(roV(deck).category_id).toBe(null);
        expect(roV(deck).english_translation_approval).toBe(false);
        expect(roV(deck).turkish_sound_approval).toBe(false);
        expect(roV(deck).artist_name).toEqual("Van Gogh");
        expect(roV(deck).reference_link).toEqual("van_gogh.com");
        expect(roV(deck, 0).english).toEqual("square");
        expect(roV(deck, 0).image_path).toEqual("square.png");
        expect(roV(deck, 1).english_sound_path).toEqual("palace.mp3");
        expect(roV(deck, 1).english_sound_path).toEqual("palace.mp3");
        expect(roV(deck, 2).turkish).toEqual("asansör");
    });

    test('Fail on duplicate deck', async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_1",
                "wordArray": ["elevator", "square", "palace"],
                "parent_id": "1",
                "target_language": "english",
                "source_language": "turkish",
                "category_id": null
            });
        
        fail_with_json(response, 400, "Deck 'deck_1' already exists.");
    });


    test("Should work even there are other types of files with the same name", async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "folder_1",
                "wordArray": ["elevator", "square", "palace"],
                "parent_id": "1",
                "target_language": "english",
                "source_language": "turkish",
                "category_id": null
            });
        
        expect(response.status).toEqual(200);
    });


    test('Deck name and words should not include forbidden characters', async () => {
        const deckResponse = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck<33",
                "wordArray": ["elevator", "square", "palace"],
                "parent_id": "1",
                "target_language": "english",
                "source_language": "turkish",
                "category_id": null
            });
        
        fail_with_json(deckResponse, 400, "Forbidden character");

        const wordResponse = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_33",
                "wordArray": ["ele,vator", "squa<re", "palace"],
                "parent_id": "1",
                "target_language": "english",
                "source_language": "turkish",
                "category_id": null
            });
        
        fail_with_json(wordResponse, 400, "Forbidden character");
    });


    test('Parent must exist', async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_33",
                "wordArray": ["elevator", "square", "palace"],
                "parent_id": "3463",
                "target_language": "english",
                "source_language": "turkish",
                "category_id": null
            });
        
        fail_with_json(response, 400, "Invalid directory");
    });


    test("Directory must be owned by the same user", async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_33",
                "wordArray": ["elevator", "square", "palace"],
                "parent_id": "2",
                "target_language": "english",
                "source_language": "turkish",
                "category_id": null
            });
        
        fail_with_json(response, 400, "Invalid directory");
    });


    test('Should work with a valid input in category', async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "myDeck",
                "wordArray": ["elevator", "square", "palace"],
                "parent_id": "5",
                "target_language": "english",
                "source_language": "turkish",
                "category_id": "8"
            });
        
        expect(response.status).toEqual(200);

        const deck = await db.query(itemByNameQuery, ["myDeck", "5", "deck"]);

        expect(roV(deck).item_name).toEqual("myDeck");
        expect(roV(deck).parent_id).toEqual("5");
        expect(roV(deck).category_id).toEqual("8");
        expect(roV(deck, 0).english).toEqual("square");
        expect(roV(deck, 1).english_sound_path).toEqual("palace.mp3");
    });


    test('Languages must be valid', async () => {
        const orkResponse = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_15122",
                "wordArray": ["elevator", "square", "palace"],
                "parent_id": "1",
                "target_language": "orkish",
                "source_language": "english",
                "category_id": null
            });
        
        fail_with_json(orkResponse, 400, "Invalid language");

        const equalResponse = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_15122",
                "wordArray": ["elevator", "square", "palace"],
                "parent_id": "1",
                "target_language": "english",
                "source_language": "english",
                "category_id": null
            });
        
        fail_with_json(equalResponse, 400, "Invalid language");
    });

    test("Deck in a category must have category's language", async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "weird_deck",
                "wordArray": ["asansör", "meydan", "saray"],
                "parent_id": "5",
                "target_language": "turkish",
                "source_language": "english",
                "category_id": "8"
            });
        
        fail_with_json(response, 400, "Invalid category");
    });

    test("Category must exist", async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_33",
                "wordArray": ["elevator", "square", "palace"],
                "parent_id": "5",
                "target_language": "english",
                "source_language": "turkish",
                "category_id": "3023"
            });
        
        fail_with_json(response, 400, "Invalid category");
    });


    test("Category must be in the same directory", async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_33",
                "wordArray": ["elevator", "square", "palace"],
                "parent_id": "5",
                "target_language": "english",
                "source_language": "turkish",
                "category_id": "30"
            });
        
        fail_with_json(response, 400, "Invalid category");
    });


    test("Category id must be null in a regular folder", async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_33",
                "wordArray": ["elevator", "square", "palace"],
                "parent_id": "1",
                "target_language": "english",
                "source_language": "turkish",
                "category_id": "5"
            });
        
        fail_with_json(response, 400, "Invalid directory");
    });


    test("Images must exist", async () => {
        const response = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_33",
                "wordArray": ["elevator", "EXISTANCE", "palace"],
                "parent_id": "5",
                "target_language": "english",
                "source_language": "turkish",
                "category_id": "8"
            });
        
        fail_with_json(response, 400, "Some files could not be found");
    });


    test("Body values must be present and valid", async () => {
        await test_utils.check_type_blank({
            "deckName": "deck_15521",
            "wordArray": ["elevator", "square", "palace"],
            "parent_id": "5",
            "target_language": "english",
            "source_language": "turkish",
            "category_id": "8"
        }, createDeckUrl, 'post', app, db);

        // Values of words is not an array
        const wordsResponse = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_521",
                "wordArray": 'elevator',
                "parent_id": "5",
                "target_language": "english",
                "source_language": "turkish",
                "category_id": "8"
        });

        fail_with_json(wordsResponse, 400, "Type mismatch");

        // All words cannot be blank
        const spaceWords = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_141",
                "wordArray": ["    ", "		", "     "],
                "parent_id": "5",
                "target_language": "english",
                "source_language": "turkish",
                "category_id": "8"
        });

        fail_with_json(spaceWords, 400, "Blank value");

        // All words cannot be blank
        const extraContent = await request(app(db))
            .post(createDeckUrl)
            .send({
                "deckName": "deck_141",
                "wordArray": ["square", "elevator"], 'extra': 'value',
                "parent_id": "5",
                "target_language": "english",
                "source_language": "turkish",
                "category_id": "8"
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
                "parent_id": "1",
                "folder_type": "folder"
            });
        
        expect(response.status).toEqual(200);

        const folder = await db.query(itemByNameQuery, ["myFolder", 1, "folder"]);
        
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
                "parent_id": "1",
                "folder_type": "thematic_folder"
            });
        
        expect(response.status).toEqual(200);

        const folder = await db.query(itemByNameQuery, ["myFolder", 1, "thematic_folder"]);

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
                "parent_id": "1",
                "folder_type": "folder"
            });
        
        fail_with_json(response, 400, "Folder 'folder_2' already exists.");
    });

    test('Create regular folder with the same name as thematic folder', async () => {
        const response = await request(app(db))
            .post(createFolderUrl)
            .send({
                "folder_name": "folder_2",
                "parent_id": "1",
                "folder_type": "thematic_folder"
            });
        
        expect(response.status).toEqual(200);

        const folder = await db.query(itemByNameQuery, ["folder_2", 1, "thematic_folder"]);

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
                "parent_id": "1",
                "folder_type": "weird_folder"
            });
        
        fail_with_json(response);
    });

    test('Folder name cannot contain forbidden characters', async () => {
        const response = await request(app(db))
            .post(createFolderUrl)
            .send({
                "folder_name": "ye<s",
                "parent_id": "1",
                "folder_type": "folder"
            });
        
        fail_with_json(response, 400, 'Forbidden character');
    });

    test('Directory must be owned by the same user and not thematic', async () => {
        // Some other user's directory
        const invalidUser = await request(app(db))
            .post(createFolderUrl)
            .send({
                "folder_name": "yes",
                "parent_id": "2",
                "folder_type": "folder"
            });
        
        fail_with_json(invalidUser, 400, "Invalid directory");

        // Cannot add a folder in a thematic folder
        const invalidType = await request(app(db))
            .post(createFolderUrl)
            .send({
                "folder_name": "yes",
                "parent_id": "5",
                "folder_type": "folder"
            });
        
        fail_with_json(invalidType, 400, "Invalid directory");
    });

    test("Body values must be present and valid", async () => {
        await test_utils.check_type_blank({
            "folder_name": "folder_1252",
            "parent_id": "1",
            "folder_type": "folder"
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
                "parent_id": "6",
                "color": "#AA7854",
                "target_language": "english",
                "source_language": "german"
            });
        
        expect(response.status).toEqual(200);

        const category = await db.query(itemByNameQuery, ["my_category", 6, "category"]);

        expect(roV(category).item_name).toEqual("my_category");
        expect(roV(category).item_type).toEqual("category");
        expect(roV(category).item_order).toEqual("3");
        expect(roV(category).category_target_language).toEqual("english");
        expect(roV(category).color).toBe('#AA7854');
        expect(roV(category).category_id).toBe(null);
    });


    test('Fail on duplicate values', async () => {
        const response = await request(app(db))
            .post(createCategoryUrl)
            .send({
                "category_name": "category_3",
                "parent_id": "6",
                "color": "#AA7854",
                "target_language": "english",
                "source_language": "german"
            });
        
        fail_with_json(response, 400, "Category 'category_3' already exists.");
    });

    test('Cannot be outside a thematic folder', async () => {
        // Root folder
        const rootResponse = await request(app(db))
            .post(createCategoryUrl)
            .send({
                "category_name": "my_category",
                "parent_id": "1",
                "color": "#AA7854",
                "target_language": "english",
                "source_language": "german"
            });
        
        fail_with_json(rootResponse, 400, "Invalid directory");

        // Regular folder
        const folderResponse = await request(app(db))
            .post(createCategoryUrl)
            .send({
                "category_name": "my_category",
                "parent_id": "4",
                "color": "#AA7854",
                "target_language": "english",
                "source_language": "german"
            });
        
        fail_with_json(folderResponse, 400, "Invalid directory");
    });

    test('Category must belong to the same user', async () => {
        const response = await request(app(db))
            .post(createCategoryUrl)
            .send({
                "category_name": "my_category",
                "parent_id": "30",
                "color": "#AA7854",
                "target_language": "english",
                "source_language": "german"
            });
        
        fail_with_json(response, 400, "Invalid directory");
    });

    test('Color value must be a valid hexidecimal', async () => {
        const response = await request(app(db))
            .post(createCategoryUrl)
            .send({
                "category_name": "my_category_223",
                "parent_id": "6",
                "color": "#AA754",
                "target_language": "english",
                "source_language": "german"                
            }, createCategoryUrl, app, db);
        
        fail_with_json(response, 400, "Invalid input");
    });

    test('Languages must be valid', async () => {
        const urukResponse = await request(app(db))
            .post(createCategoryUrl)
            .send({
                "category_name": "my_category",
                "parent_id": "6",
                "color": "#AA7854",
                "target_language": "english",
                "source_language": "uruk-haish"
            });
        
        fail_with_json(urukResponse, 400, "Invalid language");

        const equalResponse = await request(app(db))
            .post(createCategoryUrl)
            .send({
                "category_name": "my_category",
                "parent_id": "6",
                "color": "#AA7854",
                "target_language": "english",
                "source_language": "english"
            });
        
        fail_with_json(equalResponse, 400, "Invalid language");
    });

    test("Body values must be present and valid", async () => {
        await test_utils.check_type_blank({
            "category_name": "my_category_2323",
            "parent_id": "6",
            "color": "#AA7854",
            "target_language": "english",
            "source_language": "german"
        }, createCategoryUrl, 'post', app, db);
    });
});

describe('Delete', () => {

    const deleteUrl = `/delete_item/${glob.user_1}`;
    test('A deck', async () => {
        const response = await request(app(db))
            .delete(deleteUrl)
            .send({
                "item_id": "27"
            });
        
        expect(response.status).toEqual(200);
        expect(await get_item_info(db, "27")).toBe(false);
    });

    test('A folder and all subdirectories', async () => {
        const response = await request(app(db))
            .delete(deleteUrl)
            .send({
                "item_id": "24"
            });
        
        expect(response.status).toEqual(200);
        expect(await get_item_info(db, "24")).toBe(false);
        expect(await get_item_info(db, "25")).toBe(false);
        expect(await get_item_info(db, "26")).toBe(false);
    });

    test('A thematic folder and all items', async () => {
        const response = await request(app(db))
            .delete(deleteUrl)
            .send({
                "item_id": "5"
            });
        
        expect(response.status).toEqual(200);
        expect(await get_item_info(db, "5")).toBe(false);
        // Delete categories
        expect(await get_item_info(db, "8")).toBe(false);
        expect(await get_item_info(db, "9")).toBe(false);
        // Delete category items
        expect(await get_item_info(db, "12")).toBe(false);
        expect(await get_item_info(db, "15")).toBe(false);
    });

    test('Category and all of its items', async () => {
        const response = await request(app(db))
            .delete(deleteUrl)
            .send({
                "item_id": "11"
            });
        
        expect(response.status).toEqual(200);
        expect(await get_item_info(db, "11")).toBe(false);
        expect(await get_item_info(db, "18")).toBe(false);
        expect(await get_item_info(db, "20")).toBe(false);
    });

    test('Must not delete a root folder', async () => {
        const response = await request(app(db))
            .delete(deleteUrl)
            .send({
                "item_id": "1"
            });
        
        expect(fail_with_json(response, 400, "Cannot delete root folder"));
    });

    test('Deleted item must belong to the user in param', async () => {
        const response = await request(app(db))
            .delete(deleteUrl)
            .send({
                "item_id": "29"
            });
        
        expect(fail_with_json(response));
    });

    test('Deleted item must exist', async () => {
        const response = await request(app(db))
            .delete(deleteUrl)
            .send({
                "item_id": "29353"
            });
        
        expect(fail_with_json(response, 400, "Item does not exist anymore..."));
    });
    

    test("Body values must be present and valid", async () => {
        await test_utils.check_type_blank({
            "item_id": "7"
        }, deleteUrl, 'delete', app, db);
    });
})

