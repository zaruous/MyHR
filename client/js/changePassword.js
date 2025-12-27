const API_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('change-password-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const messageDiv = document.getElementById('password-change-message');

    // If for some reason user lands here without being required to change password, redirect them.
    if (localStorage.getItem('passwordChangeRequired') !== 'true') {
        window.location.href = '../HR.html';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageDiv.textContent = '';
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (newPassword !== confirmPassword) {
            messageDiv.textContent = '비밀번호가 일치하지 않습니다.';
            messageDiv.className = 'alert alert-danger mt-3';
            return;
        }

        if (newPassword.length < 4) {
            messageDiv.textContent = '비밀번호는 4자 이상이어야 합니다.';
            messageDiv.className = 'alert alert-danger mt-3';
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
                messageDiv.textContent = '비밀번호가 성공적으로 변경되었습니다. 잠시 후 메인 페이지로 이동합니다.';
                messageDiv.className = 'alert alert-success mt-3';
                
                localStorage.removeItem('passwordChangeRequired');
                
                setTimeout(() => {
                    window.location.href = '../HR.html';
                }, 2000);
            } else {
                throw new Error(result.message || '비밀번호 변경에 실패했습니다.');
            }
        } catch (error) {
            messageDiv.textContent = error.message;
            messageDiv.className = 'alert alert-danger mt-3';
        }
    });
});
