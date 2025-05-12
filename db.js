// db.js
require('dotenv').config();
const { Pool } = require('pg');

// If you’re using a DATABASE_URL env var (e.g. on Heroku):
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false }, // uncomment if your DB requires SSL
});

// Or, if you set individual DB_* vars, you could instead do:
// const pool = new Pool({
//   host:     process.env.DB_HOST,
//   port:     process.env.DB_PORT,
//   user:     process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
// });

module.exports = pool;
