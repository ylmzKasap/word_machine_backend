const app = require('../app');
const request = require('supertest');

const db = require('../database/test_database');
const setup = require('../database/setup');
const { glob } = require('../database/build_database');

const test_utils = require('../test/test_functions');
const { get_item_info, get_deck_info } = require('../database/db_functions/item_functions');
const { fail_with_json, numbers_in_order, group_objects } = require('../test/test_functions');
const { get_directory } = require('../database/db_functions/directory');
const { get_item } = require('../database/db_functions/common/functions');


setup.setup_before_and_after(db);
const pasteUrl = `/paste/${glob.user_1}`;


describe('Copy', () => {
    describe('A deck', () => {
        test('To a folder', async () => {
            const itemInfo = await get_item_info(db, "7");
    
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "7",
                new_parent: "3",
                category_id: null,
                action: 'copy'
            }); 
    
            expect(response.status).toEqual(200);
    
            const copiedDeck = await get_item(db, itemInfo.item_name, 'deck', 3);
            const copiedDeckInfo = await get_deck_info(db, 7);

            expect(copiedDeck.item_id).toEqual("39");
            expect(copiedDeck.parent_id).toEqual("3");
            expect(copiedDeck.category_id).toBeNull();
            expect(copiedDeckInfo.target_language).toEqual('english');
            expect(copiedDeckInfo.source_language).toEqual('turkish');
            expect(copiedDeckInfo.words[0].english).toEqual('square');
            expect(copiedDeckInfo.words[1].turkish).toEqual('saray');
            expect(copiedDeckInfo.words[2].artist_id).toEqual('4');
    
            const prevItem = await get_item(db, itemInfo.item_name, 'deck', 1);
            expect(prevItem).not.toBeNull();
        });

        test('To a thematic folder', async () => {
            const itemInfo = await get_item_info(db, 27);
    
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "27",
                new_parent: "5",
                category_id: "9",
                action: "copy"
            }); 
    
            expect(response.status).toEqual(200);
    
            const copiedDeck = await get_item(db, itemInfo.item_name, 'deck', 5);
            expect(copiedDeck.item_id).toEqual("39");
            expect(copiedDeck.parent_id).toEqual("5");
            expect(copiedDeck.category_id).toEqual("9");
        });

        test('Outside of a thematic folder', async () => {
            const itemInfo = await get_item_info(db, 19);
    
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "19",
                new_parent: "1",
                category_id: null,
                action: "copy"
            }); 
    
            expect(response.status).toEqual(200);
    
            const copiedItem = await get_item(db, itemInfo.item_name, "deck", 1);
            expect(copiedItem.item_id).toEqual("39");
            expect(copiedItem.parent_id).toEqual("1");
            expect(copiedItem.category_id).toBeNull();
        });

        test('Fail on duplicate files', async () => {
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "12",
                new_parent: "1",
                category_id: null,
                action: 'copy'
            }); 
    
            fail_with_json(response, 400, "Deck 'deck_1' already exists in the directory.");
        });

        test('Should not copy anything except a file', async () => {
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "8",
                new_parent: "23",
                category_id: null,
                action: 'copy'
            }); 
    
            fail_with_json(response, 400, "Can only copy a deck.");
        });
    });
});

