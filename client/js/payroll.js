/* --- 급여 관리 페이지 함수 --- */
async function renderPayrollPage() {
    const isAdmin = authState.user && authState.user.role === 'admin';

    // 관리자가 아니면 급여대장 생성 버튼 숨기기
    const runPayrollBtn = document.querySelector('button[onclick="runPayroll()"]');
    if (runPayrollBtn && !isAdmin) {
        runPayrollBtn.style.display = 'none';
    }

    try {
        const res = await secureFetch(`${API_BASE_URL}/api/salaries`);
        if (!res) return;
        if (!res.ok) throw new Error('급여 정보 조회에 실패했습니다.');
        const salaries = await res.json();
        
        const tableBody = document.getElementById('salary-info-table');
        tableBody.innerHTML = '';
        salaries.forEach(s => {
            const adminButton = isAdmin ? `<button onclick='showEditSalaryModal(${JSON.stringify(s).replace(/'/g, "&apos;").replace(/"/g, "&quot;")})' class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200">수정</button>` : '';
            tableBody.innerHTML += `
                <tr class="hover:bg-slate-50">
                    <td class="p-3 font-mono text-slate-500">${s.id}</td>
                    <td class="p-3 font-bold">${s.name}</td>
                    <td class="p-3">${s.dept_name}</td>
                    <td class="p-3 text-right">${(s.base_salary || 0).toLocaleString()} 원</td>
                    <td class="p-3">${s.bank_name || ''}</td>
                    <td class="p-3">${s.account_number || ''}</td>
                    <td class="p-3">
                        ${adminButton}
                    </td>
                </tr>
            `;
        });
        populateDateSelectors();
    } catch (error) {
        showToast(error.message, true);
    }
}

function populateDateSelectors() {
    const yearSelect = document.getElementById('payroll-year');
    const monthSelect = document.getElementById('payroll-month');
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    yearSelect.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const year = currentYear - i;
        yearSelect.innerHTML += `<option value="${year}" ${i===0 ? 'selected' : ''}>${year}년</option>`;
    }
    monthSelect.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        monthSelect.innerHTML += `<option value="${i}" ${i===currentMonth ? 'selected' : ''}>${i}월</option>`;
    }
}

function showEditSalaryModal(salaryInfo) {
    const isAdmin = authState.user && authState.user.role === 'admin';
    document.getElementById('edit-salary-emp-id').value = salaryInfo.id;
    document.getElementById('edit-salary-emp-name').innerText = `${salaryInfo.name} (${salaryInfo.id})`;
    
    const baseSalaryInput = document.getElementById('edit-salary-base');
    const bankInput = document.getElementById('edit-salary-bank');
    const accountInput = document.getElementById('edit-salary-account');
    const saveButton = document.querySelector('#salary-edit-modal button[onclick="updateSalary()"]');

    baseSalaryInput.value = salaryInfo.base_salary;
    bankInput.value = salaryInfo.bank_name;
    accountInput.value = salaryInfo.account_number;

    baseSalaryInput.readOnly = !isAdmin;
    bankInput.readOnly = !isAdmin;
    accountInput.readOnly = !isAdmin;

    if(saveButton){
        saveButton.style.display = isAdmin ? 'block' : 'none';
    }

    document.getElementById('salary-edit-modal').classList.remove('hidden');
}

function hideEditSalaryModal() {
    document.getElementById('salary-edit-modal').classList.add('hidden');
}

async function updateSalary() {
    const isAdmin = authState.user && authState.user.role === 'admin';
    if (!isAdmin) {
        showToast('권한이 없습니다.', true);
        return;
    }
    const employee_id = document.getElementById('edit-salary-emp-id').value;
    const updatedData = {
        base_salary: document.getElementById('edit-salary-base').value,
        bank_name: document.getElementById('edit-salary-bank').value,
        account_number: document.getElementById('edit-salary-account').value,
    };

    try {
        const res = await secureFetch(`${API_BASE_URL}/api/salaries/${employee_id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedData)
        });
        if (!res) return;
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);

        await renderPayrollPage(); // 급여 정보 테이블 새로고침
        hideEditSalaryModal();
        showToast('급여 정보가 성공적으로 수정되었습니다.');
    } catch (error) {
        showToast(error.message, true);
    }
}

async function viewPayrollHistory() {
    const year = document.getElementById('payroll-year').value;
    const month = document.getElementById('payroll-month').value;
    
    try {
        const res = await secureFetch(`${API_BASE_URL}/api/payroll/history?year=${year}&month=${month}`);
        if (!res) return;
        if (!res.ok) throw new Error('급여 기록 조회에 실패했습니다.');
        const history = await res.json();

        const tableBody = document.getElementById('payroll-history-table');
        tableBody.innerHTML = '';
        if (history.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-slate-400">${year}년 ${month}월의 급여 데이터가 없습니다.</td></tr>`;
            return;
        }
        history.forEach(h => {
             tableBody.innerHTML += `
                <tr class="hover:bg-slate-50">
                    <td class="p-3 font-mono text-slate-500">${h.employee_id}</td>
                    <td class="p-3 font-bold">${h.name}</td>
                    <td class="p-3">${new Date(h.pay_date).toLocaleDateString()}</td>
                    <td class="p-3 text-right">${Math.round(h.base_pay).toLocaleString()} 원</td>
                    <td class="p-3 text-right">${Math.round(h.bonus).toLocaleString()} 원</td>
                    <td class="p-3 text-right text-red-600">${Math.round(h.deductions).toLocaleString()} 원</td>
                    <td class="p-3 text-right font-bold text-blue-600">${Math.round(h.net_pay).toLocaleString()} 원</td>
                </tr>
            `;
        });
    } catch (error) {
        showToast(error.message, true);
    }
}

async function runPayroll() {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    if (!confirm(`${year}년 ${month}월의 급여 대장을 생성하시겠습니까? 이미 생성된 경우 중복 실행되지 않습니다.`)) return;

    try {
         const res = await secureFetch(`${API_BASE_URL}/api/payroll/run`, {
            method: 'POST',
            body: JSON.stringify({ year, month })
        });
        if (!res) return;
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);
        
        showToast(result.message);
        // 생성 후 현재 선택된 날짜로 조회
        const selectedYear = document.getElementById('payroll-year').value;
        const selectedMonth = document.getElementById('payroll-month').value;
        if(Number(selectedYear) === year && Number(selectedMonth) === month) {
            await viewPayrollHistory();
        }
    } catch (error) {
        showToast(error.message, true);
    }
}