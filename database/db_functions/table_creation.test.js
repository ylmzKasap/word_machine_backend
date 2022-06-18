const db = require('../test_database');
const setup = require('../setup');
const roV = require('./common/functions').roV;


setup.setup_before_and_after(db);

test('Create database tables', async () => {
  const tableExistsQuery = "SELECT EXISTS (SELECT relname FROM pg_class WHERE relname = $1);"
  const users = await db.query(tableExistsQuery, ['users']);
  const items = await db.query(tableExistsQuery, ['items']);
  const artists = await db.query(tableExistsQuery, ['artists']);
  const artist_references = await db.query(tableExistsQuery, ['artist_references']);
  const word_content = await db.query(tableExistsQuery, ['word_content']);
  const translations = await db.query(tableExistsQuery, ['translations']);
  const translation_approval = await db.query(tableExistsQuery, ['translation_approval']);
  const sound_paths = await db.query(tableExistsQuery, ['sound_paths']);
  const sound_approval = await db.query(tableExistsQuery, ['sound_approval']);
  const deck_content = await db.query(tableExistsQuery, ['deck_content']);
  const words = await db.query(tableExistsQuery, ['words']);
  const category_content = await db.query(tableExistsQuery, ['category_content']);

  expect(roV(users).exists).toBe(true);
  expect(roV(items).exists).toBe(true);
  expect(roV(artists).exists).toBe(true);
  expect(roV(artist_references).exists).toBe(true);
  expect(roV(word_content).exists).toBe(true);
  expect(roV(translations).exists).toBe(true);
  expect(roV(translation_approval).exists).toBe(true);
  expect(roV(sound_paths).exists).toBe(true);
  expect(roV(sound_approval).exists).toBe(true);
  expect(roV(deck_content).exists).toBe(true);
  expect(roV(words).exists).toBe(true);
  expect(roV(category_content).exists).toBe(true);
});