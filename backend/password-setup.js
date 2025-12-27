const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const dbConfig = {
    host: '127.0.0.1',
    user: 'tester1',
    password: 'tester1',
    database: 'hr',
};

const ADMIN_ID = '20220311';
const DEFAULT_PASSWORD = 'password';
const SALT_ROUNDS = 10;

async function setupAdminPassword() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('데이터베이스에 연결되었습니다.');

        console.log(`기본 비밀번호 '${DEFAULT_PASSWORD}'를 해싱합니다...`);
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
        console.log('해싱 완료.');

        const sql = 'UPDATE employees SET role = ?, password = ? WHERE id = ?';
        const [result] = await connection.query(sql, ['admin', hashedPassword, ADMIN_ID]);
        
        if (result.affectedRows > 0) {
            console.log(`사용자 '${ADMIN_ID}'의 역할이 'admin'으로 설정되었고, 비밀번호가 성공적으로 업데이트되었습니다.`);
        } else {
            console.log(`사용자 '${ADMIN_ID}'를 찾을 수 없습니다.`);
        }

    } catch (error) {
        console.error('관리자 비밀번호 설정 중 오류 발생:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('데이터베이스 연결이 종료되었습니다.');
        }
    }
}

setupAdminPassword();
