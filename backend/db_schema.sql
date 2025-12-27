-- 통합 데이터베이스 스키마 정의
-- 이 파일은 시스템의 모든 테이블 구조를 정의합니다.
-- 신규 데이터베이스 환경 설정 시 사용됩니다.

-- 기존 테이블들 (db_setup_v2.sql에서 가져온 내용)
-- employees, departments 등 기본 테이블은 별도의 초기 setup 스크립트에 이미 있다고 가정합니다.
-- 여기서는 추가되거나 수정된 테이블들만 포함합니다.

-- 1. `system_settings` 테이블
CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` varchar(255) NOT NULL,
  `setting_value` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT '시스템 설정 정보';

-- 초기 설정값 (필요한 경우)
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('payroll_bonus', '100000', '전직원 고정 보너스 금액')
ON DUPLICATE KEY UPDATE setting_value = '100000';

INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('payroll_deductions', '300000', '전직원 고정 공제액')
ON DUPLICATE KEY UPDATE setting_value = '300000';

-- 2. `job_positions` 테이블 (db_setup_v4.sql에서 가져온 내용)
CREATE TABLE IF NOT EXISTS job_positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE COMMENT '직급명',
    `level` INT NOT NULL UNIQUE COMMENT '직급 레벨 (정렬 및 순서용)',
    description TEXT COMMENT '직급 설명',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT '직급 기준 정보';

-- 3. `employee_certifications` 테이블 (db_setup_v3.sql에서 가져온 내용)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT '직원 자격증 정보';

-- 4. `employee_training` 테이블 (db_setup_v3.sql에서 가져온 내용)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT '직원 교육 이수 정보';

-- 5. `employee_awards` 테이블 (db_setup_v3.sql에서 가져온 내용)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT '직원 수상 내역';

-- 6. `employee_projects` 테이블 (db_setup_v3.sql에서 가져온 내용)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT '직원 프로젝트 이력';

-- `employees` 테이블 수정 (직급 컬럼 변경 및 외래 키 추가)
-- 주의: 이 ALTER TABLE 문은 `employees` 테이블이 이미 존재하며,
-- 'pos' 컬럼이 삭제되고 'job_position_id'가 추가되는 것을 가정합니다.
-- 실제 데이터 마이그레이션은 별도의 스크립트(`migrate_positions.js`)로 처리됩니다.
ALTER TABLE `employees`
    ADD COLUMN `job_position_id` INT NULL AFTER `pos`,
    ADD CONSTRAINT `fk_employees_job_position_id` FOREIGN KEY (`job_position_id`) REFERENCES `job_positions` (`id`) ON DELETE SET NULL;

-- 기존 `pos` 컬럼이 더 이상 필요 없다고 가정하고 제거합니다.
-- 실제 운영 환경에서는 데이터 손실 방지를 위해 신중하게 접근해야 합니다.
ALTER TABLE `employees`
    DROP COLUMN `pos`;