// 부서 필터링 및 테이블 렌더링 함수
function filterByDept(deptName, deptId = null) {
    // 검색 조건 표시 업데이트
    if (document.getElementById('dept-display')) {
        document.getElementById('dept-display').value = deptName;
        document.getElementById('result-count').innerText = deptName;
    }

    let filtered = [];
    if (deptName === '전체' || deptId === null) {
        filtered = HRM.employees;
    } else {
        // 부서 및 하위 부서 ID 목록을 찾는다
        const subDeptIds = getSubDeptIds(deptId);
        const allDeptIds = [deptId, ...subDeptIds];
        filtered = HRM.employees.filter(emp => allDeptIds.includes(emp.dept_id));
    }

    renderTable(filtered);
}

// 사원 검색 함수
async function searchEmployees() {
    const searchInput = document.getElementById('search-input').value;
    const statusInput = document.getElementById('search-status').value;

    const params = new URLSearchParams();
    if (searchInput) {
        params.append('search', searchInput);
    }
    if (statusInput) {
        params.append('status', statusInput);
    }

    try {
        const res = await secureFetch(`${API_BASE_URL}/api/employees?${params.toString()}`);
        if (!res) return;
        if (!res.ok) {
            throw new Error('검색 결과를 불러오는 데 실패했습니다.');
        }
        const data = await res.json();
        renderTable(data);
        document.getElementById('result-count').innerText = `검색 결과: ${data.length}건`;
        // 검색 후 부서 선택은 '전체'로 초기화
        document.getElementById('dept-display').value = '전체';
         document.querySelectorAll('.dept-item').forEach(el => el.classList.remove('active'));
        document.querySelector('.dept-item').classList.add('active');


    } catch (error) {
        console.error("Search Error:", error);
        showToast(error.message, true);
    }
}

// 신규 사원 등록 폼 표시
function showNewEmployeeForm() {
    const detailView = document.getElementById('detail-view');
    
    // 부서 선택 <select> 옵션을 동적으로 생성
    const deptOptions = HRM.departments
        .map(d => `<option value="${d.id}">${d.name}</option>`)
        .join('');

    detailView.innerHTML = `
        <div class="space-y-4 animate-in fade-in duration-300">
            <h3 class="text-xl font-bold text-slate-800 border-b pb-2">신규 사원 등록</h3>
            <div class="grid grid-cols-1 gap-4 text-sm">
                <div><label class="block text-xs font-bold text-slate-500 mb-1">사번</label><input type="text" id="new-emp-id" class="w-full border rounded px-2 py-1.5"></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">성명</label><input type="text" id="new-emp-name" class="w-full border rounded px-2 py-1.5"></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">이메일</label><input type="email" id="new-emp-email" class="w-full border rounded px-2 py-1.5"></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">직위</label><input type="text" id="new-emp-pos" class="w-full border rounded px-2 py-1.5"></div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">소속 부서</label>
                    <select id="new-emp-dept" class="w-full border rounded px-2 py-1.5 bg-white">${deptOptions}</select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">재직 상태</label>
                    <select id="new-emp-status" class="w-full border rounded px-2 py-1.5 bg-white">
                        <option>재직</option>
                        <option>휴직</option>
                        <option>퇴직</option>
                    </select>
                </div>
            </div>
            <button onclick="createNewEmployee()" class="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-all">사원 등록하기</button>
        </div>
    `;
}

// 신규 사원 생성 (API 호출)
async function createNewEmployee() {
    const newEmployee = {
        id: document.getElementById('new-emp-id').value,
        name: document.getElementById('new-emp-name').value,
        email: document.getElementById('new-emp-email').value,
        pos: document.getElementById('new-emp-pos').value,
        dept_id: parseInt(document.getElementById('new-emp-dept').value),
        status: document.getElementById('new-emp-status').value,
    };

    if (!newEmployee.id || !newEmployee.name || !newEmployee.email || !newEmployee.dept_id) {
        showToast('사번, 성명, 이메일, 부서는 필수 입력 항목입니다.', true);
        return;
    }

    try {
        const res = await secureFetch(`${API_BASE_URL}/api/employees`, {
            method: 'POST',
            body: JSON.stringify(newEmployee),
        });
        if (!res) return;
        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.message || '사원 등록에 실패했습니다.');
        }
        
        await refreshData();
        showDetail(result);
        showToast('신규 사원이 성공적으로 등록되었습니다.');

    } catch (error) {
        console.error("Create Employee Error:", error);
        showToast(error.message, true);
    }
}

