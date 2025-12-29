const API_BASE_URL = 'http://localhost:3000';

// Toast UI function
let toastTimer;
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = toast.className.replace(/bg-slate-800|bg-red-600/, ''); // remove previous color
    toast.classList.add(isError ? 'bg-red-600' : 'bg-slate-800');
    
    toast.style.opacity = 1;
    
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.style.opacity = 0;
    }, 3000);
}


document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('change-password-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const welcomeMessage = document.getElementById('welcome-message');

    // Display user name in welcome message
    try {
        const userInfo = JSON.parse(localStorage.getItem('hrm_user_info_for_pwd_change'));
        if (userInfo && userInfo.name) {
            welcomeMessage.textContent = `${userInfo.name}님, 시스템을 사용하려면 새 비밀번호를 설정해야 합니다.`;
        }
    } catch (e) {
        console.error('Could not parse user info for password change:', e);
    }

    // If for some reason user lands here without being required to change password, redirect them.
    if (localStorage.getItem('passwordChangeRequired') !== 'true') {
        window.location.href = '../HR.html';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (newPassword !== confirmPassword) {
            showToast('비밀번호가 일치하지 않습니다.', true);
            return;
        }

        if (newPassword.length < 4) {
            showToast('비밀번호는 4자 이상이어야 합니다.', true);
            return;
        }

        try {
            const token = localStorage.getItem('hrm_token');
            if (!token) {
                throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
            }

            const response = await fetch(`${API_BASE_URL}/api/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword })
            });

            const result = await response.json();

            if (response.ok) {
                showToast('비밀번호가 성공적으로 변경되었습니다. 잠시 후 메인 페이지로 이동합니다.');
                
                localStorage.removeItem('passwordChangeRequired');
                localStorage.removeItem('hrm_user_info_for_pwd_change');
                // The hrm_token (which is the temp token) will be replaced by the new one on the main page
                
                setTimeout(() => {
                    window.location.href = '../HR.html';
                }, 2000);
            } else {
                throw new Error(result.message || '비밀번호 변경에 실패했습니다.');
            }
        } catch (error) {
            showToast(error.message, true);
        }
    });
});