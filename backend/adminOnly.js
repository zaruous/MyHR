function adminOnly(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: '접근 권한이 없습니다. 관리자만 접근할 수 있습니다.' });
    }
}

module.exports = adminOnly;
