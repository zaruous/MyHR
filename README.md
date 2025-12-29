# NEXUS HRM - 통합 인사정보 시스템
* 본 코드는 AI 기반으로 만들어지고 있습니다.


NEXUS HRM은 현대적인 기업 환경에 필요한 다양한 인사 관리 기능을 제공하는 웹 기반 통합 인사정보 시스템입니다. 이 시스템은 직원 정보 관리, 조직도, 급여, 근태 등 핵심적인 HR 업무를 효율적으로 처리할 수 있도록 설계되었습니다.

## ✨ 주요 기능

*   **인사 관리**: 사원 정보의 등록, 조회, 수정 및 삭제.
*   **조직도**: 동적으로 생성되는 조직도 및 부서별 직원 필터링.
*   **급여 관리**: 직원별 급여 정보 관리 및 월별 급여 대장 생성.
*   **근태 관리**: 일별 근태 현황(출근, 휴가, 병가 등) 관리.
*   **평가 관리**: 연도별 인사 평가 기록 및 관리.
*   **경력 관리**: 직원의 자격증, 교육, 수상, 프로젝트 이력 관리.
*   **보안**: JWT 기반의 안전한 인증 시스템 및 역할(Admin/User) 기반의 접근 제어.

## 🛠️ 기술 스택

### Backend

*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: MariaDB (or MySQL)
*   **Authentication**: JSON Web Token (JWT)
*   **Dependencies**: `mysql2`, `bcrypt`, `cors`, `dotenv`, `jsonwebtoken`

### Client

*   **Core**: HTML5, CSS3, JavaScript (ES6+)
*   **Styling**: Tailwind CSS
*   **Architecture**: API 통신을 통한 동적 페이지 렌더링 (SPA-like)

## 📂 프로젝트 구조

```
HR/
├── backend/        # Node.js 백엔드 서버 (API, 데이터베이스 로직)
├── client/         # 프론트엔드 (HTML, CSS, JavaScript)
├── .gitignore
├── .env_setup_guide.md # .env 파일 설정 상세 가이드
└── README.md       # 현재 파일
```

*   **`backend/`**: 모든 서버 측 로직과 API 엔드포인트, 데이터베이스 상호작용 코드가 포함되어 있습니다.
*   **`client/`**: 사용자가 직접 상호작용하는 UI(사용자 인터페이스) 관련 파일들이 포함되어 있습니다.

## 🚀 설치 및 실행 가이드

### 사전 준비

*   **Node.js**: v18.x 이상
*   **npm**: Node.js 설치 시 함께 설치됨
*   **MariaDB** 또는 **MySQL**: 데이터베이스 서버

### 1. 백엔드(Backend) 설정

1.  **백엔드 디렉토리로 이동**:
    ```sh
    cd backend
    ```

2.  **환경 변수 설정**:
    `backend` 디렉토리 안에 `.env` 파일을 생성합니다. 프로젝트 루트에 있는 `.env_setup_guide.md` 문서를 참고하여 필요한 모든 환경 변수(데이터베이스 접속 정보, JWT 비밀 키 등)를 설정하세요.

3.  **NPM 패키지 설치**:
    ```sh
    npm install
    ```

4.  **데이터베이스 초기화**:
    아래 명령어를 실행하여 `hr` 데이터베이스와 모든 테이블을 생성하고 초기 데이터를 삽입합니다.
    **⚠️ 주의: 이 명령어는 기존의 `hr` 데이터베이스를 삭제하고 다시 생성하므로, 기존 데이터가 모두 사라집니다.**
    ```sh
    npm run db:setup
    ```

5.  **백엔드 서버 실행**:
    개발 모드(nodemon)로 서버를 시작합니다. 코드가 변경될 때마다 서버가 자동으로 재시작됩니다.
    ```sh
    npm start
    ```
    서버가 정상적으로 실행되면 터미널에 `서버가 http://localhost:3000 에서 실행 중입니다.` 메시지가 나타납니다.

### 2. 클라이언트(Client) 설정

1.  **별도의 터미널을 열고 `client` 디렉토리로 이동**합니다.

2.  **Live Server 실행**:
    프론트엔드 파일들은 정적 파일이므로 별도의 빌드 과정이 필요 없습니다. 하지만 API 요청 시 CORS(Cross-Origin Resource Sharing) 문제를 피하기 위해 웹 서버 환경에서 실행해야 합니다.

    Visual Studio Code의 **[Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)** 확장 프로그램을 사용하는 것을 권장합니다.

    *   VS Code에서 `client` 폴더를 엽니다.
    *   `index.html` 파일을 우클릭하고 "Open with Live Server"를 선택합니다.
    *   브라우저에서 `http://127.0.0.1:5500/client/index.html` (포트 번호는 다를 수 있음)와 같은 주소로 애플리케이션이 열립니다.

## 💻 사용법

*   **로그인**: 애플리케이션이 실행되면 먼저 로그인 화면이 나타납니다.
*   **관리자 계정**:
    *   **사번**: `20220311` (인사팀 박지민 팀장)
    *   **초기 비밀번호**: 최초 로그인 시에는 비밀번호가 설정되어 있지 않습니다. 아무 값이나 입력하면 비밀번호 설정 화면으로 안내됩니다.
*   **사원 정보 수정**: 관리자 계정으로 로그인한 후, 인사관리 메뉴에서 사원을 선택하면 상세 정보 화면에 '정보 수정하기' 버튼이 나타납니다.
