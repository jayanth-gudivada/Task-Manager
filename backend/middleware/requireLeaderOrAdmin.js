// Leader-or-admin gate. Runs after requireAuth (which sets req.userRole).
// Admins and leaders may manage teams; plain users get 403.
module.exports = function requireLeaderOrAdmin(req, res, next) {
  if (req.userRole !== 'admin' && req.userRole !== 'leader') {
    return res.status(403).json({ message: 'Leader or admin access required' });
  }
  next();
};
