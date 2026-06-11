const sequelize = require('./server/config/database.js');

async function run() {
  try {
    await sequelize.query('ALTER TABLE labels MODIFY photo_url LONGTEXT;');
    console.log('Successfully altered labels table');
  } catch (err) {
    console.error('Error altering table:', err);
  } finally {
    process.exit(0);
  }
}
run();
