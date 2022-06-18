const db = require('../test_database');
const  { roV } = require('./common/functions');

const user_utils = require('./user_creation');
const setup = require('../setup');
const { glob } = require('../build_database');


setup.setup_before_and_after(db);


test('Add users and root', async () => {
  const userQuery = `
    SELECT * FROM users
      LEFT JOIN items ON users.username = items.owner
      AND items.item_type = 'root_folder'
    WHERE username = $1`;
  
  const [userData1, userData2] = await Promise.all([
    db.query(userQuery, [glob.user_1]),
    db.query(userQuery, [glob.user_2])
  ]);

  expect(roV(userData1).username).toBe(glob.user_1);
  expect(roV(userData1).root_id).toBe(1);
  expect(roV(userData1).item_name).toBe(`${glob.user_1}_root`);

  expect(roV(userData2).username).toBe(glob.user_2);
  expect(roV(userData2).root_id).toBe(2);
  expect(roV(userData2).item_name).toBe(`${glob.user_2}_root`);
});


test('Delete the user', async () => {
  await user_utils.delete_user(db, glob.user_2);

  const userQuery = `
    SELECT * FROM users WHERE username = $1
  `
  const userData = await db.query(userQuery, [glob.user_2]);

  expect(roV(userData)).toBe(undefined);
});


test('Get user info', async () => {
  const user_1 = await user_utils.get_user_info(db, glob.user_1);
  const user_2 = await user_utils.get_user_info(db, glob.user_2);
  const user_3 = await user_utils.get_user_info(db, `NY&+%/K%+%j'4&J768/)\\(=)YKTUY"J646`);

  expect(user_1.user_id).toBe("1");
  expect(user_1.username).toBe(glob.user_1);
  expect(user_1.user_picture).toBe('no_pic.png');
  expect(user_1.root_id).toBe(1);

  expect(user_2.user_id).toBe("2");
  expect(user_2.username).toBe(glob.user_2);
  expect(user_2.root_id).toBe(2);

  expect(user_3).toBe(false);
});


