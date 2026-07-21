const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// Define API routes
router.post('/', taskController.createTask);
router.get('/', taskController.getAllTasks);
router.get('/assigned', taskController.getAssignedTasks);
router.get('/approval-pending', taskController.getApprovalPending);
router.get('/waiting-approval', taskController.getWaitingApproval);
router.get('/reassign', taskController.getReassign);
router.get('/upcoming', taskController.getUpcomingTasks);
router.post('/:id/accept', taskController.acceptTask);
router.post('/:id/request-change', taskController.requestChange);
router.post('/:id/resubmit', taskController.resubmitTask);
router.post('/:id/reject', taskController.rejectTask);
router.post('/:id/reassign', taskController.reassignTask);
router.get('/completed', taskController.getCompletedTasks);
router.get('/stats', taskController.getPerformanceStats);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
