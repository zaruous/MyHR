/* --- 근태 관리 페이지 함수 --- */
const attendanceState = {
    currentDate: new Date(),
    monthlyData: [],
};
const attendanceStatusMap = {
    '출근': 'bg-green-100 text-green-700',
    '오전반차': 'bg-yellow-100 text-yellow-700',
    '오후반차': 'bg-yellow-100 text-yellow-700',
    '휴가': 'bg-blue-100 text-blue-700',
    '병가': 'bg-orange-100 text-orange-700',
    '결근': 'bg-red-100 text-red-700',
};
const statusOptions = Object.keys(attendanceStatusMap);


function renderAttendancePage() {
    // 이전/다음 달 버튼 이벤트 리스너 추가
    document.getElementById('prev-month-btn').addEventListener('click', () => {
        attendanceState.currentDate.setMonth(attendanceState.currentDate.getMonth() - 1);
        fetchAndRenderCalendar();
    });

    document.getElementById('next-month-btn').addEventListener('click', () => {
        attendanceState.currentDate.setMonth(attendanceState.currentDate.getMonth() + 1);
        fetchAndRenderCalendar();
    });
    
    fetchAndRenderCalendar();
}

async function fetchAndRenderCalendar() {
    const calendarTitle = document.getElementById('calendar-title');
    const dailyDetailView = document.getElementById('daily-detail-view');

    // DOM 요소가 아직 로드되지 않았을 경우를 대비한 가드 구문
    if (!calendarTitle || !dailyDetailView) {
        // console.warn('Attendance page elements not ready yet.');
        return;
    }

    const year = attendanceState.currentDate.getFullYear();
    const month = attendanceState.currentDate.getMonth() + 1;
    calendarTitle.innerText = `${year}년 ${month}월`;
    dailyDetailView.classList.add('hidden');

    try {
        const res = await secureFetch(`${API_BASE_URL}/api/attendance?year=${year}&month=${month}`);
        if(!res) return;
        if(!res.ok) throw new Error('데이터 로딩 실패');
        attendanceState.monthlyData = await res.json();
        renderCalendar(year, month);
    } catch (error) {
        showToast(error.message, true);
    }
}

function renderCalendar(year, month) {
    const grid = document.getElementById('calendar-grid');
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    let cells = [];

    // Add empty cells for days before the 1st
    for (let i = 0; i < firstDay; i++) {
        cells.push('<div class="bg-slate-50"></div>');
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        // Use string comparison to avoid timezone issues
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const recordsForDay = attendanceState.monthlyData.filter(r => r.record_date.startsWith(dateString));
        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
        
        let summaryHtml = '';
        if (recordsForDay.length > 0) {
            const onLeave = recordsForDay.filter(r => ['휴가', '병가', '오전반차', '오후반차'].includes(r.status)).length;
            const absent = recordsForDay.filter(r => r.status === '결근').length;
            if (onLeave > 0) summaryHtml += `<div class="text-xs text-blue-600 mt-1">휴가/병가: ${onLeave}</div>`;
            if (absent > 0) summaryHtml += `<div class="text-xs text-red-600">결근: ${absent}</div>`;
        }

        cells.push(`
            <div onclick="showDailyAttendance(${day})" class="h-28 p-2 border border-slate-100 ${isWeekend ? 'bg-slate-100' : 'bg-white hover:bg-blue-50 cursor-pointer'} flex flex-col overflow-hidden">
                <div class="font-bold ${isWeekend ? 'text-slate-400' : 'text-slate-700'}">${day}</div>
                ${summaryHtml}
            </div>
        `);
    }

    grid.innerHTML = cells.join('');
}

function showDailyAttendance(day) {
    const isAdmin = authState.user && authState.user.role === 'admin';
    const date = new Date(attendanceState.currentDate.getFullYear(), attendanceState.currentDate.getMonth(), day);
    const dateStrForTitle = date.toLocaleDateString();
    
    document.getElementById('daily-detail-view').classList.remove('hidden');
    document.getElementById('daily-detail-title').innerText = `${dateStrForTitle} 근태 기록`;
    
    const tableBody = document.getElementById('daily-attendance-table');
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dailyRecords = attendanceState.monthlyData.filter(r => r.record_date.startsWith(dateString));
    
    tableBody.innerHTML = ''; // Clear previous records

    if (!HRM.employees || HRM.employees.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.className = 'p-4 text-center text-slate-500';
        td.textContent = '직원 정보가 없습니다.';
        tr.appendChild(td);
        tableBody.appendChild(tr);
        return;
    }

    HRM.employees.forEach(emp => {
        const record = dailyRecords.find(r => r.employee_id === emp.id);
        const status = record ? record.status : '미기록';
        
        const tr = document.createElement('tr');

        const idCell = document.createElement('td');
        idCell.className = 'p-3 font-mono text-slate-500';
        idCell.textContent = emp.id;

        const nameCell = document.createElement('td');
        nameCell.className = 'p-3 font-bold';
        nameCell.textContent = emp.name;
        
        const deptCell = document.createElement('td');
        deptCell.className = 'p-3';
        deptCell.textContent = emp.dept_name;

        const statusCell = document.createElement('td');
        statusCell.className = 'p-3';

        const select = document.createElement('select');
        select.id = `status-${emp.id}-${day}`;
        select.className = 'w-full border rounded-md p-1 text-sm bg-white';
        if (!isAdmin) {
            select.disabled = true;
        }
        select.onchange = () => updateAttendanceStatus(emp.id, date.toISOString().split('T')[0], select.value);

        let optionsHtml = `<option value="미기록" ${status === '미기록' ? 'selected' : ''}>미기록</option>`;
        optionsHtml += statusOptions.map(opt => `<option value="${opt}" ${status === opt ? 'selected' : ''}>${opt}</option>`).join('');
        select.innerHTML = optionsHtml;

        statusCell.appendChild(select);
        
        tr.appendChild(idCell);
        tr.appendChild(nameCell);
        tr.appendChild(deptCell);
        tr.appendChild(statusCell);

        tableBody.appendChild(tr);
    });
}

async function updateAttendanceStatus(employeeId, date, status) {
    try {
        const res = await secureFetch(`${API_BASE_URL}/api/attendance`, {
            method: 'POST',
            body: JSON.stringify({ employee_id: employeeId, date, status })
        });
        if (!res) return;
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);
        
        showToast('근태 기록이 수정되었습니다.');
        // 변경된 데이터를 다시 불러와 캘린더를 새로고침
        fetchAndRenderCalendar();
    } catch(error) {
        showToast(error.message, true);
    }
}