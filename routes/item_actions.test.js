const app = require('../app');
const request = require('supertest');

const db = require('../database/test_database');
const setup = require('../database/setup');
const { glob } = require('../database/build_database');

const test_utils = require('../test/test_functions');
const { get_item_info } = require('../database/db_functions/item_functions');
const { fail_with_json, numbers_in_order, group_objects } = require('../test/test_functions');
const { get_directory } = require('../database/db_functions/directory');


setup.setup_before_and_after(db);

describe('Change item directory', () => {
    const updateUrl = `/updatedir/${glob.user_1}`;

    test('To a subfolder', async () => {
        const response = await request(app(db))
        .put(updateUrl)
        .send({
            item_id: "4",
            target_id: "3"
        });

        expect(response.status).toEqual(200);

        // Moved into a correct folder with a correct item order.
        const movedItem = await get_item_info(db, "4");
        expect(movedItem.parent_id).toEqual("3");
        expect(movedItem.item_order).toEqual("2");

        // Following item's order is decremented.
        const followingItem = await get_item_info(db, "5");
        expect(followingItem.item_order).toEqual("2");

        // All old directory items are in order.
        const previousDirectory = await get_directory(db, glob.user_1, "1");
        let oldItemOrders = previousDirectory[0].map(x => x.item_order);
        expect(numbers_in_order(oldItemOrders)).toBe(true);

        // All new directory items are in order.
        const newDirectory = await get_directory(db, glob.user_1, "3");
        let newItemOrders = newDirectory[0].map(x => x.item_order);
        expect(numbers_in_order(newItemOrders)).toBe(true);
    });

    test('To a parent folder', async () => {
        const notYetMovedItem = await get_item_info(db, "19");

        const response = await request(app(db))
        .put(updateUrl)
        .send({
            item_id: "19",
            target_id: null
        });

        expect(response.status).toEqual(200);

        // Moved into a correct folder with a correct item order.
        const movedItem = await get_item_info(db, "19");
        expect(movedItem.parent_id).toEqual("1");
        expect(movedItem.item_order).toEqual("6");
        expect(movedItem.category_id).toBe(null);

        const oldDirectory = await get_directory(db, glob.user_1, notYetMovedItem.parent_id);
        // All items in categories are ordered.
        const groupedDir = group_objects(oldDirectory[0], 'category_id');
        for (let group in groupedDir) {
            let itemOrders = groupedDir[group].map(x => x.item_order);
            expect(numbers_in_order(itemOrders)).toBe(true);
        }
    });

    test('No duplicate items', async () => {
        const parentResponse = await request(app(db))
        .put(updateUrl)
        .send({
            item_id: "18",
            target_id: null
        });

        fail_with_json(parentResponse, 400, "'deck_1' already exists in the parent folder.");

        const targetResponse = await request(app(db))
        .put(updateUrl)
        .send({
            item_id: "7",
            target_id: "4"
        });

        fail_with_json(targetResponse, 400, "'deck_1' already exists in 'folder_2'.");
    });

    test('Should not move a deck into a category with different languages', async () => {
        const response = await request(app(db))
        .put(updateUrl)
        .send({
            item_id: "4",
            target_id: null
        });

        fail_with_json(response, 400, 'Invalid directory');
    });

    test('New directory must belong to the same user', async () => {
        const response = await request(app(db))
        .put(updateUrl)
        .send({
            item_id: "6",
            target_id: "29"
        });

        fail_with_json(response, 400, 'Invalid directory');
    });

    test('Only move into regular or root folder', async () => {
        const response = await request(app(db))
        .put(updateUrl)
        .send({
            item_id: "4",
            target_id: "5"
        });

        fail_with_json(response, 400, 'Invalid directory');
    });

    test('Categories can only be moved to thematic folders', async () => {
        const response = await request(app(db))
        .put(updateUrl)
        .send({
            item_id: "10",
            target_id: "1"
        });

        fail_with_json(response, 400, 'Invalid directory');
    });

    test('Should not move a directory into its subdirectory', async () => {
        const response = await request(app(db))
        .put(updateUrl)
        .send({
            item_id: "3",
            target_id: "25"
        });

        fail_with_json(response, 400, "This directory is a subdirectory of 'folder_1'");
    });

    test('Should not move a directory into itself', async () => {
        const response = await request(app(db))
        .put(updateUrl)
        .send({
            item_id: "3",
            target_id: "3"
        });

        fail_with_json(response, 400, 'Invalid directory');
    });

    test('Should not move a root folder', async () => {
        const response = await request(app(db))
        .put(updateUrl)
        .send({
            item_id: "1",
            target_id: "3"
        });

        fail_with_json(response);
    });

    test("Body values must be present and valid", async () => {
        await test_utils.check_type_blank({
            item_id: "4",
            target_id: "3"
        }, updateUrl, 'put', app, db);
    }); 
});


