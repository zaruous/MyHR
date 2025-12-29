# 데이터베이스 스키마 설명서

이 문서는 NEXUS HRM 시스템에서 사용되는 모든 데이터베이스 테이블의 구조와 목적을 설명합니다.

---

## 1. `employees` 테이블 (직원 기본 정보)

직원들의 기본적인 인적 사항과 시스템 접근에 필요한 정보를 저장합니다.

| 컬럼명           | 타입         | 제약조건              | 설명                                        |
| :--------------- | :----------- | :-------------------- | :------------------------------------------ |
| `id`             | VARCHAR(20)  | PRIMARY KEY           | 사번 (직원 고유 식별자)                   |
| `name`           | VARCHAR(100) | NOT NULL              | 직원 이름                                   |
| `email`          | VARCHAR(255) | NOT NULL, UNIQUE      | 이메일 주소 (로그인 ID 겸용, 중복 불가)     |
| `password`       | VARCHAR(255) | NULL                  | 비밀번호 (bcrypt 해시, 초기값은 NULL)     |
| `job_position_id`| INT          | NULL, FOREIGN KEY     | 직급 ID (job\_positions.id 참조)             |
| `status`         | VARCHAR(50)  | NOT NULL              | 재직 상태 (예: '재직', '휴직', '퇴직')    |
| `role`           | VARCHAR(50)  | NOT NULL              | 사용자 역할 (예: 'admin', 'user')         |
| `dept_id`        | INT          | NULL, FOREIGN KEY     | 부서 ID (departments.id 참조)             |
| `created_at`     | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP | 레코드 생성 시간                           |
| `updated_at`     | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP | 레코드 마지막 업데이트 시간              |

## 2. `departments` 테이블 (부서 정보)

회사의 조직도를 구성하는 부서 정보를 저장합니다. 계층 구조를 지원합니다.

| 컬럼명       | 타입         | 제약조건              | 설명                                        |
| :----------- | :----------- | :-------------------- | :------------------------------------------ |
| `id`         | INT          | PRIMARY KEY, AUTO\_INCREMENT | 부서 고유 ID                                |
| `name`       | VARCHAR(100) | NOT NULL, UNIQUE      | 부서명                                      |
| `parent_id`  | INT          | NULL, FOREIGN KEY     | 상위 부서 ID (departments.id 참조, 최상위는 NULL) |
| `created_at` | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP | 레코드 생성 시간                           |
| `updated_at` | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP | 레코드 마지막 업데이트 시간              |

## 3. `job_positions` 테이블 (직급 기준 정보)

회사의 직급 체계에 대한 기준 정보를 관리합니다.

| 컬럼명        | 타입         | 제약조건              | 설명                                        |
| :------------ | :----------- | :-------------------- | :------------------------------------------ |
| `id`          | INT          | PRIMARY KEY, AUTO\_INCREMENT | 직급 고유 ID                                |
| `name`        | VARCHAR(100) | NOT NULL, UNIQUE      | 직급명 (예: '사원', '대리', '과장')         |
| `level`       | INT          | NOT NULL, UNIQUE      | 직급 레벨 (정렬 및 순서용, 낮을수록 높음)   |
| `description` | TEXT         | NULL                  | 직급에 대한 상세 설명                       |
| `created_at`  | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP | 레코드 생성 시간                           |
| `updated_at`  | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP | 레코드 마지막 업데이트 시간              |

## 4. `salaries` 테이블 (급여 정보)

직원별 연봉 및 급여 지급 관련 정보를 저장합니다.

| 컬럼명           | 타입         | 제약조건              | 설명                                        |
| :--------------- | :----------- | :-------------------- | :------------------------------------------ |
| `id`             | INT          | PRIMARY KEY, AUTO\_INCREMENT | 급여 정보 고유 ID                           |
| `employee_id`    | VARCHAR(20)  | NOT NULL, UNIQUE, FOREIGN KEY | 직원 ID (employees.id 참조)             |
| `base_salary`    | DECIMAL(10,2)| NOT NULL              | 기본 연봉                                   |
| `bank_name`      | VARCHAR(100) | NOT NULL              | 급여 수령 은행명                            |
| `account_number` | VARCHAR(255) | NOT NULL              | 급여 수령 계좌번호                          |
| `created_at`     | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP | 레코드 생성 시간                           |
| `updated_at`     | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP | 레코드 마지막 업데이트 시간              |

