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
    const year = attendanceState.currentDate.getFullYear();
    const month = attendanceState.currentDate.getMonth() + 1;
    document.getElementById('calendar-title').innerText = `${year}년 ${month}월`;
    document.getElementById('daily-detail-view').classList.add('hidden');

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
    grid.innerHTML = '';
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="bg-slate-50"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const recordsForDay = attendanceState.monthlyData.filter(r => new Date(r.record_date).getDate() === day);
        const isWeekend = new Date(year, month - 1, day).getDay() % 6 === 0;
        
        let summaryHtml = '';
        if(recordsForDay.length > 0) {
            const onLeave = recordsForDay.filter(r => ['휴가', '병가', '오전반차', '오후반차'].includes(r.status)).length;
            const absent = recordsForDay.filter(r => r.status === '결근').length;
            if(onLeave > 0) summaryHtml += `<div class="text-xs text-blue-600 mt-1">휴가/병가: ${onLeave}</div>`;
            if(absent > 0) summaryHtml += `<div class="text-xs text-red-600">결근: ${absent}</div>`;
        }

        grid.innerHTML += `
            <div onclick="showDailyAttendance(${day})" class="h-28 p-2 border border-slate-100 ${isWeekend ? 'bg-slate-100' : 'bg-white hover:bg-blue-50 cursor-pointer'} flex flex-col overflow-hidden">
                <div class="font-bold ${isWeekend ? 'text-slate-400' : 'text-slate-700'}">${day}</div>
                ${summaryHtml}
            </div>
        `;
    }
}

function showDailyAttendance(day) {
    const isAdmin = authState.user && authState.user.role === 'admin';
    const date = new Date(attendanceState.currentDate.getFullYear(), attendanceState.currentDate.getMonth(), day);
    const dateStr = date.toLocaleDateString();
    document.getElementById('daily-detail-view').classList.remove('hidden');
    document.getElementById('daily-detail-title').innerText = `${dateStr} 근태 기록`;
    
    const tableBody = document.getElementById('daily-attendance-table');
    const dailyRecords = attendanceState.monthlyData.filter(r => new Date(r.record_date).getDate() === day);
    
    tableBody.innerHTML = '';
     // 전체 직원을 기준으로 루프를 돌고, 해당 날짜의 기록이 있으면 사용, 없으면 '미기록' 처리
    HRM.employees.forEach(emp => {
        let record = dailyRecords.find(r => r.employee_id === emp.id);
        let status = record ? record.status : '미기록';
        
        const statusSelectId = `status-${emp.id}-${day}`;
        const statusOptionsHtml = statusOptions.map(opt => `<option value="${opt}" ${status === opt ? 'selected' : ''}>${opt}</option>`).join('');

        tableBody.innerHTML += `
             <tr>
                <td class="p-3 font-mono text-slate-500">${emp.id}</td>
                <td class="p-3 font-bold">${emp.name}</td>
                <td class="p-3">${emp.dept_name}</td>
                <td class="p-3">
                    <select id="${statusSelectId}" onchange="updateAttendanceStatus('${emp.id}', '${date.toISOString().split('T')[0]}', this.value)" class="w-full border rounded-md p-1 text-sm bg-white" ${!isAdmin ? 'disabled' : ''}>
                        <option value="미기록" ${status === '미기록' ? 'selected' : ''}>미기록</option>
                        ${statusOptionsHtml}
                    </select>
                </td>
            </tr>
        `;
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