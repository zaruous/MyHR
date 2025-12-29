require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const authMiddleware = require('./authMiddleware');
const adminOnly = require('./adminOnly');
const { ERROR_CODE } = require('./constant');
const app = express();
const port = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret_key'; // 실제 프로덕션에서는 환경 변수로 관리해야 합니다.


app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//--- 인증 라우트 (Unprotected) ---
app.post('/api/auth/login', async (req, res) => {
    const { employee_id, password } = req.body;
    if (!employee_id || !password) {
        return res.status(400).json({ message: '사번과 비밀번호를 모두 입력해주세요.' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM employees WHERE id = ?', [employee_id]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: '사번 또는 비밀번호가 잘못되었습니다.' });
        }

        // 비밀번호가 없는 경우(최초 로그인) CHG_PWD 코드 전송
        if (!user.password) {
            // 임시 토큰 발급 (비밀번호 변경용)
            const tempToken = jwt.sign(
                { id: user.id, name: user.name, role: 'TEMP' }, // 제한된 역할
                JWT_SECRET,
                { expiresIn: '10m' } // 짧은 만료 시간
            );
            return res.status(401).json({ 
                message: '비밀번호 변경 필요', 
                code: ERROR_CODE.CHG_PWD,
                tempToken: tempToken,
                user: { id: user.id, name: user.name }
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: '사번 또는 비밀번호가 잘못되었습니다.' });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, role: user.role },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            message: '로그인 성공',
            token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('로그인 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

//--- 비밀번호 변경 라우트 (보호됨) ---
app.post('/api/change-password', authMiddleware, async (req, res) => {
    const { newPassword } = req.body;
    const userId = req.user.id;

    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ message: '비밀번호는 4자 이상이어야 합니다.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query('UPDATE employees SET password = ? WHERE id = ?', [hashedPassword, userId]);

        res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });

    } catch (error) {
        console.error('비밀번호 변경 중 오류:', error);
        res.status(500).json({ message: '비밀번호 변경 중 서버 오류가 발생했습니다.' });
    }
});


//--- API 라우터 (Protected) ---
const apiRouter = express.Router();
apiRouter.use(authMiddleware); // 이 라우터의 모든 경로에 인증 미들웨어 적용

// 기존 API 핸들러들을 apiRouter에 연결
apiRouter.get('/departments', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM departments ORDER BY parent_id, id');
        res.json(rows);
    } catch (error) {
        console.error('부서 목록 조회 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.post('/departments', adminOnly, async (req, res) => {
    const { name, parent_id } = req.body;
    if (!name) {
        return res.status(400).json({ message: '부서 이름을 입력해주세요.' });
    }
    try {
        const sql = 'INSERT INTO departments (name, parent_id) VALUES (?, ?)';
        const [result] = await db.query(sql, [name, parent_id === 'null' ? null : parent_id]);
        const [rows] = await db.query('SELECT * FROM departments WHERE id = ?', [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('부서 등록 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.put('/departments/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    const { name, parent_id } = req.body;
    if (!name) {
        return res.status(400).json({ message: '부서 이름을 입력해주세요.' });
    }
    try {
        const sql = 'UPDATE departments SET name = ?, parent_id = ? WHERE id = ?';
        const [result] = await db.query(sql, [name, parent_id === 'null' ? null : parent_id, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '해당 부서를 찾을 수 없습니다.' });
        }
        const [rows] = await db.query('SELECT * FROM departments WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (error) {
        console.error('부서 정보 수정 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.delete('/departments/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    try {
        const [children] = await db.query('SELECT id FROM departments WHERE parent_id = ?', [id]);
        if (children.length > 0) {
            return res.status(400).json({ message: '하위 부서가 존재하여 삭제할 수 없습니다. 하위 부서를 먼저 이동 또는 삭제해주세요.' });
        }
        const [employees] = await db.query('SELECT id FROM employees WHERE dept_id = ?', [id]);
        if (employees.length > 0) {
            return res.status(400).json({ message: '소속된 직원이 있어 삭제할 수 없습니다. 직원들을 다른 부서로 먼저 이동해주세요.' });
        }

        const sql = 'DELETE FROM departments WHERE id = ?';
        const [result] = await db.query(sql, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '해당 부서를 찾을 수 없습니다.' });
        }
        res.status(200).json({ message: '부서가 성공적으로 삭제되었습니다.' });
    } catch (error) {
        console.error('부서 삭제 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.get('/employees', async (req, res) => {
    try {
        const { search, status, dept_id, job_position_id } = req.query;

        let query = `
            SELECT 
                e.*, 
                d.name as dept_name,
                jp.name as job_position_name,
                jp.level as job_position_level
            FROM employees e
            LEFT JOIN departments d ON e.dept_id = d.id
            LEFT JOIN job_positions jp ON e.job_position_id = jp.id
        `;
        const params = [];

        let whereClauses = [];
        if (search) {
            whereClauses.push(`(e.name LIKE ? OR e.id LIKE ?)`);
            params.push(`%${search}%`);
            params.push(`%${search}%`);
        }
        if (status && status !== '전체') {
            whereClauses.push(`e.status = ?`);
            params.push(status);
        }
        if (dept_id) {
            whereClauses.push(`e.dept_id = ?`);
            params.push(dept_id);
        }
        if (job_position_id) {
            whereClauses.push(`e.job_position_id = ?`);
            params.push(job_position_id);
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }
        query += ' ORDER BY e.id';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('직원 목록 조회 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.post('/employees', adminOnly, async (req, res) => {
    const { id, name, email, job_position_id, status, dept_id } = req.body;

    if (!id || !name || !email || !dept_id || !job_position_id) {
        return res.status(400).json({ message: '필수 필드(사번, 이름, 이메일, 부서, 직급)를 모두 입력해주세요.' });
    }

    try {
        const sql = 'INSERT INTO employees (id, name, email, job_position_id, status, dept_id) VALUES (?, ?, ?, ?, ?, ?)';
        await db.query(sql, [id, name, email, job_position_id, status, dept_id]);
        
        const [rows] = await db.query(`
            SELECT 
                e.*, 
                d.name as dept_name,
                jp.name as job_position_name,
                jp.level as job_position_level
            FROM employees e 
            LEFT JOIN departments d ON e.dept_id = d.id 
            LEFT JOIN job_positions jp ON e.job_position_id = jp.id 
            WHERE e.id = ?
        `, [id]);
        res.status(201).json(rows[0]);

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: '이미 사용 중인 사번 또는 이메일입니다.' });
        }
        console.error('직원 등록 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.put('/employees/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    const { name, email, job_position_id, status, dept_id } = req.body;

    if (!name || !email || !dept_id || !job_position_id) {
        return res.status(400).json({ message: '필수 필드(이름, 이메일, 부서, 직급)를 모두 입력해주세요.' });
    }

    try {
        const sql = 'UPDATE employees SET name = ?, email = ?, job_position_id = ?, status = ?, dept_id = ? WHERE id = ?';
        const [result] = await db.query(sql, [name, email, job_position_id, status, dept_id, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '해당 사원을 찾을 수 없습니다.' });
        }
        
        const [rows] = await db.query(`
            SELECT 
                e.*, 
                d.name as dept_name,
                jp.name as job_position_name,
                jp.level as job_position_level
            FROM employees e 
            LEFT JOIN departments d ON e.dept_id = d.id 
            LEFT JOIN job_positions jp ON e.job_position_id = jp.id 
            WHERE e.id = ?
        `, [id]);
        res.json(rows[0]);

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });
        }
        console.error('직원 정보 수정 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.delete('/employees/:id', adminOnly, async (req, res) => {
    const { id } = req.params;

    try {
        const sql = 'DELETE FROM employees WHERE id = ?';
        const [result] = await db.query(sql, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '해당 사원을 찾을 수 없습니다.' });
        }
        
        res.status(200).json({ message: '사원이 성공적으로 삭제되었습니다.' });

    } catch (error) {
        console.error('직원 삭제 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

/*--- 평가 관리 API ---*/
apiRouter.get('/evaluations', async (req, res) => {
    const { year } = req.query;
    if (!year) {
        return res.status(400).json({ message: '조회할 년도를 지정해주세요.' });
    }
    try {
        const query = `
            SELECT 
                ev.*,
                e.name as employee_name,
                evaluator.name as evaluator_name
            FROM evaluations ev
            JOIN employees e ON ev.employee_id = e.id
            JOIN employees evaluator ON ev.evaluator_id = evaluator.id
            WHERE ev.evaluation_year = ?
        `;
        const [rows] = await db.query(query, [year]);
        res.json(rows);
    } catch (error) {
        console.error('평가 기록 조회 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.post('/evaluations', adminOnly, async (req, res) => {
    const { employee_id, evaluation_year, rating, feedback } = req.body;
    const evaluator_id = req.user.id; // 미들웨어에서 추가된 사용자 정보 사용

    if (!employee_id || !evaluation_year || !rating) {
        return res.status(400).json({ message: '모든 필수 필드를 입력해주세요.' });
    }
    try {
        const sql = `
            INSERT INTO evaluations (employee_id, evaluator_id, evaluation_year, rating, feedback)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE rating = ?, feedback = ?, evaluator_id = ?
        `;
        await db.query(sql, [employee_id, evaluator_id, evaluation_year, rating, feedback, rating, feedback, evaluator_id]);
        res.status(200).json({ message: '평가 기록이 성공적으로 저장되었습니다.' });
    } catch (error) {
        console.error('평가 기록 저장 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

/*--- 근태 관리 API ---*/
apiRouter.get('/attendance', async (req, res) => {
    const { year, month } = req.query;
    if (!year || !month) {
        return res.status(400).json({ message: '조회할 년도와 월을 지정해주세요.' });
    }
    try {
        const query = `
            SELECT a.*, e.name as employee_name, d.name as dept_name
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            LEFT JOIN departments d ON e.dept_id = d.id
            WHERE YEAR(a.record_date) = ? AND MONTH(a.record_date) = ?
            ORDER BY a.record_date, e.id
        `;
        const [rows] = await db.query(query, [year, month]);
        res.json(rows);
    } catch (error) {
        console.error('근태 기록 조회 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.post('/attendance', adminOnly, async (req, res) => {
    const { employee_id, date, status } = req.body;
    if (!employee_id || !date || !status) {
        return res.status(400).json({ message: '모든 필드(직원 ID, 날짜, 상태)를 입력해주세요.' });
    }
    try {
        const sql = `
            INSERT INTO attendance (employee_id, record_date, status)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE status = ?
        `;
        await db.query(sql, [employee_id, date, status, status]);
        res.status(200).json({ message: '근태 기록이 성공적으로 저장되었습니다.' });
    } catch (error) {
        console.error('근태 기록 저장 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

/*--- 급여 관리 API ---*/
apiRouter.get('/salaries', async (req, res) => {
    try {
        const query = `
            SELECT 
                e.id, 
                e.name, 
                d.name as dept_name, 
                jp.name as job_position_name,
                s.base_salary, 
                s.bank_name, 
                s.account_number
            FROM employees e
            LEFT JOIN salaries s ON e.id = s.employee_id
            LEFT JOIN departments d ON e.dept_id = d.id
            LEFT JOIN job_positions jp ON e.job_position_id = jp.id
            ORDER BY e.id
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error('급여 정보 조회 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// --- 급여 설정 API ---
apiRouter.get('/settings/payroll', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'payroll_%'");
        const settings = rows.reduce((acc, row) => {
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, {});
        res.json(settings);
    } catch (error) {
        console.error('급여 설정 조회 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.put('/settings/payroll', adminOnly, async (req, res) => {
    const settings = req.body; // Expects an object like { payroll_bonus: '100000', ... }
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const updatePromises = Object.entries(settings).map(([key, value]) => {
            const sql = "INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?";
            return connection.query(sql, [key, value, value]);
        });
        await Promise.all(updatePromises);
        await connection.commit();
        res.status(200).json({ message: '급여 설정이 성공적으로 저장되었습니다.' });
    } catch (error) {
        await connection.rollback();
        console.error('급여 설정 저장 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    } finally {
        connection.release();
    }
});


apiRouter.put('/salaries/:employee_id', adminOnly, async (req, res) => {
    const { employee_id } = req.params;
    const { base_salary, bank_name, account_number } = req.body;

    if (!base_salary || !bank_name || !account_number) {
        return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
    }

    try {
        const sql = `
            INSERT INTO salaries (employee_id, base_salary, bank_name, account_number)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                base_salary = VALUES(base_salary),
                bank_name = VALUES(bank_name),
                account_number = VALUES(account_number)
        `;
        await db.query(sql, [employee_id, base_salary, bank_name, account_number]);
        
        res.status(200).json({ message: '급여 정보가 성공적으로 저장되었습니다.' });
    } catch (error) {
        console.error('급여 정보 저장/수정 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.get('/payroll/history', async (req, res) => {
    const { year, month } = req.query;
    if (!year || !month) {
        return res.status(400).json({ message: '조회할 년도와 월을 지정해주세요.' });
    }
    try {
        const query = `
            SELECT h.*, e.name, d.name as dept_name
            FROM payroll_history h
            JOIN employees e ON h.employee_id = e.id
            LEFT JOIN departments d ON e.dept_id = d.id
            WHERE YEAR(h.pay_date) = ? AND MONTH(h.pay_date) = ?
            ORDER BY h.employee_id
        `;
        const [rows] = await db.query(query, [year, month]);
        res.json(rows);
    } catch (error) {
        console.error('급여 대장 조회 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.post('/payroll/run', adminOnly, async (req, res) => {
    const { year, month } = req.body;
    const payDate = `${year}-${month.toString().padStart(2, '0')}-25`;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. 해당 월의 기존 급여 기록 삭제
        const deleteSql = 'DELETE FROM payroll_history WHERE YEAR(pay_date) = ? AND MONTH(pay_date) = ?';
        await connection.query(deleteSql, [year, month]);

        // 2. 급여 계산 설정 조회
        const [settingsRows] = await connection.query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'payroll_%'");
        const settings = settingsRows.reduce((acc, row) => {
            acc[row.setting_key] = parseFloat(row.setting_value); // 계산을 위해 숫자로 변환
            return acc;
        }, {});

        const bonus = settings.payroll_bonus || 0;
        const deductions = settings.payroll_deductions || 0;

        // 3. 재직 중인 직원의 급여 정보 조회
        const getSalariesSql = `
            SELECT e.id, s.base_salary 
            FROM employees e
            JOIN salaries s ON e.id = s.employee_id
            WHERE e.status = '재직'
        `;
        const [employees] = await connection.query(getSalariesSql);

        if (employees.length === 0) {
            // 직원이 없어도 오류는 아니며, 그냥 0건 처리하고 커밋.
            await connection.commit();
            return res.status(200).json({ message: '급여를 지급할 재직 중인 직원이 없어, 0건의 데이터가 생성되었습니다.' });
        }

        // 4. 새 급여 데이터 계산
        const payrollData = employees.map(emp => {
            const base_pay = emp.base_salary / 12;
            const net_pay = base_pay + bonus - deductions; // 설정값 사용
            return [emp.id, payDate, base_pay, bonus, deductions, net_pay];
        });

        // 5. 새 급여 기록 삽입
        const insertHistorySql = 'INSERT INTO payroll_history (employee_id, pay_date, base_pay, bonus, deductions, net_pay) VALUES ?';
        await connection.query(insertHistorySql, [payrollData]);
        
        await connection.commit();
        res.status(201).json({ message: `${year}년 ${month}월 급여 대장이 성공적으로 재생성되었습니다. (${employees.length}명)` });

    } catch (error) {
        await connection.rollback();
        console.error('급여 대장 생성 중 오류:', error);
        res.status(500).json({ message: error.message || '서버 오류가 발생했습니다.' });
    } finally {
        connection.release();
    }
});

/*--- 직급 관리 API ---*/
apiRouter.get('/positions', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM job_positions ORDER BY `level` ASC');
        res.json(rows);
    } catch (error) {
        console.error('직급 정보 조회 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.post('/positions', adminOnly, async (req, res) => {
    const { name, level, description } = req.body;
    if (!name || level === undefined) {
        return res.status(400).json({ message: '직급명과 레벨은 필수입니다.' });
    }
    try {
        const sql = 'INSERT INTO job_positions (name, `level`, description) VALUES (?, ?, ?)';
        const [result] = await db.query(sql, [name, level, description || null]);
        const [rows] = await db.query('SELECT * FROM job_positions WHERE id = ?', [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: '이미 사용 중인 직급명 또는 레벨입니다.' });
        }
        console.error('직급 정보 추가 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.put('/positions/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    const { name, level, description } = req.body;
    if (!name || level === undefined) {
        return res.status(400).json({ message: '직급명과 레벨은 필수입니다.' });
    }
    try {
        const sql = 'UPDATE job_positions SET name = ?, `level` = ?, description = ? WHERE id = ?';
        await db.query(sql, [name, level, description || null, id]);
        const [rows] = await db.query('SELECT * FROM job_positions WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: '이미 사용 중인 직급명 또는 레벨입니다.' });
        }
        console.error('직급 정보 수정 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.delete('/positions/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    try {
        // 해당 직급을 사용하는 직원이 있는지 확인 (job_position_id를 참조)
        const [employees] = await db.query('SELECT id FROM employees WHERE job_position_id = ?', [id]);
        if (employees.length > 0) {
            return res.status(400).json({ message: '해당 직급에 소속된 직원이 있어 삭제할 수 없습니다.' });
        }

        const sql = 'DELETE FROM job_positions WHERE id = ?';
        const [result] = await db.query(sql, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '해당 직급을 찾을 수 없습니다.' });
        }
        res.status(200).json({ message: '직급이 성공적으로 삭제되었습니다.' });
    } catch (error) {
        console.error('직급 정보 삭제 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});


/*--- 경력 관리 API ---*/
apiRouter.get('/employees/:employee_id/career', async (req, res) => {
    const { employee_id } = req.params;
    try {
        const [certifications] = await db.query('SELECT * FROM employee_certifications WHERE employee_id = ?', [employee_id]);
        const [training] = await db.query('SELECT * FROM employee_training WHERE employee_id = ?', [employee_id]);
        const [awards] = await db.query('SELECT * FROM employee_awards WHERE employee_id = ?', [employee_id]);
        const [projects] = await db.query('SELECT * FROM employee_projects WHERE employee_id = ?', [employee_id]);

        res.json({ certifications, training, awards, projects });
    } catch (error) {
        console.error('직원 경력 정보 조회 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 자격증 (Certifications)
apiRouter.post('/certifications', adminOnly, async (req, res) => {
    const { employee_id, name, issuer, issue_date, expiry_date, cert_number } = req.body;
    if (!employee_id || !name || !issue_date) {
        return res.status(400).json({ message: '직원 ID, 자격증명, 취득일은 필수입니다.' });
    }
    try {
        const sql = 'INSERT INTO employee_certifications (employee_id, name, issuer, issue_date, expiry_date, cert_number) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.query(sql, [employee_id, name, issuer || null, issue_date, expiry_date || null, cert_number || null]);
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        console.error('자격증 추가 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.put('/certifications/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    const { name, issuer, issue_date, expiry_date, cert_number } = req.body;
    if (!name || !issue_date) {
        return res.status(400).json({ message: '자격증명, 취득일은 필수입니다.' });
    }
    try {
        const sql = 'UPDATE employee_certifications SET name = ?, issuer = ?, issue_date = ?, expiry_date = ?, cert_number = ? WHERE id = ?';
        await db.query(sql, [name, issuer || null, issue_date, expiry_date || null, cert_number || null, id]);
        res.status(200).json({ message: '자격증 정보가 수정되었습니다.' });
    } catch (error) {
        console.error('자격증 수정 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.delete('/certifications/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM employee_certifications WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '자격증을 찾을 수 없습니다.' });
        }
        res.status(200).json({ message: '자격증이 삭제되었습니다.' });
    } catch (error) {
        console.error('자격증 삭제 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 교육 이수 (Training)
apiRouter.post('/training', adminOnly, async (req, res) => {
    const { employee_id, course_name, institution, start_date, end_date, description } = req.body;
    if (!employee_id || !course_name || !start_date) {
        return res.status(400).json({ message: '직원 ID, 과정명, 시작일은 필수입니다.' });
    }
    try {
        const sql = 'INSERT INTO employee_training (employee_id, course_name, institution, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.query(sql, [employee_id, course_name, institution || null, start_date, end_date || null, description || null]);
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        console.error('교육 이수 추가 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.put('/training/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    const { course_name, institution, start_date, end_date, description } = req.body;
    if (!course_name || !start_date) {
        return res.status(400).json({ message: '과정명, 시작일은 필수입니다.' });
    }
    try {
        const sql = 'UPDATE employee_training SET course_name = ?, institution = ?, start_date = ?, end_date = ?, description = ? WHERE id = ?';
        await db.query(sql, [course_name, institution || null, start_date, end_date || null, description || null, id]);
        res.status(200).json({ message: '교육 이수 정보가 수정되었습니다.' });
    } catch (error) {
        console.error('교육 이수 수정 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.delete('/training/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM employee_training WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '교육 이수 정보를 찾을 수 없습니다.' });
        }
        res.status(200).json({ message: '교육 이수가 삭제되었습니다.' });
    } catch (error) {
        console.error('교육 이수 삭제 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 수상 내역 (Awards)
apiRouter.post('/awards', adminOnly, async (req, res) => {
    const { employee_id, award_name, issuer, award_date, description } = req.body;
    if (!employee_id || !award_name || !award_date) {
        return res.status(400).json({ message: '직원 ID, 수상명, 수상일은 필수입니다.' });
    }
    try {
        const sql = 'INSERT INTO employee_awards (employee_id, award_name, issuer, award_date, description) VALUES (?, ?, ?, ?, ?)';
        const [result] = await db.query(sql, [employee_id, award_name, issuer || null, award_date, description || null]);
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        console.error('수상 내역 추가 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.put('/awards/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    const { award_name, issuer, award_date, description } = req.body;
    if (!award_name || !award_date) {
        return res.status(400).json({ message: '수상명, 수상일은 필수입니다.' });
    }
    try {
        const sql = 'UPDATE employee_awards SET award_name = ?, issuer = ?, award_date = ?, description = ? WHERE id = ?';
        await db.query(sql, [award_name, issuer || null, award_date, description || null, id]);
        res.status(200).json({ message: '수상 내역 정보가 수정되었습니다.' });
    } catch (error) {
        console.error('수상 내역 수정 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.delete('/awards/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM employee_awards WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '수상 내역을 찾을 수 없습니다.' });
        }
        res.status(200).json({ message: '수상 내역이 삭제되었습니다.' });
    } catch (error) {
        console.error('수상 내역 삭제 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 프로젝트 이력 (Projects)
apiRouter.post('/projects', adminOnly, async (req, res) => {
    const { employee_id, project_name, start_date, end_date, role, description } = req.body;
    if (!employee_id || !project_name || !start_date) {
        return res.status(400).json({ message: '직원 ID, 프로젝트명, 시작일은 필수입니다.' });
    }
    try {
        const sql = 'INSERT INTO employee_projects (employee_id, project_name, start_date, end_date, role, description) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.query(sql, [employee_id, project_name, start_date, end_date || null, role || null, description || null]);
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        console.error('프로젝트 이력 추가 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.put('/projects/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    const { project_name, start_date, end_date, role, description } = req.body;
    if (!project_name || !start_date) {
        return res.status(400).json({ message: '프로젝트명, 시작일은 필수입니다.' });
    }
    try {
        const sql = 'UPDATE employee_projects SET project_name = ?, start_date = ?, end_date = ?, role = ?, description = ? WHERE id = ?';
        await db.query(sql, [project_name, start_date, end_date || null, role || null, description || null, id]);
        res.status(200).json({ message: '프로젝트 이력 정보가 수정되었습니다.' });
    } catch (error) {
        console.error('프로젝트 이력 수정 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

apiRouter.delete('/projects/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM employee_projects WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '프로젝트 이력을 찾을 수 없습니다.' });
        }
        res.status(200).json({ message: '프로젝트 이력이 삭제되었습니다.' });
    } catch (error) {
        console.error('프로젝트 이력 삭제 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});


// 기본 라우트 및 보호된 API 라우터 연결
app.get('/', (req, res) => {
    res.send('HRM API 서버가 실행 중입니다.');
});
app.use('/api', apiRouter);


app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
