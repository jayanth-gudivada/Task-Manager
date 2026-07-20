const { ObjectId } = require('mongodb');

// Every query in this file is scoped to req.userId (set by requireAuth) so a
// user can only ever see or touch their own tasks.

// Create a new task
exports.createTask = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const task = {
      ownerId: req.userId,
      title: req.body.title,
      description: req.body.description,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      priority: req.body.priority || 'general',
      color: req.body.color || null, // Custom color for general tasks; null for priority/important
      status: 1, // 1 = Active, 0 = Completed
      createdAt: new Date(),
    };
    const result = await db.collection('tasks').insertOne(task);
    res.status(201).json({ ...task, _id: result.insertedId });
  } catch (error) {
    res.status(400).json({ message: 'Error creating task', error: error.message });
  }
};

// Get all tasks
exports.getAllTasks = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const tasks = await db.collection('tasks')
      .find({ ownerId: req.userId, status: 1 })
      .sort({ startDate: 1 })
      .toArray();
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving tasks', error: error.message });
  }
};

// Get upcoming tasks
exports.getUpcomingTasks = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = await db.collection('tasks')
      .find({
        ownerId: req.userId,
        status: 1,
        endDate: { $gte: today.toISOString() }
      })
      .sort({ endDate: 1 })
      .limit(10)
      .toArray();
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving upcoming tasks', error: error.message });
  }
};

// Update a task
exports.updateTask = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { id } = req.params;
    // Never let a client reassign ownership or _id via the body.
    const { _id, ownerId, ...updateFields } = req.body;

    // Set completedAt if status is changing to 0
    if (updateFields.status === 0) {
      updateFields.completedAt = new Date().toISOString();
    }

    const result = await db.collection('tasks').findOneAndUpdate(
      { _id: new ObjectId(id), ownerId: req.userId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    !result
      ? res.status(404).json({ message: 'Task not found' })
      : res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: 'Error updating task', error: error.message });
  }
};

// Delete a task
exports.deleteTask = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { id } = req.params;
    const result = await db.collection('tasks').deleteOne({
      _id: new ObjectId(id),
      ownerId: req.userId,
    });

    result?.deletedCount === 0
      ? res.status(404).json({ message: 'Task not found' })
      : res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

// Get completed tasks (paginated)
exports.getCompletedTasks = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const page = parseInt(req.query.page) || 1;
    const limitParam = req.query.limit;
    const isAll = limitParam === 'all';
    const limit = isAll ? 0 : (parseInt(limitParam) || 5);
    const skip = isAll ? 0 : (page - 1) * limit;

    const filter = { ownerId: req.userId, status: 0 };
    const total = await db.collection('tasks').countDocuments(filter);
    let query = db.collection('tasks').find(filter).sort({ completedAt: -1 });

    if (!isAll) {
      query = query.skip(skip).limit(limit);
    }
    const tasks = await query.toArray();

    res.status(200).json({
      tasks,
      total,
      page,
      totalPages: isAll ? 1 : Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving completed tasks', error: error.message });
  }
};

// Get performance metrics
exports.getPerformanceStats = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const completedTasks = await db.collection('tasks')
      .find({ ownerId: req.userId, status: 0 })
      .toArray();

    if (completedTasks.length === 0) {
      return res.status(200).json({
        completionRate: 0,
        avgResponseTime: 0,
        totalCompleted: 0,
        totalActive: await db.collection('tasks').countDocuments({ ownerId: req.userId, status: 1 })
      });
    }

    // Completion Rate: % completed on or before deadline
    const onTimeTasks = completedTasks.filter(task => {
      const completedAt = new Date(task.completedAt);
      const endDate = new Date(task.endDate);
      return completedAt <= endDate;
    });

    const completionRate = (onTimeTasks.length / completedTasks.length) * 100;

    // Avg Response Time (Hours between startDate and completedAt)
    const responseTimes = completedTasks.map(task => {
      const start = new Date(task.startDate);
      const end = new Date(task.completedAt);
      return (end - start) / (1000 * 60 * 60); // Difference in hours
    });

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    const totalActive = await db.collection('tasks').countDocuments({ ownerId: req.userId, status: 1 });

    res.status(200).json({
      completionRate: Math.round(completionRate),
      avgResponseTime: parseFloat(avgResponseTime.toFixed(1)),
      totalCompleted: completedTasks.length,
      totalActive
    });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating stats', error: error.message });
  }
};
