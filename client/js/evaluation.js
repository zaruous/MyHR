/* --- 인사 평가 페이지 함수 --- */
const evalState = {
    currentYear: new Date().getFullYear(),
    evaluations: [],
    selectedRating: null,
};
const ratingColors = {
    'S': 'bg-blue-600 text-white',
    'A': 'bg-green-500 text-white',
    'B': 'bg-yellow-400 text-slate-800',
    'C': 'bg-red-500 text-white',
    '미실시': 'bg-slate-200 text-slate-600'
}

function renderEvaluationPage() {
    const yearSelect = document.getElementById('eval-year-select');
    yearSelect.innerHTML = '';
    // Populate year dropdown
    for (let i = 0; i < 5; i++) {
        const year = new Date().getFullYear() - i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}년`;
        if (year === evalState.currentYear) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }
    
    // Add event listener for year change
    yearSelect.addEventListener('change', () => {
        evalState.currentYear = parseInt(yearSelect.value);
        fetchAndRenderEvaluations();
    });

    fetchAndRenderEvaluations();
}

async function fetchAndRenderEvaluations() {
    const isAdmin = authState.user && authState.user.role === 'admin';
    try {
        const res = await secureFetch(`${API_BASE_URL}/api/evaluations?year=${evalState.currentYear}`);
        if (!res) return;
        if (!res.ok) throw new Error('평가 기록 조회 실패');
        evalState.evaluations = await res.json();
        
        const tableBody = document.getElementById('evaluation-table-body');
        tableBody.innerHTML = '';

        HRM.employees.forEach(emp => {
            const evaluation = evalState.evaluations.find(ev => ev.employee_id === emp.id);
            const rating = evaluation ? evaluation.rating : '미실시';
            const evaluator = evaluation ? evaluation.evaluator_name : '-';
            const ratingColorClass = ratingColors[rating] || 'bg-white';

            let adminButton = '';
            if (isAdmin) {
                 adminButton = `<button onclick='showEvaluationModal(${JSON.stringify(emp).replace(/'/g, "&apos;").replace(/"/g, "&quot;")}, ${evaluation ? JSON.stringify(evaluation).replace(/'/g, "&apos;").replace(/"/g, "&quot;") : null})' 
                                class="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200">
                            ${evaluation ? '수정/조회' : '평가하기'}
                        </button>`;
            }

            tableBody.innerHTML += `
                <tr class="hover:bg-slate-50">
                    <td class="p-3 font-mono text-slate-500">${emp.id}</td>
                    <td class="p-3 font-bold">${emp.name}</td>
                    <td class="p-3">${emp.dept_name}</td>
                    <td class="p-3 text-center">
                        <span class="font-bold rounded-sm px-3 py-1 text-xs ${ratingColorClass}">${rating}</span>
                    </td>
                    <td class="p-3">${evaluator}</td>
                    <td class="p-3">
                        ${adminButton}
                    </td>
                </tr>
            `;
        });

        renderEvaluationSummary();

    } catch (error) {
        showToast(error.message, true);
    }
}

function renderEvaluationSummary() {
    const summaryContainer = document.getElementById('eval-summary');
    const total = HRM.employees.length;
    const evaluated = evalState.evaluations.length;
    const ratingCounts = evalState.evaluations.reduce((acc, ev) => {
        acc[ev.rating] = (acc[ev.rating] || 0) + 1;
        return acc;
    }, {});

    summaryContainer.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-sm text-center">
            <div class="text-2xl font-bold">${total}</div><div class="text-sm text-slate-500">총원</div>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-sm text-center">
            <div class="text-2xl font-bold">${evaluated}</div><div class="text-sm text-slate-500">평가 완료</div>
        </div>
         <div class="bg-white p-4 rounded-lg shadow-sm text-center">
            <div class="text-2xl font-bold text-green-600">${((evaluated / total) * 100 || 0).toFixed(1)}%</div><div class="text-sm text-slate-500">완료율</div>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-sm text-center flex items-center justify-center gap-2">
            ${Object.keys(ratingColors).filter(r => r !== '미실시').map(r => `<div class="font-bold p-1 rounded-sm text-sm ${ratingColors[r]}">${r}: ${ratingCounts[r] || 0}</div>`).join('')}
        </div>
    `;
}

function showEvaluationModal(employee, evaluation) {
    const isAdmin = authState.user && authState.user.role === 'admin';
    if (!isAdmin) {
        showToast('관리자만 평가할 수 있습니다.', true);
        return;
    }
    if (employee.id === authState.user.id) {
        showToast('자기 자신은 평가할 수 없습니다.', true);
        return;
    }
    document.getElementById('eval-employee-id').value = employee.id;
    document.getElementById('eval-year').value = evalState.currentYear;
    document.getElementById('eval-modal-emp-name').innerText = employee.name;
    document.getElementById('eval-modal-emp-info').innerText = `${employee.dept_name} / ${employee.pos}`;
    document.getElementById('eval-feedback').value = evaluation ? evaluation.feedback : '';
    
    evalState.selectedRating = evaluation ? evaluation.rating : null;
    
    document.querySelectorAll('.eval-rating-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        if (btn.dataset.rating === evalState.selectedRating) {
            btn.classList.add('bg-blue-600', 'text-white');
        }
        btn.onclick = () => {
            document.querySelectorAll('.eval-rating-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
            btn.classList.add('bg-blue-600', 'text-white');
            evalState.selectedRating = btn.dataset.rating;
        };
    });
    
    document.getElementById('evaluation-modal').classList.remove('hidden');
}

function hideEvaluationModal() {
    document.getElementById('evaluation-modal').classList.add('hidden');
}

async function saveEvaluation() {
    const evaluationData = {
        employee_id: document.getElementById('eval-employee-id').value,
        evaluation_year: document.getElementById('eval-year').value,
        rating: evalState.selectedRating,
        feedback: document.getElementById('eval-feedback').value,
        evaluator_id: authState.user.id
    };

    if (!evaluationData.rating) {
        showToast('평가 등급을 선택해주세요.', true);
        return;
    }

    try {
        const res = await secureFetch(`${API_BASE_URL}/api/evaluations`, {
            method: 'POST',
            body: JSON.stringify(evaluationData),
        });
        if (!res) return;
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);

        hideEvaluationModal();
        showToast('평가 결과가 저장되었습니다.');
        fetchAndRenderEvaluations(); // 목록 새로고침
    } catch (error) {
        showToast(error.message, true);
    }
}