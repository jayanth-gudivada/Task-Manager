const { ObjectId } = require('mongodb');

// Every query in this file is scoped to req.userId (set by requireAuth). A task
// has an owner (creator) and an assignee (who it's for). "My tasks" are tasks
// assigned to me; "assigned tasks" are ones I created for someone else.

const toObjectId = (id) => {
  try { return new ObjectId(id); } catch { return null; }
};

// A task belongs to my "My Tasks" view if I'm the assignee. Legacy tasks created
// before assignment existed have no assigneeId — treat those as self-owned.
const myTasksFilter = (userId) => ({
  status: 1,
  $or: [
    { assigneeId: userId },
    { assigneeId: { $exists: false }, ownerId: userId },
  ],
});

// Attach display names for the owner (who assigned it) and assignee (who it's
// for) in a single lookup, so the UI can label assigned tasks.
async function populateNames(db, tasks) {
  const ids = [
    ...new Set(tasks.flatMap((t) => [t.ownerId, t.assigneeId].filter(Boolean).map(String))),
  ].map(toObjectId).filter(Boolean);

  const users = ids.length
    ? await db.collection('users').find({ _id: { $in: ids } }, { projection: { name: 1 } }).toArray()
    : [];
  const nameById = new Map(users.map((u) => [u._id.toString(), u.name]));

  return tasks.map((t) => ({
    ...t,
    ownerName: t.ownerId ? nameById.get(String(t.ownerId)) || null : null,
    assigneeName: t.assigneeId ? nameById.get(String(t.assigneeId)) || null : null,
  }));
}

// Create a new task
exports.createTask = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const assignmentType = req.body.assignmentType === 'team' ? 'team' : 'self';
    let assigneeId = req.userId; // self-assignment by default
    let teamId = null;

    if (assignmentType === 'team') {
      teamId = req.body.teamId;
      assigneeId = req.body.assigneeId;
      const team = teamId ? await db.collection('teams').findOne({ _id: toObjectId(teamId) }) : null;
      if (!team) return res.status(400).json({ message: 'A valid team is required' });
      const memberIds = (team.memberIds || []).map(String);
      if (!assigneeId || !memberIds.includes(String(assigneeId))) {
        return res.status(400).json({ message: 'Assignee must be a member of the selected team' });
      }
    }

    const task = {
      ownerId: req.userId,
      assignmentType,
      teamId,
      assigneeId,
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

// Get my tasks (assigned to me)
exports.getAllTasks = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const tasks = await db.collection('tasks')
      .find(myTasksFilter(req.userId))
      .sort({ startDate: 1 })
      .toArray();
    res.status(200).json(await populateNames(db, tasks));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving tasks', error: error.message });
  }
};

// Get tasks I created for other people
exports.getAssignedTasks = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const tasks = await db.collection('tasks')
      .find({ status: 1, ownerId: req.userId, assigneeId: { $exists: true, $ne: req.userId } })
      .sort({ startDate: 1 })
      .toArray();
    res.status(200).json(await populateNames(db, tasks));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving assigned tasks', error: error.message });
  }
};

// Get upcoming tasks
exports.getUpcomingTasks = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = await db.collection('tasks')
      .find({ ...myTasksFilter(req.userId), endDate: { $gte: today.toISOString() } })
      .sort({ endDate: 1 })
      .limit(10)
      .toArray();
    res.status(200).json(await populateNames(db, tasks));
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

    // The owner (creator) or the assignee may update a task — so an assignee can
    // mark work assigned to them as complete.
    const result = await db.collection('tasks').findOneAndUpdate(
      { _id: new ObjectId(id), $or: [{ ownerId: req.userId }, { assigneeId: req.userId }] },
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
