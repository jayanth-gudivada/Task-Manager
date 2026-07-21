const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// Define API routes
router.post('/', taskController.createTask);
router.get('/', taskController.getAllTasks);
router.get('/assigned', taskController.getAssignedTasks);
router.get('/upcoming', taskController.getUpcomingTasks);
router.get('/completed', taskController.getCompletedTasks);
router.get('/stats', taskController.getPerformanceStats);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
