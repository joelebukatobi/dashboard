// scripts/test-db.js
// Simple database connection test
import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 5,
});

async function test() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 40) + '...');

    console.log('✅ Connected to MySQL!');

    const [rows] = await pool.query('SELECT VERSION() AS version');
    console.log('MySQL version:', rows[0].version);

    await pool.end();
    console.log('✅ Connection test successful');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

test();
