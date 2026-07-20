const jwt = require('jsonwebtoken');

// Gate that every protected route passes through. Reads a Bearer token,
// verifies it against JWT_SECRET, and exposes the caller's identity on the
// request so controllers can scope all data access to that one user.
module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;      // the user's _id (string)
    req.userRole = payload.role;   // 'admin' | 'user'
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
};
