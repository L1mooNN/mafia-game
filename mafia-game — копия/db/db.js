const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'mafia_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mafia_db',
  password: process.env.DB_PASSWORD || 'ваш_пароль',
  port: process.env.DB_PORT || 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};