## 5. `payroll_history` 테이블 (월별 급여 지급 내역)

매월 직원에게 지급된 급여의 상세 내역을 기록합니다.

| 컬럼명        | 타입         | 제약조건              | 설명                                        |
| :------------ | :----------- | :-------------------- | :------------------------------------------ |
| `id`          | INT          | PRIMARY KEY, AUTO\_INCREMENT | 급여 내역 고유 ID                           |
| `employee_id` | VARCHAR(20)  | NOT NULL, FOREIGN KEY | 직원 ID (employees.id 참조)             |
| `pay_date`    | DATE         | NOT NULL              | 급여 지급일 (월별 기록을 위해 사용)         |
| `base_pay`    | DECIMAL(10,2)| NOT NULL              | 기본 급여 (월 기준)                         |
| `bonus`       | DECIMAL(10,2)| DEFAULT 0.00          | 보너스 금액                                 |
| `deductions`  | DECIMAL(10,2)| DEFAULT 0.00          | 공제액                                      |
| `net_pay`     | DECIMAL(10,2)| NOT NULL              | 실수령액                                    |
| `created_at`  | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP | 레코드 생성 시간                           |
| `updated_at`  | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP | 레코드 마지막 업데이트 시간              |
| `UNIQUE`      |              | `(employee_id, pay_date)` | 특정 직원의 특정 월 급여는 하나만 존재 |

## 6. `attendance` 테이블 (근태 기록)

직원들의 일별 근태 상태를 기록합니다.

| 컬럼명        | 타입         | 제약조건              | 설명                                        |
| :------------ | :----------- | :-------------------- | :------------------------------------------ |
| `id`          | INT          | PRIMARY KEY, AUTO\_INCREMENT | 근태 기록 고유 ID                           |
| `employee_id` | VARCHAR(20)  | NOT NULL, FOREIGN KEY | 직원 ID (employees.id 참조)             |
| `record_date` | DATE         | NOT NULL              | 기록일                                      |
| `status`      | VARCHAR(50)  | NOT NULL              | 근태 상태 (예: '출근', '휴가', '병가', '결근') |
| `created_at`  | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP | 레코드 생성 시간                           |
| `updated_at`  | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP | 레코드 마지막 업데이트 시간              |
| `UNIQUE`      |              | `(employee_id, record_date)` | 특정 직원의 특정일 근태는 하나만 존재 |

## 7. `evaluations` 테이블 (인사 평가 기록)

직원들의 연도별 인사 평가 결과를 기록합니다.

| 컬럼명         | 타입         | 제약조건              | 설명                                        |
| :------------- | :----------- | :-------------------- | :------------------------------------------ |
| `id`           | INT          | PRIMARY KEY, AUTO\_INCREMENT | 평가 기록 고유 ID                           |
| `employee_id`  | VARCHAR(20)  | NOT NULL, FOREIGN KEY | 평가 대상 직원 ID (employees.id 참조)   |
| `evaluator_id` | VARCHAR(20)  | NOT NULL, FOREIGN KEY | 평가자 직원 ID (employees.id 참조)      |
| `evaluation_year` | INT          | NOT NULL              | 평가 연도                                   |
| `rating`       | VARCHAR(10)  | NOT NULL              | 평가 등급 (예: 'S', 'A', 'B', 'C')          |
| `feedback`     | TEXT         | NULL                  | 평가 의견                                   |
| `created_at`   | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP | 레코드 생성 시간                           |
| `updated_at`   | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP | 레코드 마지막 업데이트 시간              |
| `UNIQUE`       |              | `(employee_id, evaluation_year)` | 특정 직원의 특정 연도 평가는 하나만 존재 |

## 8. `system_settings` 테이블 (시스템 설정)

시스템의 다양한 전역 설정값들을 저장합니다.

| 컬럼명        | 타입         | 제약조건      | 설명                                   |
| :------------ | :----------- | :------------ | :------------------------------------- |
| `setting_key` | VARCHAR(255) | PRIMARY KEY   | 설정의 고유 키 (예: `payroll_bonus`)   |
| `setting_value` | VARCHAR(255) | NOT NULL      | 설정 값 (예: `100000`)                 |
| `description` | TEXT         | NULL          | 설정에 대한 상세 설명                  |

