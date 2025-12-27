// backend/migrate_positions.js
const db = require('./db');

async function migrate() {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        console.log('데이터 마이그레이션을 시작합니다...');

        // 1. employees 테이블에 job_position_id 컬럼 추가 (이미 존재하면 무시)
        try {
            await connection.query('ALTER TABLE employees ADD COLUMN job_position_id INT NULL AFTER pos');
            console.log('1/6: `employees` 테이블에 `job_position_id` 컬럼을 추가했습니다.');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('1/6: `job_position_id` 컬럼이 이미 존재하여 건너뜁니다.');
            } else {
                throw error;
            }
        }

        // 2. 기존 직급(pos) 데이터를 job_positions 테이블로 이전
        const [distinctPositions] = await connection.query('SELECT DISTINCT pos FROM employees WHERE pos IS NOT NULL AND pos != ""');
        console.log(`2/6: ${distinctPositions.length}개의 고유한 직급을 employees 테이블에서 찾았습니다.`);

        for (const [index, row] of distinctPositions.entries()) {
            const positionName = row.pos;
            // 이미 존재하는지 확인
            const [existing] = await connection.query('SELECT id FROM job_positions WHERE name = ?', [positionName]);
            if (existing.length === 0) {
                // 존재하지 않으면 삽입 (레벨은 임의로 순차 부여)
                const level = 10 * (index + 1); // 임의의 레벨 부여
                await connection.query('INSERT INTO job_positions (name, `level`) VALUES (?, ?)', [positionName, level]);
                console.log(`   - 직급 '${positionName}' (레벨: ${level})을 'job_positions' 테이블에 추가했습니다.`);
            }
        }
        console.log('   완료: 모든 고유 직급을 `job_positions` 테이블에 동기화했습니다.');


        // 3. employees.job_position_id 업데이트
        const [positions] = await connection.query('SELECT id, name FROM job_positions');
        for (const pos of positions) {
            await connection.query('UPDATE employees SET job_position_id = ? WHERE pos = ?', [pos.id, pos.name]);
        }
        console.log('3/6: `employees` 테이블의 `job_position_id`를 업데이트했습니다.');


        // 4. job_position_id 외래 키 추가 (이미 존재하면 무시)
        try {
            await connection.query(`
                ALTER TABLE employees 
                ADD CONSTRAINT fk_job_position 
                FOREIGN KEY (job_position_id) 
                REFERENCES job_positions(id)
                ON DELETE SET NULL
            `);
            console.log('4/6: `job_position_id`에 대한 외래 키 제약조건을 추가했습니다.');
        } catch (error) {
            if (error.code === 'ER_FK_DUP_NAME') {
                 console.log('4/6: 외래 키 `fk_job_position`이 이미 존재하여 건너뜁니다.');
            } else {
                 throw error;
            }
        }

        // 5. 기존 pos 컬럼 처리 (데이터 보존을 위해 삭제 대신 이름 변경)
        try {
             await connection.query('ALTER TABLE employees CHANGE pos pos_old VARCHAR(50) NULL COMMENT "구 직급 데이터"');
             console.log('5/6: 기존 `pos` 컬럼을 `pos_old`로 변경했습니다.');
        } catch (error) {
             if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('5/6: `pos_old` 컬럼이 이미 존재하여 건너뜁니다.');
             } else if (error.code === 'ER_BAD_FIELD_ERROR') {
                console.log('5/6: `pos` 컬럼이 존재하지 않아 건너뜁니다.')
             } 
             else {
                throw error;
             }
        }

        await connection.commit();
        console.log('6/6: 모든 마이그레이션 작업이 성공적으로 완료되었습니다.');

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('마이그레이션 중 오류가 발생했습니다:', error);
        process.exit(1);
    } finally {
        if (connection) connection.release();
        process.exit(0);
    }
}

migrate();
