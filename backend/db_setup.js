const mysql = require('mysql2/promise');

// 데이터베이스 설정
const dbConfig = {
    host: '127.0.0.1',
    user: 'tester1',
    password: 'tester1',
};

const DB_NAME = 'hr';

// 초기 데이터
const departments = [
    { id: 1, name: '경영지원본부', parent_id: null },
    { id: 2, name: 'IT 개발본부', parent_id: null },
    { id: 3, name: '영업본부', parent_id: null },
    { id: 4, name: '인사팀', parent_id: 1 },
    { id: 5, name: '재무회계팀', parent_id: 1 },
    { id: 6, name: '플랫폼개발실', parent_id: 2 },
    { id: 7, name: '클라우드운영팀', parent_id: 2 },
    { id: 8, name: '백엔드개발팀', parent_id: 6 },
    { id: 9, name: '프론트엔드팀', parent_id: 6 },
];

const employees = [
    { id: '20230104', name: '김철수', dept_id: 8, pos: '책임연구원', status: '재직', email: 'chulsu@nexus.com' },
    { id: '20230215', name: '이영희', dept_id: 9, pos: '선임연구원', status: '재직', email: 'younghee@nexus.com' },
    { id: '20220311', name: '박지민', dept_id: 4, pos: '팀장', status: '재직', email: 'jimin@nexus.com' },
    { id: '20210522', name: '최유진', dept_id: 5, pos: '과장', status: '휴직', email: 'ujin@nexus.com' },
    { id: '20240101', name: '정태호', dept_id: 7, pos: '수석연구원', status: '재직', email: 'th@nexus.com' },
    { id: '20230812', name: '강동원', dept_id: 3, pos: '대리', status: '재직', email: 'dw@nexus.com' },
    { id: '20221105', name: '한소희', dept_id: 4, pos: '사원', status: '재직', email: 'sh@nexus.com' }
];

