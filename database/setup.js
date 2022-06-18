const db_builder = require('./build_database');


function setup_before_and_after(db) {
    beforeAll(async () => {
        
    });
    afterAll(async () => {
        await db.end();
    });
    beforeEach(async () => {
        await db_builder.setup(db); 
    });
    afterEach(async () => {
        await db_builder.teardown(db);
    });
}

module.exports = {
    setup_before_and_after
}