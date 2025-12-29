/* --- 경력 관리 페이지 함수 --- */
const careerState = {
    selectedEmployeeId: null,
    currentCareerType: null, // 'certification', 'training', 'award', 'project'
};

function renderCareerPage() {
    // 직원 드롭다운 채우기
    const empSelect = document.getElementById('career-employee-select');
    if (!empSelect) return;

    empSelect.innerHTML = '';
    HRM.employees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = `${emp.name} (${emp.id})`;
        empSelect.appendChild(option);
    });

    // 초기 선택 직원 설정 (첫 번째 직원 또는 이전에 선택된 직원)
    if (HRM.employees.length > 0) {
        careerState.selectedEmployeeId = HRM.employees[0].id;
        empSelect.value = careerState.selectedEmployeeId;
        fetchEmployeeCareerData(); // 초기 데이터 로드
    } else {
        document.getElementById('career-details-view').classList.add('hidden');
    }
}

async function fetchEmployeeCareerData() {
    const empId = document.getElementById('career-employee-select').value;
    if (!empId) {
        document.getElementById('career-details-view').classList.add('hidden');
        return;
    }
    careerState.selectedEmployeeId = empId;
    document.getElementById('career-details-view').classList.remove('hidden');

    try {
        const res = await secureFetch(`${API_BASE_URL}/api/employees/${empId}/career`);
        if (!res || !res.ok) throw new Error('직원 경력 정보를 불러오는 데 실패했습니다.');
        const careerData = await res.json();

        renderCertifications(careerData.certifications);
        renderTraining(careerData.training);
        renderAwards(careerData.awards);
        renderProjects(careerData.projects);

    } catch (error) {
        showToast(error.message, true);
    }
}

