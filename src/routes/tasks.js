const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Import controllers
const taskController = require('../controllers/taskController');

// Get all active tasks
router.get('/', auth, taskController.getAllTasks);

// Complete a task
router.post('/complete', auth, taskController.completeTask);

// Get user's completed tasks
router.get('/completed', auth, taskController.getCompletedTasks);

module.exports = router;