async function setupDatabase() {
    let connection;
    try {
        // 1. MariaDB 서버에 연결
        connection = await mysql.createConnection(dbConfig);
        console.log('MariaDB에 성공적으로 연결되었습니다.');

        // 2. 'hr' 데이터베이스 생성
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
        console.log(`'${DB_NAME}' 데이터베이스가 생성되었거나 이미 존재합니다.`);
        
        // 3. 'hr' 데이터베이스로 전환
        await connection.changeUser({ database: DB_NAME });
        console.log(`'${DB_NAME}' 데이터베이스를 사용합니다.`);

        // 4. 'departments' 테이블 생성
        await connection.query(`
            CREATE TABLE IF NOT EXISTS departments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                parent_id INT,
                FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL
            )
        `);
        console.log("'departments' 테이블이 생성되었거나 이미 존재합니다.");

        // 5. 'employees' 테이블 스키마 확인 및 수정/생성
        const [empColumns] = await connection.query(`
            SELECT * FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'role'
        `, [DB_NAME]);

        if (empColumns.length === 0) {
             console.log("'employees' 테이블에 'role'과 'password' 컬럼을 추가합니다.");
             await connection.query(`
                ALTER TABLE employees
                ADD COLUMN role ENUM('admin', 'user') DEFAULT 'user' NOT NULL,
                ADD COLUMN password VARCHAR(255)
            `);
        } else {
            console.log("'employees' 테이블에 이미 'role'과 'password' 컬럼이 존재합니다.");
        }
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS employees (
                id VARCHAR(20) PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                pos VARCHAR(50),
                status ENUM('재직', '휴직', '퇴직') DEFAULT '재직',
                role ENUM('admin', 'user') DEFAULT 'user' NOT NULL,
                password VARCHAR(255),
                dept_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE SET NULL
            )
        `);
        console.log("'employees' 테이블이 생성되었거나 이미 존재합니다.");

        // 7. 'salaries' 테이블 생성
        await connection.query(`
            CREATE TABLE IF NOT EXISTS salaries (
                employee_id VARCHAR(20) PRIMARY KEY,
                base_salary DECIMAL(15, 2) NOT NULL,
                bank_name VARCHAR(50),
                account_number VARCHAR(50),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )
        `);
        console.log("'salaries' 테이블이 생성되었거나 이미 존재합니다.");

        // 8. 'payroll_history' 테이블 생성
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payroll_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id VARCHAR(20) NOT NULL,
                pay_date DATE NOT NULL,
                base_pay DECIMAL(15, 2) NOT NULL,
                bonus DECIMAL(15, 2) DEFAULT 0,
                deductions DECIMAL(15, 2) DEFAULT 0,
                net_pay DECIMAL(15, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                UNIQUE KEY (employee_id, pay_date)
            )
        `);
        console.log("'payroll_history' 테이블이 생성되었거나 이미 존재합니다.");

        // 9. 'attendance' 테이블 생성
        await connection.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id VARCHAR(20) NOT NULL,
                record_date DATE NOT NULL,
                status ENUM('출근', '오전반차', '오후반차', '휴가', '병가', '결근') DEFAULT '출근',
                check_in TIME,
                check_out TIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                UNIQUE KEY (employee_id, record_date)
            )
        `);
        console.log("'attendance' 테이블이 생성되었거나 이미 존재합니다.");

        // 10. 'evaluations' 테이블 생성
        await connection.query(`
            CREATE TABLE IF NOT EXISTS evaluations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id VARCHAR(20) NOT NULL,
                evaluator_id VARCHAR(20) NOT NULL,
                evaluation_year INT NOT NULL,
                rating ENUM('S', 'A', 'B', 'C') NOT NULL,
                feedback TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                FOREIGN KEY (evaluator_id) REFERENCES employees(id) ON DELETE CASCADE,
                UNIQUE KEY (employee_id, evaluation_year)
            )
        `);
        console.log("'evaluations' 테이블이 생성되었거나 이미 존재합니다.");


        // 11. 데이터 삽입 (중복 방지)
        const [deptRows] = await connection.query('SELECT COUNT(*) as count FROM departments');
        if (deptRows[0].count === 0) {
            await connection.query(
                'INSERT INTO departments (id, name, parent_id) VALUES ?',
                [departments.map(d => [d.id, d.name, d.parent_id])]
            );
            console.log("'departments' 테이블에 초기 데이터를 삽입했습니다.");
        } else {
            console.log("'departments' 테이블에 이미 데이터가 존재하여 삽입을 건너뜁니다.");
        }

        const [empRows] = await connection.query('SELECT COUNT(*) as count FROM employees');
        if (empRows[0].count === 0) {
            await connection.query(
                'INSERT INTO employees (id, name, dept_id, pos, status, email) VALUES ?',
                [employees.map(e => [e.id, e.name, e.dept_id, e.pos, e.status, e.email])]
            );
            console.log("'employees' 테이블에 초기 데이터를 삽입했습니다.");
        } else {
            console.log("'employees' 테이블에 이미 데이터가 존재하여 삽입을 건너뜁니다.");
        }

        const [salaryRows] = await connection.query('SELECT COUNT(*) as count FROM salaries');
        if (salaryRows[0].count === 0) {
            const salariesData = [
                ['20230104', 70000000, '국민은행', '111-222-333333'],
                ['20230215', 60000000, '신한은행', '222-333-444444'],
                ['20220311', 85000000, '우리은행', '333-444-555555'],
                ['20210522', 75000000, '하나은행', '444-555-666666'],
                ['20240101', 95000000, '국민은행', '555-666-777777'],
                ['20230812', 55000000, '기업은행', '666-777-888888'],
                ['20221105', 45000000, '신한은행', '777-888-999999']
            ];
             await connection.query(
                'INSERT INTO salaries (employee_id, base_salary, bank_name, account_number) VALUES ?',
                [salariesData]
            );
            console.log("'salaries' 테이블에 초기 데이터를 삽입했습니다.");
        } else {
            console.log("'salaries' 테이블에 이미 데이터가 존재하여 삽입을 건너뜁니다.");
        }

        const [attendanceRows] = await connection.query('SELECT COUNT(*) as count FROM attendance');
        if (attendanceRows[0].count === 0) {
            console.log("'attendance' 테이블에 초기 데이터를 삽입합니다...");
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const allEmployees = employees.map(e => e.id);
            const attendanceData = [];

            for (let day = 1; day <= daysInMonth; day++) {
                const currentDay = new Date(year, month, day);
                // 주말(토:6, 일:0)은 건너뛰기
                if (currentDay.getDay() === 0 || currentDay.getDay() === 6) {
                    continue;
                }
                
                for (const empId of allEmployees) {
                    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    let status = '출근';
                    // 데모용 랜덤 데이터 생성
                    const rand = Math.random();
                    if (rand < 0.05) status = '결근';
                    else if (rand < 0.1) status = '휴가';
                    else if (rand < 0.15) status = '병가';
                    
                    attendanceData.push([empId, dateStr, status]);
                }
            }
             await connection.query(
                'INSERT INTO attendance (employee_id, record_date, status) VALUES ?',
                [attendanceData]
            );
            console.log(`'attendance' 테이블에 ${attendanceData.length}개의 초기 데이터를 삽입했습니다.`);
        } else {
            console.log("'attendance' 테이블에 이미 데이터가 존재하여 삽입을 건너뜁니다.");
        }

        const [evaluationRows] = await connection.query('SELECT COUNT(*) as count FROM evaluations');
        if (evaluationRows[0].count === 0) {
            const year = new Date().getFullYear() - 1; // 작년 평가 데이터
            const evaluatorId = '20220311'; // 박지민 팀장
            const ratings = ['S', 'A', 'B', 'C'];
            const evaluationData = employees
                .filter(e => e.id !== evaluatorId)
                .map(e => {
                    const rating = ratings[Math.floor(Math.random() * ratings.length)];
                    return [e.id, evaluatorId, year, rating, `${e.name}의 ${year}년도 평가 피드백입니다.`];
                });
            
            await connection.query(
                'INSERT INTO evaluations (employee_id, evaluator_id, evaluation_year, rating, feedback) VALUES ?',
                [evaluationData]
            );
            console.log(`'evaluations' 테이블에 ${evaluationData.length}개의 초기 데이터를 삽입했습니다.`);
        } else {
            console.log("'evaluations' 테이블에 이미 데이터가 존재하여 삽입을 건너뜁니다.");
        }




        console.log('\n🎉 데이터베이스 설정이 성공적으로 완료되었습니다.');

    } catch (error) {
        console.error('데이터베이스 설정 중 오류가 발생했습니다:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('데이터베이스 연결이 종료되었습니다.');
        }
    }
}

setupDatabase();