/* --- 자격증 관리 --- */
function renderCertifications(certs) {
    const container = document.getElementById('certifications-list');
    if (!container) return;

    if (certs.length === 0) {
        container.innerHTML = `<p class="text-sm text-slate-500">등록된 자격증 정보가 없습니다.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="w-full text-sm text-left border-collapse">
            <thead class="bg-slate-50">
                <tr>
                    <th class="p-2 border">자격증명</th>
                    <th class="p-2 border">발급기관</th>
                    <th class="p-2 border">취득일</th>
                    <th class="p-2 border">만료일</th>
                    <th class="p-2 border">관리</th>
                </tr>
            </thead>
            <tbody>
                ${certs.map(cert => `
                    <tr class="border-b hover:bg-slate-50">
                        <td class="p-2 border">${cert.name}</td>
                        <td class="p-2 border">${cert.issuer || ''}</td>
                        <td class="p-2 border">${cert.issue_date || ''}</td>
                        <td class="p-2 border">${cert.expiry_date || ''}</td>
                        <td class="p-2 border">
                            <button onclick='showEditCertificationModal(${JSON.stringify(cert)})' class="text-xs text-blue-600 hover:underline">수정</button>
                            <button onclick="deleteCertification(${cert.id})" class="text-xs text-red-600 hover:underline ml-2">삭제</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showAddCertificationModal() {
    careerState.currentCareerType = 'certification';
    document.getElementById('career-modal-title').innerText = '자격증 추가';
    document.getElementById('career-modal-id').value = ''; // ID 초기화

    const formFields = document.getElementById('career-modal-form-fields');
    formFields.innerHTML = `
        <div><label class="block text-xs font-bold text-slate-500 mb-1">자격증명</label><input type="text" id="cert-name" class="w-full border rounded px-2 py-1.5"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">발급기관</label><input type="text" id="cert-issuer" class="w-full border rounded px-2 py-1.5"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">취득일</label><input type="date" id="cert-issue-date" class="w-full border rounded px-2 py-1.5"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">만료일</label><input type="date" id="cert-expiry-date" class="w-full border rounded px-2 py-1.5"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">자격번호</label><input type="text" id="cert-number" class="w-full border rounded px-2 py-1.5"></div>
    `;
    document.getElementById('career-modal').classList.remove('hidden');
}

function showEditCertificationModal(cert) {
    careerState.currentCareerType = 'certification';
    document.getElementById('career-modal-title').innerText = '자격증 수정';
    document.getElementById('career-modal-id').value = cert.id;

    const formFields = document.getElementById('career-modal-form-fields');
    formFields.innerHTML = `
        <div><label class="block text-xs font-bold text-slate-500 mb-1">자격증명</label><input type="text" id="cert-name" class="w-full border rounded px-2 py-1.5" value="${cert.name}"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">발급기관</label><input type="text" id="cert-issuer" class="w-full border rounded px-2 py-1.5" value="${cert.issuer || ''}"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">취득일</label><input type="date" id="cert-issue-date" class="w-full border rounded px-2 py-1.5" value="${cert.issue_date || ''}"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">만료일</label><input type="date" id="cert-expiry-date" class="w-full border rounded px-2 py-1.5" value="${cert.expiry_date || ''}"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">자격번호</label><input type="text" id="cert-number" class="w-full border rounded px-2 py-1.5" value="${cert.cert_number || ''}"></div>
    `;
    document.getElementById('career-modal').classList.remove('hidden');
}

async function saveCertification() {
    const certId = document.getElementById('career-modal-id').value;
    const certData = {
        employee_id: careerState.selectedEmployeeId,
        name: document.getElementById('cert-name').value,
        issuer: document.getElementById('cert-issuer').value,
        issue_date: document.getElementById('cert-issue-date').value,
        expiry_date: document.getElementById('cert-expiry-date').value,
        cert_number: document.getElementById('cert-number').value,
    };

    if (!certData.name || !certData.issue_date) {
        showToast('자격증명과 취득일은 필수입니다.', true);
        return;
    }

    try {
        const method = certId ? 'PUT' : 'POST';
        const url = certId ? `${API_BASE_URL}/api/certifications/${certId}` : `${API_BASE_URL}/api/certifications`;
        
        const res = await secureFetch(url, { method, body: JSON.stringify(certData) });
        if (!res || !res.ok) throw new Error(`자격증 ${certId ? '수정' : '추가'}에 실패했습니다.`);
        
        showToast(`자격증이 성공적으로 ${certId ? '수정' : '추가'}되었습니다.`);
        hideCareerModal();
        fetchEmployeeCareerData();
    } catch (error) {
        showToast(error.message, true);
    }
}

async function deleteCertification(id) {
    if (!confirm('정말로 이 자격증 정보를 삭제하시겠습니까?')) return;
    try {
        const res = await secureFetch(`${API_BASE_URL}/api/certifications/${id}`, { method: 'DELETE' });
        if (!res || !res.ok) throw new Error('자격증 삭제에 실패했습니다.');
        showToast('자격증이 성공적으로 삭제되었습니다.');
        fetchEmployeeCareerData();
    } catch (error) {
        showToast(error.message, true);
    }
}

/* --- 교육 이수 관리 --- */
function renderTraining(trainings) {
    const container = document.getElementById('training-list');
    if (!container) return;

    if (trainings.length === 0) {
        container.innerHTML = `<p class="text-sm text-slate-500">등록된 교육 이수 정보가 없습니다.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="w-full text-sm text-left border-collapse">
            <thead class="bg-slate-50">
                <tr>
                    <th class="p-2 border">과정명</th>
                    <th class="p-2 border">교육기관</th>
                    <th class="p-2 border">시작일</th>
                    <th class="p-2 border">종료일</th>
                    <th class="p-2 border">관리</th>
                </tr>
            </thead>
            <tbody>
                ${trainings.map(t => `
                    <tr class="border-b hover:bg-slate-50">
                        <td class="p-2 border">${t.course_name}</td>
                        <td class="p-2 border">${t.institution || ''}</td>
                        <td class="p-2 border">${t.start_date || ''}</td>
                        <td class="p-2 border">${t.end_date || ''}</td>
                        <td class="p-2 border">
                            <button onclick='showEditTrainingModal(${JSON.stringify(t)})' class="text-xs text-blue-600 hover:underline">수정</button>
                            <button onclick="deleteTraining(${t.id})" class="text-xs text-red-600 hover:underline ml-2">삭제</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showAddTrainingModal() {
    careerState.currentCareerType = 'training';
    document.getElementById('career-modal-title').innerText = '교육 이수 추가';
    document.getElementById('career-modal-id').value = '';

    const formFields = document.getElementById('career-modal-form-fields');
    formFields.innerHTML = `
        <div><label class="block text-xs font-bold text-slate-500 mb-1">과정명</label><input type="text" id="training-course-name" class="w-full border rounded px-2 py-1.5"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">교육기관</label><input type="text" id="training-institution" class="w-full border rounded px-2 py-1.5"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">시작일</label><input type="date" id="training-start-date" class="w-full border rounded px-2 py-1.5"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">종료일</label><input type="date" id="training-end-date" class="w-full border rounded px-2 py-1.5"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">내용</label><textarea id="training-description" rows="3" class="w-full border rounded px-2 py-1.5"></textarea></div>
    `;
    document.getElementById('career-modal').classList.remove('hidden');
}

function showEditTrainingModal(training) {
    careerState.currentCareerType = 'training';
    document.getElementById('career-modal-title').innerText = '교육 이수 수정';
    document.getElementById('career-modal-id').value = training.id;

    const formFields = document.getElementById('career-modal-form-fields');
    formFields.innerHTML = `
        <div><label class="block text-xs font-bold text-slate-500 mb-1">과정명</label><input type="text" id="training-course-name" class="w-full border rounded px-2 py-1.5" value="${training.course_name}"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">교육기관</label><input type="text" id="training-institution" class="w-full border rounded px-2 py-1.5" value="${training.institution || ''}"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">시작일</label><input type="date" id="training-start-date" class="w-full border rounded px-2 py-1.5" value="${training.start_date || ''}"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">종료일</label><input type="date" id="training-end-date" class="w-full border rounded px-2 py-1.5" value="${training.end_date || ''}"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">내용</label><textarea id="training-description" rows="3" class="w-full border rounded px-2 py-1.5">${training.description || ''}</textarea></div>
    `;
    document.getElementById('career-modal').classList.remove('hidden');
}

async function saveTraining() {
    const trainingId = document.getElementById('career-modal-id').value;
    const trainingData = {
        employee_id: careerState.selectedEmployeeId,
        course_name: document.getElementById('training-course-name').value,
        institution: document.getElementById('training-institution').value,
        start_date: document.getElementById('training-start-date').value,
        end_date: document.getElementById('training-end-date').value,
        description: document.getElementById('training-description').value,
    };

    if (!trainingData.course_name || !trainingData.start_date) {
        showToast('과정명과 시작일은 필수입니다.', true);
        return;
    }

    try {
        const method = trainingId ? 'PUT' : 'POST';
        const url = trainingId ? `${API_BASE_URL}/api/training/${trainingId}` : `${API_BASE_URL}/api/training`;
        
        const res = await secureFetch(url, { method, body: JSON.stringify(trainingData) });
        if (!res || !res.ok) throw new Error(`교육 이수 ${trainingId ? '수정' : '추가'}에 실패했습니다.`);
        
        showToast(`교육 이수가 성공적으로 ${trainingId ? '수정' : '추가'}되었습니다.`);
        hideCareerModal();
        fetchEmployeeCareerData();
    } catch (error) {
        showToast(error.message, true);
    }
}

async function deleteTraining(id) {
    if (!confirm('정말로 이 교육 이수 정보를 삭제하시겠습니까?')) return;
    try {
        const res = await secureFetch(`${API_BASE_URL}/api/training/${id}`, { method: 'DELETE' });
        if (!res || !res.ok) throw new Error('교육 이수 삭제에 실패했습니다.');
        showToast('교육 이수가 성공적으로 삭제되었습니다.');
        fetchEmployeeCareerData();
    } catch (error) {
        showToast(error.message, true);
    }
}

/* --- 수상 내역 관리 --- */
function renderAwards(awards) {
    const container = document.getElementById('awards-list');
    if (!container) return;

    if (awards.length === 0) {
        container.innerHTML = `<p class="text-sm text-slate-500">등록된 수상 내역이 없습니다.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="w-full text-sm text-left border-collapse">
            <thead class="bg-slate-50">
                <tr>
                    <th class="p-2 border">수상명</th>
                    <th class="p-2 border">수여기관</th>
                    <th class="p-2 border">수상일</th>
                    <th class="p-2 border">관리</th>
                </tr>
            </thead>
            <tbody>
                ${awards.map(award => `
                    <tr class="border-b hover:bg-slate-50">
                        <td class="p-2 border">${award.award_name}</td>
                        <td class="p-2 border">${award.issuer || ''}</td>
                        <td class="p-2 border">${award.award_date || ''}</td>
                        <td class="p-2 border">
                            <button onclick='showEditAwardModal(${JSON.stringify(award)})' class="text-xs text-blue-600 hover:underline">수정</button>
                            <button onclick="deleteAward(${award.id})" class="text-xs text-red-600 hover:underline ml-2">삭제</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showAddAwardModal() {
    careerState.currentCareerType = 'award';
    document.getElementById('career-modal-title').innerText = '수상 내역 추가';
    document.getElementById('career-modal-id').value = '';

    const formFields = document.getElementById('career-modal-form-fields');
    formFields.innerHTML = `
        <div><label class="block text-xs font-bold text-slate-500 mb-1">수상명</label><input type="text" id="award-name" class="w-full border rounded px-2 py-1.5"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">수여기관</label><input type="text" id="award-issuer" class="w-full border rounded px-2 py-1.5"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">수상일</label><input type="date" id="award-date" class="w-full border rounded px-2 py-1.5"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">내용</label><textarea id="award-description" rows="3" class="w-full border rounded px-2 py-1.5"></textarea></div>
    `;
    document.getElementById('career-modal').classList.remove('hidden');
}

function showEditAwardModal(award) {
    careerState.currentCareerType = 'award';
    document.getElementById('career-modal-title').innerText = '수상 내역 수정';
    document.getElementById('career-modal-id').value = award.id;

    const formFields = document.getElementById('career-modal-form-fields');
    formFields.innerHTML = `
        <div><label class="block text-xs font-bold text-slate-500 mb-1">수상명</label><input type="text" id="award-name" class="w-full border rounded px-2 py-1.5" value="${award.award_name}"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">수여기관</label><input type="text" id="award-issuer" class="w-full border rounded px-2 py-1.5" value="${award.issuer || ''}"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">수상일</label><input type="date" id="award-date" class="w-full border rounded px-2 py-1.5" value="${award.award_date || ''}"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">내용</label><textarea id="award-description" rows="3" class="w-full border rounded px-2 py-1.5">${award.description || ''}</textarea></div>
    `;
    document.getElementById('career-modal').classList.remove('hidden');
}

async function saveAward() {
    const awardId = document.getElementById('career-modal-id').value;
    const awardData = {
        employee_id: careerState.selectedEmployeeId,
        award_name: document.getElementById('award-name').value,
        issuer: document.getElementById('award-issuer').value,
        award_date: document.getElementById('award-date').value,
        description: document.getElementById('award-description').value,
    };

    if (!awardData.award_name || !awardData.award_date) {
        showToast('수상명과 수상일은 필수입니다.', true);
        return;
    }

    try {
        const method = awardId ? 'PUT' : 'POST';
        const url = awardId ? `${API_BASE_URL}/api/awards/${awardId}` : `${API_BASE_URL}/api/awards`;
        
        const res = await secureFetch(url, { method, body: JSON.stringify(awardData) });
        if (!res || !res.ok) throw new Error(`수상 내역 ${awardId ? '수정' : '추가'}에 실패했습니다.`);
        
        showToast(`수상 내역이 성공적으로 ${awardId ? '수정' : '추가'}되었습니다.`);
        hideCareerModal();
        fetchEmployeeCareerData();
    } catch (error) {
        showToast(error.message, true);
    }
}

async function deleteAward(id) {
    if (!confirm('정말로 이 수상 내역을 삭제하시겠습니까?')) return;
    try {
        const res = await secureFetch(`${API_BASE_URL}/api/awards/${id}`, { method: 'DELETE' });
        if (!res || !res.ok) throw new Error('수상 내역 삭제에 실패했습니다.');
        showToast('수상 내역이 성공적으로 삭제되었습니다.');
        fetchEmployeeCareerData();
    } catch (error) {
        showToast(error.message, true);
    }
}

/* --- 프로젝트 이력 관리 --- */
function renderProjects(projects) {
    const container = document.getElementById('projects-list');
    if (!container) return;

    if (projects.length === 0) {
        container.innerHTML = `<p class="text-sm text-slate-500">등록된 프로젝트 이력이 없습니다.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="w-full text-sm text-left border-collapse">
            <thead class="bg-slate-50">
                <tr>
                    <th class="p-2 border">프로젝트명</th>
                    <th class="p-2 border">역할</th>
                    <th class="p-2 border">시작일</th>
                    <th class="p-2 border">종료일</th>
                    <th class="p-2 border">관리</th>
                </tr>
            </thead>
            <tbody>
                ${projects.map(proj => `
                    <tr class="border-b hover:bg-slate-50">
                        <td class="p-2 border">${proj.project_name}</td>
                        <td class="p-2 border">${proj.role || ''}</td>
                        <td class="p-2 border">${proj.start_date || ''}</td>
                        <td class="p-2 border">${proj.end_date || ''}</td>
                        <td class="p-2 border">
                            <button onclick='showEditProjectModal(${JSON.stringify(proj)})' class="text-xs text-blue-600 hover:underline">수정</button>
                            <button onclick="deleteProject(${proj.id})" class="text-xs text-red-600 hover:underline ml-2">삭제</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showAddProjectModal() {
    careerState.currentCareerType = 'project';
    document.getElementById('career-modal-title').innerText = '프로젝트 추가';
    document.getElementById('career-modal-id').value = '';

    const formFields = document.getElementById('career-modal-form-fields');
    formFields.innerHTML = `
        <div><label class="block text-xs font-bold text-slate-500 mb-1">프로젝트명</label><input type="text" id="proj-name" class="w-full border rounded px-2 py-1.5"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">역할</label><input type="text" id="proj-role" class="w-full border rounded px-2 py-1.5"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">시작일</label><input type="date" id="proj-start-date" class="w-full border rounded px-2 py-1.5"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">종료일</label><input type="date" id="proj-end-date" class="w-full border rounded px-2 py-1.5"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">내용</label><textarea id="proj-description" rows="3" class="w-full border rounded px-2 py-1.5"></textarea></div>
    `;
    document.getElementById('career-modal').classList.remove('hidden');
}

function showEditProjectModal(project) {
    careerState.currentCareerType = 'project';
    document.getElementById('career-modal-title').innerText = '프로젝트 수정';
    document.getElementById('career-modal-id').value = project.id;

    const formFields = document.getElementById('career-modal-form-fields');
    formFields.innerHTML = `
        <div><label class="block text-xs font-bold text-slate-500 mb-1">프로젝트명</label><input type="text" id="proj-name" class="w-full border rounded px-2 py-1.5" value="${project.project_name}"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">역할</label><input type="text" id="proj-role" class="w-full border rounded px-2 py-1.5" value="${project.role || ''}"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">시작일</label><input type="date" id="proj-start-date" class="w-full border rounded px-2 py-1.5" value="${project.start_date || ''}"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">종료일</label><input type="date" id="proj-end-date" class="w-full border rounded px-2 py-1.5" value="${project.end_date || ''}"></div>
        <div><label class="block text-xs font-bold text-slate-500 mb-1">내용</label><textarea id="proj-description" rows="3" class="w-full border rounded px-2 py-1.5">${project.description || ''}</textarea></div>
    `;
    document.getElementById('career-modal').classList.remove('hidden');
}

async function saveProject() {
    const projectId = document.getElementById('career-modal-id').value;
    const projectData = {
        employee_id: careerState.selectedEmployeeId,
        project_name: document.getElementById('proj-name').value,
        role: document.getElementById('proj-role').value,
        start_date: document.getElementById('proj-start-date').value,
        end_date: document.getElementById('proj-end-date').value,
        description: document.getElementById('proj-description').value,
    };

    if (!projectData.project_name || !projectData.start_date) {
        showToast('프로젝트명과 시작일은 필수입니다.', true);
        return;
    }

    try {
        const method = projectId ? 'PUT' : 'POST';
        const url = projectId ? `${API_BASE_URL}/api/projects/${projectId}` : `${API_BASE_URL}/api/projects`;
        
        const res = await secureFetch(url, { method, body: JSON.stringify(projectData) });
        if (!res || !res.ok) throw new Error(`프로젝트 ${projectId ? '수정' : '추가'}에 실패했습니다.`);
        
        showToast(`프로젝트 이력이 성공적으로 ${projectId ? '수정' : '추가'}되었습니다.`);
        hideCareerModal();
        fetchEmployeeCareerData();
    } catch (error) {
        showToast(error.message, true);
    }
}

async function deleteProject(id) {
    if (!confirm('정말로 이 프로젝트 이력을 삭제하시겠습니까?')) return;
    try {
        const res = await secureFetch(`${API_BASE_URL}/api/projects/${id}`, { method: 'DELETE' });
        if (!res || !res.ok) throw new Error('프로젝트 삭제에 실패했습니다.');
        showToast('프로젝트 이력이 성공적으로 삭제되었습니다.');
        fetchEmployeeCareerData();
    } catch (error) {
        showToast(error.message, true);
    }
}

/* --- 공통 모달 관리 --- */
function hideCareerModal() {
    document.getElementById('career-modal').classList.add('hidden');
    document.getElementById('career-modal-form-fields').innerHTML = ''; // 폼 필드 초기화
}

async function saveCareerItem() {
    switch (careerState.currentCareerType) {
        case 'certification':
            await saveCertification();
            break;
        case 'training':
            await saveTraining();
            break;
        case 'award':
            await saveAward();
            break;
        case 'project':
            await saveProject();
            break;
        default:
            showToast('알 수 없는 경력 유형입니다.', true);
    }
}
