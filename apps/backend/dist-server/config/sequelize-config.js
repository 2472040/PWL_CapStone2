"use strict";
require('dotenv').config();
module.exports = {
    development: {
        username: process.env.DB_USER || 'lokalab_user',
        password: process.env.DB_PASS || 'lokalab_password',
        database: process.env.DB_NAME || 'lokalab_db',
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
    },
    test: {
        username: process.env.DB_USER || 'lokalab_user',
        password: process.env.DB_PASS || 'lokalab_password',
        database: process.env.DB_NAME || 'lokalab_db',
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
    },
    production: {
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
    },
};
