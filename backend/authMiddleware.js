require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret_key'; // 실제 프로덕션에서는 환경 변수로 관리해야 합니다.

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // 요청 객체에 디코딩된 사용자 정보 추가
        next();
    } catch (error) {
        return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }
}

module.exports = authMiddleware;