## 9. `employee_certifications` 테이블 (직원 자격증 정보)

직원들이 보유한 자격증 정보를 저장합니다.

| 컬럼명        | 타입         | 제약조건              | 설명                                        |
| :------------ | :----------- | :-------------------- | :------------------------------------------ |
| `id`          | INT          | PRIMARY KEY, AUTO\_INCREMENT | 자격증 정보 고유 ID                         |
| `employee_id` | VARCHAR(20)  | NOT NULL, FOREIGN KEY | 직원 ID (employees.id 참조)             |
| `name`        | VARCHAR(255) | NOT NULL              | 자격증명                                    |
| `issuer`      | VARCHAR(255) | NULL                  | 발급기관                                    |
| `issue_date`  | DATE         | NULL                  | 취득일                                      |
| `expiry_date` | DATE         | NULL                  | 만료일                                      |
| `cert_number` | VARCHAR(100) | NULL                  | 자격 번호                                   |
| `created_at`  | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP | 레코드 생성 시간                           |
| `updated_at`  | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP | 레코드 마지막 업데이트 시간              |

## 10. `employee_training` 테이블 (직원 교육 이수 정보)

직원들이 이수한 교육 과정 정보를 저장합니다.

| 컬럼명        | 타입         | 제약조건              | 설명                                        |
| :------------ | :----------- | :-------------------- | :------------------------------------------ |
| `id`          | INT          | PRIMARY KEY, AUTO\_INCREMENT | 교육 이수 정보 고유 ID                      |
| `employee_id` | VARCHAR(20)  | NOT NULL, FOREIGN KEY | 직원 ID (employees.id 참조)             |
| `course_name` | VARCHAR(255) | NOT NULL              | 교육 과정명                                 |
| `institution` | VARCHAR(255) | NULL                  | 교육기관                                    |
| `start_date`  | DATE         | NULL                  | 교육 시작일                                 |
| `end_date`    | DATE         | NULL                  | 교육 종료일                                 |
| `description` | TEXT         | NULL                  | 교육 내용 상세                              |
| `created_at`  | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP | 레코드 생성 시간                           |
| `updated_at`  | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP | 레코드 마지막 업데이트 시간              |

## 11. `employee_awards` 테이블 (직원 수상 내역)

직원들의 수상 경력을 저장합니다.

| 컬럼명        | 타입         | 제약조건              | 설명                                        |
| :------------ | :----------- | :-------------------- | :------------------------------------------ |
| `id`          | INT          | PRIMARY KEY, AUTO\_INCREMENT | 수상 내역 고유 ID                           |
| `employee_id` | VARCHAR(20)  | NOT NULL, FOREIGN KEY | 직원 ID (employees.id 참조)             |
| `award_name`  | VARCHAR(255) | NOT NULL              | 수상명                                      |
| `issuer`      | VARCHAR(255) | NULL                  | 수여기관                                    |
| `award_date`  | DATE         | NULL                  | 수상일                                      |
| `description` | TEXT         | NULL                  | 수상 내용 상세                              |
| `created_at`  | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP | 레코드 생성 시간                           |
| `updated_at`  | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP | 레코드 마지막 업데이트 시간              |

## 12. `employee_projects` 테이블 (직원 프로젝트 이력)

직원들의 참여 프로젝트 이력을 저장합니다.

| 컬럼명        | 타입         | 제약조건              | 설명                                        |
| :------------ | :----------- | :-------------------- | :------------------------------------------ |
| `id`          | INT          | PRIMARY KEY, AUTO\_INCREMENT | 프로젝트 이력 고유 ID                       |
| `employee_id` | VARCHAR(20)  | NOT NULL, FOREIGN KEY | 직원 ID (employees.id 참조)             |
| `project_name`| VARCHAR(255) | NOT NULL              | 프로젝트명                                  |
| `start_date`  | DATE         | NULL                  | 프로젝트 시작일                             |
| `end_date`    | DATE         | NULL                  | 프로젝트 종료일                             |
| `role`        | VARCHAR(100) | NULL                  | 프로젝트 내 담당 역할                       |
| `description` | TEXT         | NULL                  | 프로젝트 내용 및 기여 상세                  |
| `created_at`  | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP | 레코드 생성 시간                           |
| `updated_at`  | TIMESTAMP    | DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP | 레코드 마지막 업데이트 시간              |
