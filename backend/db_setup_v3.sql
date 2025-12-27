-- 직원 경력 관리용 테이블 추가

-- 1. 자격증 (Certifications)
CREATE TABLE IF NOT EXISTS employee_certifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL COMMENT '자격증명',
    issuer VARCHAR(255) COMMENT '발급기관',
    issue_date DATE COMMENT '취득일',
    expiry_date DATE COMMENT '만료일',
    cert_number VARCHAR(100) COMMENT '자격번호',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) COMMENT '직원 자격증 정보';

-- 2. 교육 이수 (Training)
CREATE TABLE IF NOT EXISTS employee_training (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    course_name VARCHAR(255) NOT NULL COMMENT '교육 과정명',
    institution VARCHAR(255) COMMENT '교육기관',
    start_date DATE COMMENT '교육 시작일',
    end_date DATE COMMENT '교육 종료일',
    description TEXT COMMENT '교육 내용',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) COMMENT '직원 교육 이수 정보';

-- 3. 수상 내역 (Awards)
CREATE TABLE IF NOT EXISTS employee_awards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    award_name VARCHAR(255) NOT NULL COMMENT '수상명',
    issuer VARCHAR(255) COMMENT '수여기관',
    award_date DATE COMMENT '수상일',
    description TEXT COMMENT '수상 내용',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) COMMENT '직원 수상 내역';

-- 4. 프로젝트 이력 (Projects)
CREATE TABLE IF NOT EXISTS employee_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    project_name VARCHAR(255) NOT NULL COMMENT '프로젝트명',
    start_date DATE COMMENT '시작일',
    end_date DATE COMMENT '종료일',
    role VARCHAR(100) COMMENT '담당 역할',
    description TEXT COMMENT '프로젝트 내용 및 기여',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) COMMENT '직원 프로젝트 이력';
