// db.js
import pkg from 'pg';
const { Pool } = pkg;

let pool;

if (process.env.DATABASE_URL) {
  // Running on Heroku
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  // Local development
  pool = new Pool({
    user:     process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host:     process.env.PGHOST,
    database: process.env.PGDATABASE,
    port:     process.env.PGPORT,
  });
}

export default pool;