describe('Cut', () => {
    describe('A file', () => {
        test("Into a folder", async () =>{
            const itemInfo = await get_item_info(db, 7);
        
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "7",
                new_parent: "3",
                category_id: null,
                action: "cut"
            }); 
    
            expect(response.status).toEqual(200);
    
            const cutItem = await get_item_info(db, "7")
            expect(cutItem.parent_id).toEqual("3");
            expect(cutItem.category_id).toBeNull();
    
            const prevItem = await get_item(
                db, itemInfo.item_name, 'deck', itemInfo.parent_id);
            expect(prevItem).toBeNull();
        });

        test("Into a thematic folder", async () =>{
            const itemInfo = await get_item_info(db, 27);
        
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "27",
                new_parent: "5",
                category_id: "8",
                action: 'cut'
            }); 
    
            expect(response.status).toEqual(200);
    
            const cutItem = await get_item_info(db, "27")
            expect(cutItem.parent_id).toEqual("5");
            expect(cutItem.category_id).toEqual("8");
            expect(cutItem.item_order).toEqual("3");
    
            const prevItem = await get_item(
                db, itemInfo.item_name, 'file', itemInfo.parent_id);
            expect(prevItem).toBeNull();

            const newDirectory = await get_directory(db, glob.user_1, 5);
            // All items in categories are ordered.
            const groupedDir = group_objects(newDirectory[0], 'category_id');
            for (let group in groupedDir) {
                let itemOrders = groupedDir[group].map(x => x.item_order);
                expect(numbers_in_order(itemOrders)).toBe(true);
            }
        });

        test("Out of a thematic folder", async () => {
            const itemInfo = await get_item_info(db, 19);
        
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "19",
                new_parent: "4",
                category_id: null,
                action: 'cut'
            }); 
    
            expect(response.status).toEqual(200);
    
            const cutItem = await get_item_info(db, "19");
            expect(cutItem.parent_id).toEqual("4");
            expect(cutItem.category_id).toBeNull();
            expect(cutItem.item_order).toEqual("4");
    
            const prevItem = await get_item(
                db, itemInfo.item_name, 'file', itemInfo.parent_id);
            expect(prevItem).toBeNull();

            const oldDirectory = await get_directory(
                db, glob.user_1, itemInfo.parent_id);
            // All items in categories are ordered.
            const groupedDir = group_objects(oldDirectory[0], 'category_id');
            for (let group in groupedDir) {
                let itemOrders = groupedDir[group].map(x => x.item_order);
                expect(numbers_in_order(itemOrders)).toBe(true);
            }
        });
  
        test('Within a thematic folder', async () => {
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "14",
                new_parent: "5",
                category_id: "8",
                action: 'cut'
            });

            expect(response.status).toEqual(200);

            const cutItem = await get_item_info(db, "14");
            expect(cutItem.parent_id).toEqual("5");
            expect(cutItem.category_id).toEqual("8");
            expect(cutItem.item_order).toEqual("3");

            const directory = await get_directory(db, glob.user_1, 5);
            // All items in categories are ordered.
            const groupedDir = group_objects(directory[0], 'category_id');
            for (let group in groupedDir) {
                let itemOrders = groupedDir[group].map(x => x.item_order);
                expect(numbers_in_order(itemOrders)).toBe(true);
            }    
        });

        test('Fail on duplicate items', async () => {
            const regularResponse = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "7",
                new_parent: "4",
                category_id: null,
                action: 'cut'
            }); 
    
            fail_with_json(regularResponse, 400, "Deck 'deck_1' already exists in the directory.");

            const categoryResponse = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "21",
                new_parent: "5",
                category_id: "9",
                action: 'cut'
            });
    
            fail_with_json(categoryResponse, 400, "Deck 'deck_1' already exists in the directory.");
        });

        test('Fail on language mismatch', async () => {
            const regularResponse = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "19",
                new_parent: "6",
                category_id: "10",
                action: 'cut'
            }); 
    
            fail_with_json(regularResponse, 400, "Category target language is different.");
        });
    });

    describe('A folder', () => {
        test('Into another folder', async () => {
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "3",
                new_parent: "4",
                category_id: null,
                action: "cut"
            });

            const itemInfo = await get_item_info(db, "3");
            expect(response.status).toEqual(200);
            expect(itemInfo.parent_id).toEqual("4");
        });

        test('Should not paste a folder into one of its subdirectories', async () => {
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "3",
                new_parent: "24",
                category_id: null,
                action: 'cut'
            });

            fail_with_json(response, 400, "This directory is a subdirectory of 'folder_1'.");
        });

        test('Should not paste a folder into itself', async () => {
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "3",
                new_parent: "3",
                category_id: null,
                action: 'cut'
            });

            fail_with_json(response, 400, "This directory is a subdirectory of 'folder_1'.");
        });

        test('Should not paste a folder into a thematic folder', async () => {
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "3",
                new_parent: "5",
                category_id: "8",
                action: "cut"
            });

            fail_with_json(response, 400, "Invalid directory");
        });

        test('Should not move a root folder', async () => {
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "1",
                new_parent: "3",
                category_id: null,
                action: 'cut'
            });

            fail_with_json(response);
        });
    });

    describe('A category', () => {
        test('Into another thematic folder', async () => {
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "8",
                new_parent: "23",
                category_id: null,
                action: 'cut'
            });

            expect(response.status).toEqual(200);

            const category = await get_item_info(db, "8");
            expect(category.parent_id).toEqual("23");
            expect(category.item_order).toEqual("1");
            
            const categoryItems = await get_directory(db, glob.user_1, "23");
            expect(categoryItems[0].length).toEqual(3);

            const response_2 = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "9",
                new_parent: "6",
                category_id: null,
                action: 'cut'
            });

            expect(response_2.status).toEqual(200);

            const category_2 = await get_item_info(db, "9");
            expect(category_2.parent_id).toEqual("6");
            expect(category_2.item_order).toEqual("3");
            
            const categoryItems_2 = await get_directory(db, glob.user_1, "6");
            expect(categoryItems_2[0].length).toEqual(10);
        });

        test('Should move an empty category', async () => {
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "38",
                new_parent: "5",
                category_id: null,
                action: 'cut'
            });

            expect(response.status).toEqual(200);
            const category = await get_item_info(db, "38");
            expect(category.parent_id).toEqual("5");
        });

        test('Should not move a category out of a thematic folder', async () => {
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "9",
                new_parent: "3",
                category_id: null,
                action: 'cut'
            });

            fail_with_json(response, 400, "Invalid directory");
        });

        test('Categories should not have a category_id', async () => {
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "9",
                new_parent: "6",
                category_id: "11",
                action: 'cut'
            });

            fail_with_json(response, 400, "Invalid category");
        });

        test('Fail on duplicate category names', async () => {
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "10",
                new_parent: "5",
                category_id: null,
                action: 'cut'
            });

            fail_with_json(response, 400, "Category 'category_1' already exists in the directory.");
        });

        test('Fail on duplicate category items', async () => {
            const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "11",
                new_parent: "5",
                category_id: null,
                action: 'cut'
            });

            fail_with_json(response, 400,  "Paste failed: There are items with the same name");
        });
    })
});


