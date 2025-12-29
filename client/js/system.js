/* --- 시스템 설정 페이지 진입점 --- */
function renderSystemPage() {
    renderSettingOrgTree();
    renderPayrollSettings();
    renderPositions(); // 직급 관리 렌더링 함수 호출
}

/* --- 조직도 관리 함수 --- */
function renderSettingOrgTree() {
    const container = document.getElementById('setting-org-tree');
    const parentSelect = document.getElementById('new-dept-parent');
    if (!container || !parentSelect) return;

    // Clear previous content
    container.innerHTML = '';
    parentSelect.innerHTML = '';

    // Securely build parent select options
    const defaultOption = document.createElement('option');
    defaultOption.value = 'null';
    defaultOption.textContent = '없음 (최상위 부서)';
    parentSelect.appendChild(defaultOption);

    HRM.departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id;
        option.textContent = dept.name; // Securely set text content
        parentSelect.appendChild(option);
    });

    const buildTree = (depts, level) => {
        const treeContainer = document.createElement('div');
        depts.forEach(dept => {
            const children = HRM.departments.filter(d => d.parent_id === dept.id);
            
            const deptElement = document.createElement('div');
            deptElement.className = "p-2 rounded-md hover:bg-slate-50";
            deptElement.style.marginLeft = `${level * 20}px`;

            const contentWrapper = document.createElement('div');
            contentWrapper.className = "flex items-center justify-between";

            const nameSpan = document.createElement('span');
            nameSpan.className = "text-sm font-semibold";
            nameSpan.textContent = dept.name; // Secure

            const controlsDiv = document.createElement('div');
            controlsDiv.className = "flex items-center gap-2";

            const editButton = document.createElement('button');
            editButton.className = "text-xs text-blue-600 hover:underline";
            editButton.textContent = "수정";
            editButton.onclick = () => showEditDeptForm(dept.id, dept.name, dept.parent_id);

            const deleteButton = document.createElement('button');
            deleteButton.className = "text-xs text-red-600 hover:underline";
            deleteButton.textContent = "삭제";
            deleteButton.onclick = () => deleteDepartment(dept.id);
            
            controlsDiv.appendChild(editButton);
            controlsDiv.appendChild(deleteButton);
            
            contentWrapper.appendChild(nameSpan);
            contentWrapper.appendChild(controlsDiv);
            deptElement.appendChild(contentWrapper);

            if (children.length > 0) {
                deptElement.appendChild(buildTree(children, level + 1));
            }
            treeContainer.appendChild(deptElement);
        });
        return treeContainer;
    };

    const topLevelDepts = HRM.departments.filter(d => d.parent_id === null);
    container.appendChild(buildTree(topLevelDepts, 0));
}

async function createDepartment() {
    const name = document.getElementById('new-dept-name').value;
    const parent_id = document.getElementById('new-dept-parent').value;
    if (!name) {
        showToast('부서 이름을 입력해주세요.', true);
        return;
    }
    try {
        const res = await secureFetch(`${API_BASE_URL}/api/departments`, {
            method: 'POST',
            body: JSON.stringify({ name, parent_id: parent_id === 'null' ? null : parent_id }),
        });
        if (!res) return;
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);

        await refreshData();
        showToast('부서가 성공적으로 생성되었습니다.');
        document.getElementById('new-dept-name').value = '';
    } catch (error) {
        showToast(error.message, true);
    }
}

function showEditDeptForm(id, currentName, currentParentId) {
    const modal = document.getElementById('edit-dept-modal');
    document.getElementById('edit-dept-id').value = id;
    document.getElementById('edit-dept-name').value = currentName;
    
    const parentSelect = document.getElementById('edit-dept-parent');
    parentSelect.innerHTML = ''; // Clear previous options

    const defaultOption = document.createElement('option');
    defaultOption.value = 'null';
    defaultOption.textContent = '없음 (최상위 부서)';
    parentSelect.appendChild(defaultOption);

    HRM.departments.forEach(d => {
        if (d.id !== id && !isChildOf(d.id, id)) {
            const option = document.createElement('option');
            option.value = d.id;
            option.textContent = d.name; // Securely set text content
            parentSelect.appendChild(option);
        }
    });

    parentSelect.value = currentParentId === null ? 'null' : currentParentId;
    parentSelect.style.display = 'block';
    document.querySelector('label[for="edit-dept-parent"]').style.display = 'block';

    modal.querySelector('h3').innerText = '부서 정보 수정';
    const saveButton = modal.querySelector('button.bg-blue-600');
    saveButton.innerText = '저장';
    saveButton.onclick = updateDepartment;

    modal.classList.remove('hidden');
}

