const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-secret-key';

const authenticate = (req, res, next) => {
    let token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    if (token.startsWith('Bearer ')) token = token.slice(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        console.error('Token verification failed:', err.message);
        return res.status(403).json({ error: 'Invalid token' });
    }
};

module.exports = { authenticate, JWT_SECRET };