const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const requireAdmin = require('../middleware/requireAdmin');

// Mounted behind requireAuth + requireLeaderOrAdmin in server.js, so every
// handler here is already an authenticated leader or admin.
router.get('/users', teamController.listAvailableUsers);
router.get('/', teamController.listTeams);
router.post('/', teamController.createTeam);
router.put('/:id', teamController.updateTeam);

// Deleting a team is admin-only.
router.delete('/:id', requireAdmin, teamController.deleteTeam);

module.exports = router;
