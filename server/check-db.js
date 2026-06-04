const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

async function run() {
  try {
    const [results] = await sequelize.query('SELECT code, title, status FROM Drafts ORDER BY created_at DESC LIMIT 5');
    console.log("RECENT DRAFTS:");
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