// 테이블 렌더링 함수
function renderTable(data) {
    const tbody = document.getElementById('employee-list');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-slate-400">해당 조건에 맞는 사원이 없습니다.</td></tr>`;
        return;
    }

    data.forEach(emp => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-blue-50 cursor-pointer transition-colors";
        tr.onclick = () => showDetail(emp, tr);
        
        tr.innerHTML = `
            <td class="py-3 px-4 text-center border-r"><input type="checkbox"></td>
            <td class="py-3 px-4 border-r font-mono text-slate-500">${emp.id}</td>
            <td class="py-3 px-4 border-r font-bold text-slate-800">${emp.name}</td>
            <td class="py-3 px-4 border-r text-slate-600">${emp.dept_name}</td>
            <td class="py-3 px-4 border-r text-slate-600">${emp.pos}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-1 ${emp.status === '재직' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'} rounded-full text-[10px] font-bold">
                    ${emp.status}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 상세 정보 표시
function showDetail(emp, rowEl) {
    if (rowEl) {
        document.querySelectorAll('#employee-list tr').forEach(r => r.classList.remove('bg-blue-50'));
        rowEl.classList.add('bg-blue-50');
    }

    const detailView = document.getElementById('detail-view');
    const isAdmin = authState.user && authState.user.role === 'admin';

    let adminButton = '';
    if (isAdmin) {
        adminButton = `<button onclick='showEditEmployeeForm(${JSON.stringify(emp).replace(/'/g, "&apos;").replace(/"/g, "&quot;")})' class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">정보 수정하기</button>`;
    }

    detailView.innerHTML = `
        <div class="space-y-6 animate-in fade-in duration-300">
            <div class="flex flex-col items-center gap-3 pb-6 border-b">
                <div class="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm font-bold text-2xl text-slate-300">
                    ${emp.name.charAt(0)}
                </div>
                <div class="text-center">
                    <h3 class="text-xl font-bold">${emp.name}</h3>
                    <p class="text-sm text-slate-500">${emp.dept_name} / ${emp.pos}</p>
                </div>
            </div>
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <span class="text-slate-400">사번</span><span class="font-mono font-bold">${emp.id}</span>
                    <span class="text-slate-400">이메일</span><span class="text-blue-600 underline text-xs">${emp.email}</span>
                    <span class="text-slate-400">입사구분</span><span>경력채용</span>
                    <span class="text-slate-400">최종학력</span><span>대학교(졸업)</span>
                </div>
            </div>
            ${adminButton}
        </div>
    `;
}

function showEditEmployeeForm(emp) {
    const detailView = document.getElementById('detail-view');
    const isAdmin = authState.user && authState.user.role === 'admin';
    
    const deptOptions = HRM.departments.map(d => 
        `<option value="${d.id}" ${d.id === emp.dept_id ? 'selected' : ''}>${d.name}</option>`
    ).join('');

    const statusOptions = ['재직', '휴직', '퇴직'].map(s => 
        `<option value="${s}" ${s === emp.status ? 'selected' : ''}>${s}</option>`
    ).join('');

    let adminButtons = '';
    if (isAdmin) {
        adminButtons = `
            <div class="grid grid-cols-2 gap-2">
                <button onclick="updateEmployee('${emp.id}')" class="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-all">정보 저장하기</button>
                <button onclick="deleteEmployee('${emp.id}')" class="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-all">삭제하기</button>
            </div>
        `;
    }

    detailView.innerHTML = `
        <div class="space-y-4 animate-in fade-in duration-300">
            <h3 class="text-xl font-bold text-slate-800 border-b pb-2">사원 정보 수정</h3>
            <div class="grid grid-cols-1 gap-4 text-sm">
                <div><label class="block text-xs font-bold text-slate-500 mb-1">사번</label><input type="text" id="edit-emp-id" class="w-full border rounded px-2 py-1.5 bg-slate-100" value="${emp.id}" readonly></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">성명</label><input type="text" id="edit-emp-name" class="w-full border rounded px-2 py-1.5" value="${emp.name}" ${!isAdmin ? 'readonly' : ''}></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">이메일</label><input type="email" id="edit-emp-email" class="w-full border rounded px-2 py-1.5" value="${emp.email}" ${!isAdmin ? 'readonly' : ''}></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">직위</label><input type="text" id="edit-emp-pos" class="w-full border rounded px-2 py-1.5" value="${emp.pos}" ${!isAdmin ? 'readonly' : ''}></div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">소속 부서</label>
                    <select id="edit-emp-dept" class="w-full border rounded px-2 py-1.5 bg-white" ${!isAdmin ? 'disabled' : ''}>${deptOptions}</select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">재직 상태</label>
                    <select id="edit-emp-status" class="w-full border rounded px-2 py-1.5 bg-white" ${!isAdmin ? 'disabled' : ''}>${statusOptions}</select>
                </div>
            </div>
            ${adminButtons}
        </div>
    `;
}

async function updateEmployee(id) {
    const updatedData = {
        name: document.getElementById('edit-emp-name').value,
        email: document.getElementById('edit-emp-email').value,
        pos: document.getElementById('edit-emp-pos').value,
        dept_id: parseInt(document.getElementById('edit-emp-dept').value),
        status: document.getElementById('edit-emp-status').value,
    };

     if (!updatedData.name || !updatedData.email || !updatedData.dept_id) {
        showToast('이름, 이메일, 부서는 필수 입력 항목입니다.', true);
        return;
    }

    try {
        const res = await secureFetch(`${API_BASE_URL}/api/employees/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedData),
        });
        if (!res) return;
        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.message || '사원 정보 수정에 실패했습니다.');
        }
        
        await refreshData();
        showDetail(result);
        showToast('사원 정보가 성공적으로 수정되었습니다.');

    } catch (error) {
        console.error("Update Employee Error:", error);
        showToast(error.message, true);
    }
}

async function deleteEmployee(id) {
    if (!confirm('정말로 이 사원의 정보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        return;
    }

    try {
        const res = await secureFetch(`${API_BASE_URL}/api/employees/${id}`, {
            method: 'DELETE',
        });
        if (!res) return;
        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.message || '사원 정보 삭제에 실패했습니다.');
        }
        
        await refreshData();
        
        // 상세 뷰 초기화
        document.getElementById('detail-view').innerHTML = `
            <div class="text-center py-10 text-slate-400">
                <p>사원을 선택하면 상세 정보가 표시됩니다.</p>
            </div>`;

        showToast('사원 정보가 성공적으로 삭제되었습니다.');

    } catch (error) {
        console.error("Delete Employee Error:", error);
        showToast(error.message, true);
    }
}