function hideEditDeptModal() {
    const modal = document.getElementById('edit-dept-modal');
    modal.classList.add('hidden');
}

function isChildOf(childId, parentId) {
    let current = HRM.departments.find(d => d.id === childId);
    while(current) {
        if (current.parent_id === parentId) return true;
        current = HRM.departments.find(d => d.id === current.parent_id);
    }
    return false;
}

async function updateDepartment() {
    const id = document.getElementById('edit-dept-id').value;
    const name = document.getElementById('edit-dept-name').value;
    const parent_id = document.getElementById('edit-dept-parent').value;

    if (!name) {
        showToast('부서 이름을 입력해주세요.', true);
        return;
    }

     try {
        const res = await secureFetch(`${API_BASE_URL}/api/departments/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, parent_id: parent_id === 'null' ? null : parent_id }),
        });
        if (!res) return;
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);

        await refreshData();
        showToast('부서 정보가 수정되었습니다.');
        hideEditDeptModal();
    } catch (error) {
        showToast(error.message, true);
    }
}

async function deleteDepartment(id) {
    if (!confirm('정말로 이 부서를 삭제하시겠습니까? 하위 부서나 소속된 직원이 없어야 삭제 가능합니다.')) return;

    try {
        const res = await secureFetch(`${API_BASE_URL}/api/departments/${id}`, { method: 'DELETE' });
        if (!res) return;
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);

        await refreshData();
        showToast('부서가 삭제되었습니다.');
    } catch (error) {
        showToast(error.message, true);
    }
}

/* --- 급여 설정 관리 함수 --- */
async function renderPayrollSettings() {
    try {
        const res = await secureFetch(`${API_BASE_URL}/api/settings/payroll`);
        if (!res || !res.ok) throw new Error('급여 설정 정보를 불러오는 데 실패했습니다.');
        
        const settings = await res.json();
        
        const bonusInput = document.getElementById('payroll-bonus');
        const deductionsInput = document.getElementById('payroll-deductions');

        if(bonusInput) bonusInput.value = settings.payroll_bonus || '';
        if(deductionsInput) deductionsInput.value = settings.payroll_deductions || '';

    } catch (error) {
        showToast(error.message, true);
    }
}

async function updatePayrollSettings() {
    const bonus = document.getElementById('payroll-bonus').value;
    const deductions = document.getElementById('payroll-deductions').value;

    if (!bonus || !deductions) {
        showToast('모든 필드를 입력해주세요.', true);
        return;
    }

    const settings = { payroll_bonus: bonus, payroll_deductions: deductions };

    try {
        const res = await secureFetch(`${API_BASE_URL}/api/settings/payroll`, {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        if (!res || !res.ok) throw new Error('급여 설정 저장에 실패했습니다.');
        
        const result = await res.json();
        showToast(result.message);
    } catch (error) {
        showToast(error.message, true);
    }
}

/* --- 직급 관리 함수 --- */
async function renderPositions() {
    const container = document.getElementById('positions-list');
    if (!container) return;

    try {
        const res = await secureFetch(`${API_BASE_URL}/api/positions`);
        if (!res || !res.ok) throw new Error('직급 정보 조회 실패');
        const positions = await res.json();

        container.innerHTML = ''; // Clear container before rendering

        const table = document.createElement('table');
        table.className = 'w-full text-sm text-left';

        const thead = document.createElement('thead');
        thead.className = 'bg-slate-50';
        // Table header is static and safe to set with innerHTML
        thead.innerHTML = `
            <tr>
                <th class="p-2">레벨</th>
                <th class="p-2">직급명</th>
                <th class="p-2">설명</th>
                <th class="p-2">관리</th>
            </tr>
        `;

        const tbody = document.createElement('tbody');

        if (positions.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 4;
            td.className = 'p-4 text-center text-slate-500';
            td.textContent = '등록된 직급 정보가 없습니다.';
            tr.appendChild(td);
            tbody.appendChild(tr);
        } else {
            positions.forEach(pos => {
                const tr = document.createElement('tr');
                tr.className = 'border-b';

                const levelCell = document.createElement('td');
                levelCell.className = 'p-2 w-16';
                levelCell.textContent = pos.level;

                const nameCell = document.createElement('td');
                nameCell.className = 'p-2 font-semibold';
                nameCell.textContent = pos.name;

                const descCell = document.createElement('td');
                descCell.className = 'p-2 text-slate-600';
                descCell.textContent = pos.description || '';

                const actionsCell = document.createElement('td');
                actionsCell.className = 'p-2 w-24';

                const editButton = document.createElement('button');
                editButton.className = 'text-xs text-blue-600 hover:underline';
                editButton.textContent = '수정';
                editButton.onclick = () => showEditPositionModal(pos);

                const deleteButton = document.createElement('button');
                deleteButton.className = 'text-xs text-red-600 hover:underline ml-2';
                deleteButton.textContent = '삭제';
                deleteButton.onclick = () => deletePosition(pos.id);

                actionsCell.appendChild(editButton);
                actionsCell.appendChild(deleteButton);

                tr.appendChild(levelCell);
                tr.appendChild(nameCell);
                tr.appendChild(descCell);
                tr.appendChild(actionsCell);

                tbody.appendChild(tr);
            });
        }

        table.appendChild(thead);
        table.appendChild(tbody);
        container.appendChild(table);

    } catch (error) {
        showToast(error.message, true);
    }
}

async function createPosition() {
    const name = document.getElementById('new-pos-name').value;
    const level = document.getElementById('new-pos-level').value;
    const description = document.getElementById('new-pos-desc').value;

    if (!name || !level) {
        showToast('직급명과 레벨을 모두 입력해주세요.', true);
        return;
    }
    try {
        const res = await secureFetch(`${API_BASE_URL}/api/positions`, {
            method: 'POST',
            body: JSON.stringify({ name, level, description }),
        });
        if (!res) return;
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);

        await refreshData();
        showToast('직급이 성공적으로 생성되었습니다.');
        document.getElementById('new-pos-name').value = '';
        document.getElementById('new-pos-level').value = '';
        document.getElementById('new-pos-desc').value = '';
    } catch (error) {
        showToast(error.message, true);
    }
}

function showEditPositionModal(position) {
    const modal = document.getElementById('edit-dept-modal'); // 부서 수정 모달 재활용
    modal.querySelector('h3').innerText = '직급 정보 수정';
    
    document.getElementById('edit-dept-id').value = position.id; // id 필드 재활용
    document.getElementById('edit-dept-name').value = position.name; // name 필드 재활용
    
    const parentSelectLabel = document.querySelector('label[for="edit-dept-parent"]');
    const parentSelect = document.getElementById('edit-dept-parent');
    parentSelectLabel.innerText = '직급 레벨'; // 라벨 변경
    
    // 기존 select를 number input으로 임시 교체
    const levelInput = document.createElement('input');
    levelInput.type = 'number';
    levelInput.id = 'edit-dept-parent'; // id 유지
    levelInput.className = 'w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500';
    levelInput.value = position.level;
    parentSelect.replaceWith(levelInput);

    const saveButton = modal.querySelector('button.bg-blue-600');
    saveButton.innerText = '저장';
    saveButton.onclick = updatePosition;

    modal.classList.remove('hidden');
}

function hideEditPositionModal() {
    const modal = document.getElementById('edit-dept-modal');
    modal.classList.add('hidden');
    // 모달을 원래 부서 수정용으로 복구
    modal.querySelector('h3').innerText = '부서 정보 수정';
    const levelInput = document.getElementById('edit-dept-parent');
    const parentSelect = document.createElement('select');
    parentSelect.id = 'edit-dept-parent';
    parentSelect.className = 'w-full border rounded-md px-3 py-2 text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500';
    levelInput.replaceWith(parentSelect);
    document.querySelector('label[for="edit-dept-parent"]').innerText = '상위 부서';
    modal.querySelector('button.bg-blue-600').onclick = updateDepartment;
}

async function updatePosition() {
    const id = document.getElementById('edit-dept-id').value;
    const name = document.getElementById('edit-dept-name').value;
    const level = document.getElementById('edit-dept-parent').value; // id가 재활용된 level input

    if (!name || !level) {
        showToast('직급명과 레벨을 입력해주세요.', true);
        return;
    }

    try {
        const res = await secureFetch(`${API_BASE_URL}/api/positions/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, level }),
        });
        if (!res) return;
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);

        await refreshData();
        showToast('직급 정보가 수정되었습니다.');
        hideEditPositionModal();
    } catch (error) {
        showToast(error.message, true);
    }
}

async function deletePosition(id) {
    if (!confirm('정말로 이 직급을 삭제하시겠습니까?')) return;

    try {
        const res = await secureFetch(`${API_BASE_URL}/api/positions/${id}`, { method: 'DELETE' });
        if (!res) return;
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);

        await refreshData();
        showToast('직급이 삭제되었습니다.');
    } catch (error) {
        showToast(error.message, true);
    }
}