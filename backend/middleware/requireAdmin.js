// Admin-only gate. Runs after requireAuth (which sets req.userRole), so it only
// needs to check the role. Non-admins get 403.
module.exports = function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