describe('Destination', () => {
    test('Must be valid folder', async () => {
        const response = await request(app(db))
        .put(pasteUrl)
        .send({
            item_id: "27",
            new_parent: "7",
            category_id: null,
            action: 'copy'
        }); 

        fail_with_json(response, 400, "Invalid directory");
    });

    test('Must belong to the same user', async () => {
        const response = await request(app(db))
        .put(pasteUrl)
        .send({
            item_id: "27",
            new_parent: "28",
            category_id: null,
            action: 'cut'
        }); 

        fail_with_json(response, 400, "Invalid directory");
    });

    test('Category id must be null in a regular folder', async () => {
        const response = await request(app(db))
        .put(pasteUrl)
        .send({
            item_id: "7",
            new_parent: "3",
            category_id: "8",
            action: 'copy'
        }); 

        fail_with_json(response, 400, "Invalid category");
    });

    test('Category id cannot be null in a thematic folder', async () => {
        const response = await request(app(db))
        .put(pasteUrl)
        .send({
            item_id: "27",
            new_parent: "6",
            category_id: null,
            action: 'cut'
        }); 

        fail_with_json(response, 400, "Invalid category");
    });

    test('Category must belong to the same user', async () => {
        const response = await request(app(db))
        .put(pasteUrl)
        .send({
            item_id: "27",
            new_parent: "5",
            category_id: "31",
            action: 'copy'
        }); 

        fail_with_json(response, 400, "Invalid category");
    });

    test('Category must be in the same directory', async () => {
        const response = await request(app(db))
        .put(pasteUrl)
        .send({
            item_id: "19",
            new_parent: "26",
            category_id: "8",
            action: 'cut'
        }); 

        fail_with_json(response, 400, "Invalid category");
    });

    test("Handle the same directory", async () => {
        const dirResponse = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "21",
                new_parent: "4",
                category_id: null,
                action: 'cut'
            });

            fail_with_json(dirResponse, 200, "No change needed");

            const categoryResponse = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "18",
                new_parent: "6",
                category_id: "11",
                action: 'cut'
            });

            fail_with_json(categoryResponse, 200, "No change needed");
    });

    test("Body values must be present and valid", async () => {
        await test_utils.check_type_blank({
            item_id: "7",
            new_parent: "3",
            category_id: null,
            action: 'copy'
        }, pasteUrl, 'put', app, db);
    });
});

describe('Action', () => {
    test("Should be 'copy' or 'cut'", async () => {
        const response = await request(app(db))
            .put(pasteUrl)
            .send({
                item_id: "7",
                new_parent: "3",
                category_id: null,
                action: 'krangle'
            }); 
        
        fail_with_json(response);
    });
})