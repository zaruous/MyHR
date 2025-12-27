const mysql = require('mysql2/promise');

const dbConfig = {
    host: '127.0.0.1',
    user: 'tester1',
    password: 'tester1',
    database: 'hr',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

module.exports = pool;
