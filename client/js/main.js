const API_BASE_URL = 'http://localhost:3000';

// 전역 상태 객체
const HRM = {
    employees: [],
    departments: [],
    currentFilter: '전체',
    currentDeptId: null,
    currentPage: 'hr', // 현재 페이지 추적
};
const authState = {
    token: null,
    user: null,
};

// 인증 토큰을 포함하는 fetch 래퍼 함수
async function secureFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (authState.token) {
        headers['Authorization'] = `Bearer ${authState.token}`;
    }

    const res = await fetch(url, { ...options, headers });


    if (res.status === 401 || res.status === 403) {
        alert(` ${res.message }  ${res.code}`  ) ;

        logout(); // 토큰이 유효하지 않으면 로그아웃 처리
        return;
    }
    return res;
}

// 데이터 새로고침
async function refreshData() {
    try {
        const [empRes, deptRes] = await Promise.all([
            secureFetch(`${API_BASE_URL}/api/employees`),
            secureFetch(`${API_BASE_URL}/api/departments`)
        ]);

        if (!empRes || !deptRes) return;

        if (!empRes.ok || !deptRes.ok) {
            throw new Error('데이터를 불러오는 데 실패했습니다.');
        }

        HRM.employees = await empRes.json();
        HRM.departments = await deptRes.json();
        
        HRM.employees.forEach(emp => {
            const dept = HRM.departments.find(d => d.id === emp.dept_id);
            emp.dept_name = dept ? dept.name : '미배정';
        });
        
        renderOrgTree();
    } catch (error) {
        console.error("Data Refresh Error:", error);
        showToast(error.message, true);
    }
}

// 애플리케이션 초기화
async function initializeApplication() {
    updateUserInfo();
    await refreshData();
    await switchPage('hr'); // 데이터 로드 후 첫 페이지 표시
}

window.onload = checkForToken;

// 페이지 전환 (HTML 동적 로드)
async function switchPage(pageId) {
    // 같은 페이지를 다시 클릭하면 리로드하지 않음 (단, main-content가 비어있으면 로드)
    if (HRM.currentPage === pageId && document.getElementById('main-content').innerHTML.trim() !== '') {
        renderCurrentPage(); // 내용이 있더라도 현재 상태를 다시 렌더링해야 할 수 있음
        return;
    }
    HRM.currentPage = pageId;

    // 네비게이션 UI 업데이트
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
    });
    document.getElementById('nav-' + pageId)?.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');

    const mainContent = document.getElementById('main-content');
    try {
        const response = await fetch(`pages/${pageId}.html`);
        if (!response.ok) {
            mainContent.innerHTML = `<div class="p-8 text-center text-red-500">오류: 페이지를 불러올 수 없습니다.</div>`;
            return;
        }
        mainContent.innerHTML = await response.text();
        renderCurrentPage();
    } catch (error) {
        console.error('Page loading error:', error);
        mainContent.innerHTML = `<div class="p-8 text-center text-red-500">오류: 페이지 로딩 중 문제가 발생했습니다.</div>`;
    }
}

// 현재 페이지에 따라 적절한 렌더링 함수 호출
function renderCurrentPage() {
    switch (HRM.currentPage) {
        case 'hr':
            renderHrPage();
            break;
        case 'payroll':
            renderPayrollPage();
            break;
        case 'attendance':
            renderAttendancePage();
            break;
        case 'eval':
            renderEvaluationPage();
            break;
        case 'system':
            renderSettingOrgTree();
            renderPayrollSettings();
            break;
    }
}

// 'hr' 페이지 렌더링
function renderHrPage() {
    const isAdmin = authState.user && authState.user.role === 'admin';
    const addEmployeeBtn = document.getElementById('add-employee-btn');

    if (addEmployeeBtn) {
        if (isAdmin) {
            addEmployeeBtn.style.display = 'block';
            addEmployeeBtn.addEventListener('click', showNewEmployeeForm);
        } else {
            addEmployeeBtn.style.display = 'none';
        }
    }

    if (document.getElementById('employee-list')) {
        filterByDept(HRM.currentFilter, HRM.currentDeptId);
    }
}

// 조직도 클릭 핸들러
async function handleDeptClick(deptName, deptId, event) {
    if (event) {
        document.querySelectorAll('.dept-item').forEach(el => el.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }

    HRM.currentFilter = deptName;
    HRM.currentDeptId = deptId;
    
    await switchPage('hr');
}

// 조직도 렌더링 함수
function renderOrgTree() {
    const container = document.getElementById('dynamic-org-tree');
    const companyContainer = document.querySelector('.dept-item');
    if (!container || !companyContainer) return;
    
    // "(주) 넥서스 솔루션" 클릭 이벤트 설정
    companyContainer.setAttribute('onclick', "handleDeptClick('전체', null, event)");

    container.innerHTML = '';
    const topLevelDepts = HRM.departments.filter(d => d.parent_id === null);

    const buildTree = (depts, level) => {
        let html = '<div>';
        depts.forEach(dept => {
            const children = HRM.departments.filter(d => d.parent_id === dept.id);
            const teamClass = level > 0 ? 'text-xs text-slate-600' : 'text-sm font-semibold text-slate-700';
            const icon = level > 0 ? '' : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-300"><path d="m9 18 6-6-6-6"/></svg>`;
            
            let itemHTML;
            if (level > 0) {
                 itemHTML = `
                    <div onclick="handleDeptClick('${dept.name}', ${dept.id}, event)" class="dept-item p-1.5 hover:text-blue-600 cursor-pointer ${teamClass}" style="padding-left: ${level * 12}px;">
                        └ ${dept.name}
                    </div>
                `;
            } else {
                 itemHTML = `
                    <div onclick="handleDeptClick('${dept.name}', ${dept.id}, event)" class="dept-item flex items-center gap-2 p-2 hover:bg-slate-50 rounded group cursor-pointer">
                        ${icon}
                        <span class="${teamClass}">${dept.name}</span>
                    </div>
                `;
            }
            
            html += `
                <div>
                    ${itemHTML}
                    ${children.length > 0 ? buildTree(children, level + 1) : ''}
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    container.innerHTML = buildTree(topLevelDepts, 0);
}

// 하위 부서 ID를 재귀적으로 찾는 함수
function getSubDeptIds(parentId) {
    let subDepts = HRM.departments.filter(d => d.parent_id === parentId);
    let ids = subDepts.map(d => d.id);
    subDepts.forEach(d => {
        ids = ids.concat(getSubDeptIds(d.id));
    });
    return ids;
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if(!toast) return;
    toast.innerText = message;
    toast.className = `fixed bottom-10 left-1/2 -translate-x-1/2 text-white px-6 py-3 rounded-full text-sm font-medium shadow-2xl transition-all duration-300 pointer-events-none z-50 ${isError ? 'bg-red-600' : 'bg-slate-800'}`;
    toast.classList.remove('opacity-0');
    
    setTimeout(() => {
        toast.classList.add('opacity-0');
    }, 2500);
}