const Task = require('../models/Task');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Get all active tasks
exports.getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ active: true });
    
    res.status(200).json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
};

// Complete a task
exports.completeTask = async (req, res) => {
  try {
    const { taskId } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required' });
    }
    
    // Find the task
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    if (!task.active) {
      return res.status(400).json({ message: 'This task is no longer active' });
    }
    
    // Get current user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has already completed this task
    if (user.completedTasks.includes(task._id)) {
      return res.status(400).json({ message: 'You have already completed this task' });
    }
    
    // Process task completion
    user.completedTasks.push(task._id);
    user.coins += task.reward;
    
    // Add experience
    user.experience += 5;
    
    // Check for level up
    if (user.experience >= user.maxExperience) {
      user.level += 1;
      user.experience = 0;
      user.maxExperience = Math.floor(user.maxExperience * 1.5); // Increase max experience for next level
    }
    
    await user.save();
    
    // Record transaction
    const transaction = new Transaction({
      user: user._id,
      amount: task.reward,
      type: 'task',
      description: `Completed task: ${task.title}`,
      reference: task._id,
      referenceModel: 'Task'
    });
    
    await transaction.save();
    
    res.status(200).json({
      message: 'Task completed successfully',
      coinsEarned: task.reward,
      totalCoins: user.coins,
      level: user.level,
      experience: user.experience,
      maxExperience: user.maxExperience
    });
    
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ message: 'Server error while completing task' });
  }
};

// Get user's completed tasks
exports.getCompletedTasks = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('completedTasks');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      completedTasks: user.completedTasks
    });
    
  } catch (error) {
    console.error('Get completed tasks error:', error);
    res.status(500).json({ message: 'Server error while fetching completed tasks' });
  }
};
