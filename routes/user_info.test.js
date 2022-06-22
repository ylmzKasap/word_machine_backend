const app = require('../app');
const request = require('supertest');

const db = require('../database/test_database');
const setup = require('../database/setup');
const { glob } = require('../database/build_database');
const { fail_with_json } = require('../test/test_functions');


setup.setup_before_and_after(db);


describe('Serve user info', () => {
    test('Existing user', async () => {
        const response = await request(app(db)).get(`/u/${glob.user_1}`);

        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toEqual(200);
        expect(response.body.username).toEqual(glob.user_1); 
        expect(response.body.user_id).toEqual("1");     
        expect(response.body.root_id).toEqual(1);     
    });

    test('Fail on non-existing user', async () => {
        const response = await request(app(db)).get(`/u/random_user`);

        fail_with_json(response, 404, "User not found");
    });

    test('Existing directory', async () => {
        const response = await request(app(db)).get(`/u/${glob.user_1}/1`);

        // Serve directory info
        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toEqual(200);
        expect(response.body[0].length).toEqual(5);

        // Serve parent info
        expect(response.body[1].owner).toEqual(glob.user_1);
        expect(response.body[1].item_id).toEqual("1");
        expect(response.body[1].parent_id).toBe(null);
        expect(response.body[1].item_type).toEqual("root_folder");     
    });

    test('Empty directory', async () => {
        const response = await request(app(db)).get(`/u/${glob.user_1}/22`);

        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toEqual(200);
        expect(response.body[0].length).toEqual(0);

        // Serve parent info
        expect(response.body[1].owner).toEqual(glob.user_1);
        expect(response.body[1].item_id).toEqual("22");
        expect(response.body[1].parent_id).toEqual("4");
        expect(response.body[1].item_type).toEqual("folder");
    });

    test('Fail on non-existing directory', async () => {
        const response = await request(app(db)).get(`/u/${glob.user_2}/1`);

        fail_with_json(response, 404, "Directory not found"); 
    });

    test('Fail on gibberish', async () => {
        const response = await request(app(db)).get(`/u/+%+R+^H)?=()(K6/HT+G/1`);

        fail_with_json(response, 404, "Invalid request");
    });
});


describe('Serve item info', () => {
    test('Existing user, existing item', async () => {
        const response = await request(app(db)).get(`/u/${glob.user_1}/1/item/7`);
        
        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toEqual(200);
        expect(response.body.words[0].deck_id).toEqual("7");  
        expect(response.body.words[0].image_path).toEqual("square.png");
        expect(response.body.words[0].english).toEqual("square");
        expect(response.body.words[1].english_sound_path).toEqual("palace.mp3");
        expect(response.body.words[2].word_order).toEqual(3);
        expect(response.body.target_language).toEqual("english");
        expect(response.body.source_language).toEqual("turkish");
    });

    test('Fail on existing user, non-existing item', async () => {
        const response = await request(app(db)).get(`/u/${glob.user_1}/1/item/202`);
        
        fail_with_json(response, 404, "Deck not found");
    });

    test("Fail on existing user, someone else's item", async () => {
        const response = await request(app(db)).get(`/u/${glob.user_1}/2/item/35`);
        
        fail_with_json(response, 404, "Deck not found");
    });

    test('Fail on non-existing user, existing item', async () => {
        const response = await request(app(db)).get(`/u/random_user/1/item/7`);
        
        fail_with_json(response, 404, "Deck not found");
    });
});