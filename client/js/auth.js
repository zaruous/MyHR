/* --- 인증 관련 함수 --- */
async function handleLogin() {
    const id = document.getElementById('login-id').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee_id: id, password }),
        });
        const data = await res.json();
        if (!res.ok) {
            if (data && data.code === 1000) { // CHG_PWD
                showToast('최초 로그인입니다. 비밀번호를 변경해주세요.');
                localStorage.setItem('hrm_token', data.tempToken); // 임시 토큰 저장
                localStorage.setItem('passwordChangeRequired', 'true');
                localStorage.setItem('hrm_user_info_for_pwd_change', JSON.stringify(data.user)); // 비밀번호 변경 페이지용 사용자 정보 저장
                setTimeout(() => {
                    window.location.href = 'pages/changePassword.html';
                }, 1000);
                return;
            } else {
                throw new Error(data.message || '로그인에 실패했습니다.');
            }
        }

        // Check for password change requirement
        if (data.passwordChangeRequired) {
            localStorage.setItem('hrm_token', data.token);
            localStorage.setItem('passwordChangeRequired', 'true');
            window.location.href = 'pages/changePassword.html'; // Redirect to change password page
            return;
        }

        authState.token = data.token;
        authState.user = data.user;
        localStorage.setItem('hrm_token', data.token);
        
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('app-container').classList.add('flex');
        document.getElementById('app-container').classList.remove('hidden');
        
        initializeApplication();
    } catch (error) {
        showToast(error.message, true);
    }
}

function logout() {
    authState.token = null;
    authState.user = null;
    localStorage.removeItem('hrm_token');
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('flex');
    document.getElementById('login-overlay').classList.remove('hidden');
}

function updateUserInfo() {
    if (!authState.user) return;
    const container = document.getElementById('user-info-display');
    container.innerHTML = `
        <div class="flex items-center gap-2 pl-4">
            <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold ${authState.user.role === 'admin' ? 'text-blue-600' : 'text-slate-600'}">
                ${authState.user.role === 'admin' ? '관리' : '사용'}
            </div>
            <span class="text-sm font-semibold text-slate-700">${authState.user.name}님</span>
        </div>
        <button onclick="logout()" class="text-sm text-slate-500 hover:text-slate-800">로그아웃</button>
    `;

    const systemMenu = document.getElementById('nav-system');
    if (authState.user.role !== 'admin') {
        systemMenu.style.display = 'none';
    } else {
        systemMenu.style.display = 'flex';
    }
}

function checkForToken() {
    const token = localStorage.getItem('hrm_token');
    if (token) {
        try {
            const decoded = JSON.parse(atob(token.split('.')[1]));
            if (decoded.exp * 1000 < Date.now()) {
                logout();
                return;
            }
            authState.token = token;
            authState.user = { id: decoded.id, name: decoded.name, role: decoded.role };

            document.getElementById('login-overlay').classList.add('hidden');
            document.getElementById('app-container').classList.add('flex');
            document.getElementById('app-container').classList.remove('hidden');
            initializeApplication();
        } catch (e) {
            console.error("Token parsing error:", e);
            logout();
        }
    }
}