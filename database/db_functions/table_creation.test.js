const db = require('../test_database');
const setup = require('./setup');
const roV = require('./other_functions').roV;


setup.setupBeforeAndAfter(db);

test('Create database tables', async () => {
  const tableExistsQuery = "SELECT EXISTS (SELECT relname FROM pg_class WHERE relname = $1);"
  let userTable = await db.query(tableExistsQuery, ['users']);
  let itemTable = await db.query(tableExistsQuery, ['items']);
  let contentTable = await db.query(tableExistsQuery, ['contents']);

  expect(
    roV(userTable).exists &&
    roV(itemTable).exists &&
    roV(contentTable).exists).toBe(true);
});