describe('Set item order', () => {
    const relocateUrl = `/updateorder/${glob.user_1}`;

    test('Before in a regular folder', async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "7",
            category_id: null,
            new_order: "3",
            direction: 'before'
        });

        expect(response.status).toEqual(200);

        // Item relocated.
        const itemInfo = await get_item_info(db, "7");
        expect(itemInfo.item_order).toEqual("3");

        // Directory is in order.
        const newDirectory = await get_directory(db, glob.user_1, itemInfo.parent_id);
        let itemOrders = newDirectory[0].map(x => x.item_order);
        expect(numbers_in_order(itemOrders)).toBe(true);
    });

    test('After in a regular folder', async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "4",
            category_id: null,
            new_order: "5",
            direction: 'after'
        });

        expect(response.status).toEqual(200);

        // Item relocated.
        const itemInfo = await get_item_info(db, "4");
        expect(itemInfo.item_order).toEqual("5");

        // Directory is in order.
        const newDirectory = await get_directory(db, glob.user_1, itemInfo.parent_id);
        let itemOrders = newDirectory[0].map(x => x.item_order);
        expect(numbers_in_order(itemOrders)).toBe(true);
    });

    test('Before in a thematic folder', async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "14",
            category_id: "8",
            new_order: "2",
            direction: "before"
        });

        expect(response.status).toEqual(200);

        // Item relocated.
        const itemInfo = await get_item_info(db, "14");
        expect(itemInfo.item_order).toEqual("2");
        expect(itemInfo.category_id).toEqual("8");

        const directory = await get_directory(db, glob.user_1, itemInfo.parent_id);
        // All items in categories are ordered.
        const groupedDir = group_objects(directory[0], 'category_id');
        for (let group in groupedDir) {
            let itemOrders = groupedDir[group].map(x => x.item_order);
            expect(numbers_in_order(itemOrders)).toBe(true);
        }
    });

    test('After in a thematic folder', async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "14",
            category_id: "8",
            new_order: "2",
            direction: 'after'
        });

        expect(response.status).toEqual(200);

        // Item relocated.
        const itemInfo = await get_item_info(db, "14");
        expect(itemInfo.item_order).toEqual("3");
        expect(itemInfo.category_id).toEqual("8");

        const directory = await get_directory(db, glob.user_1, itemInfo.parent_id);
        // All items in categories are ordered.
        const groupedDir = group_objects(directory[0], 'category_id');
        for (let group in groupedDir) {
            let itemOrders = groupedDir[group].map(x => x.item_order);
            expect(numbers_in_order(itemOrders)).toBe(true);
        }
    });

    test('Before for a category', async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "11",
            category_id: null,
            new_order: "1",
            direction: 'before'
        });

        expect(response.status).toEqual(200);

        // Item relocated.
        const itemInfo = await get_item_info(db, "11");
        expect(itemInfo.item_order).toEqual("1");
        expect(itemInfo.category_id).toBe(null);

        const directory = await get_directory(db, glob.user_1, itemInfo.parent_id);
        // All items in categories are ordered.
        const groupedDir = group_objects(directory[0], 'category_id');
        for (let group in groupedDir) {
            let itemOrders = groupedDir[group].map(x => x.item_order);
            expect(numbers_in_order(itemOrders)).toBe(true);
        }
    });

    test('After for a category', async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "10",
            category_id: null,
            new_order: "2",
            direction: 'after'
        });

        expect(response.status).toEqual(200);

        // Item relocated.
        const itemInfo = await get_item_info(db, "10");
        expect(itemInfo.item_order).toEqual("2");
        expect(itemInfo.category_id).toBe(null);

        const directory = await get_directory(db, glob.user_1, itemInfo.parent_id);
        // All items in categories are ordered.
        const groupedDir = group_objects(directory[0], 'category_id');
        for (let group in groupedDir) {
            let itemOrders = groupedDir[group].map(x => x.item_order);
            expect(numbers_in_order(itemOrders)).toBe(true);
        }
    });

    test('Category must exist', async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "14",
            category_id: "245",
            new_order: "2",
            direction: 'before'
        });

        fail_with_json(response, 400, 'Invalid category');
    });

    test('Category must exist in the directory', async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "20",
            category_id: "8",
            new_order: "2",
            direction: 'before'
        });

        fail_with_json(response, 400, 'Invalid category');
    });

    test("Category id must point to a valid category", async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "7",
            category_id: "3",
            new_order: "3",
            direction: 'before'
        });

        fail_with_json(response, 400, 'Invalid category');
    });

    test("Moved item must belong to the same user", async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "29",
            category_id: null,
            new_order: "1",
            direction: 'before'
        });

        fail_with_json(response);
    });

    test("Do nothing in case of a request to the same order", async () => {
        const beforeResponse = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "4",
            category_id: null,
            new_order: "2",
            direction: 'before'
        });

        fail_with_json(beforeResponse, 200, 'No change needed');

        const afterResponse = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "4",
            category_id: null,
            new_order: "2",
            direction: 'after'
        });

        fail_with_json(afterResponse, 200, 'No change needed');
    });

    test("Do nothing in case of a request to the same order in a category", async () => {
        const afterResponse = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "19",
            category_id: "11",
            new_order: "2",
            direction: 'before'
        });

        fail_with_json(afterResponse, 200, 'No change needed');

        const beforeResponse = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "19",
            category_id: "11",
            new_order: "1",
            direction: 'after'
        });

        expect(beforeResponse.status).toEqual(200);
    });

    test('Should not move a deck into a category with different languages', async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "19",
            category_id: "10",
            new_order: "2",
            direction: 'before'
        });

        fail_with_json(response, 400, 'Category target language is different.');
    });

    test('Direction must be before or after', async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "7",
            category_id: null,
            new_order: "3",
            direction: 'haha yes'
        });

        fail_with_json(response);
    });

    test('Should not move a root folder', async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "1",
            category_id: null,
            new_order: "2",
            direction: 'before'
        });

        fail_with_json(response);
    });

    test('Send items to the end if order is bigger than item count', async () => {
        // Big order no category
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "4",
            category_id: null,
            new_order: "1512",
            direction: 'before'
        });

        expect(response.status).toEqual(200);

        // Item relocated.
        const itemInfo = await get_item_info(db, "4");
        expect(itemInfo.item_order).toEqual("5");

        // Directory is in order.
        const newDirectory = await get_directory(db, glob.user_1, itemInfo.parent_id);
        let itemOrders = newDirectory[0].map(x => x.item_order);
        expect(numbers_in_order(itemOrders)).toBe(true);

        // Big order in a category
        const response2 = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "18",
            category_id: "11",
            new_order: "1512",
            direction: 'after'
        });

        expect(response.status).toEqual(200);

        // Item relocated.
        const itemInfo2 = await get_item_info(db, "18");
        expect(itemInfo2.item_order).toEqual("3");

        // Directory is in order.
        const newDirectory2 = await get_directory(db, glob.user_1, itemInfo.parent_id);
        let itemOrders2 = newDirectory2[0].map(x => x.item_order);
        expect(numbers_in_order(itemOrders2)).toBe(true);
        
    });

    test('Order cannot be smaller than 1', async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "4",
            category_id: null,
            new_order: "0",
            direction: 'before'
        });

        fail_with_json(response);
    });

    test('Categories cannot have a category id', async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "9",
            category_id: "8",
            new_order: "1",
            direction: 'before'
        });

        fail_with_json(response, 400, "Invalid category");
    });

    test('Items in a thematic folder must have a category id', async () => {
        const response = await request(app(db))
        .put(relocateUrl)
        .send({
            item_id: "17",
            category_id: null,
            new_order: "1",
            direction: 'before'
        });

        fail_with_json(response, 400, "Invalid category");
    });

    test("Body values must be present and valid", async () => {
        await test_utils.check_type_blank({
            item_id: "7",
            category_id: null,
            new_order: "3",
            direction: 'before'
        }, relocateUrl, 'put', app, db);

        await test_utils.check_type_blank({
            item_id: "18",
            category_id: "10",
            new_order: "2",
            direction: 'after'
        }, relocateUrl, 'put', app, db);
    });
})

