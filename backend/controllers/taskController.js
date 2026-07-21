const { ObjectId } = require('mongodb');

// Every query in this file is scoped to req.userId (set by requireAuth). A task
// has an owner (creator) and an assignee (who it's for). "My tasks" are tasks
// assigned to me; "assigned tasks" are ones I created for someone else.

const toObjectId = (id) => {
  try { return new ObjectId(id); } catch { return null; }
};

// A task belongs to my "My Tasks" view if I'm the assignee and the task is
// approved (self-tasks and accepted assignments). Legacy tasks have neither
// assigneeId nor approvalStatus — treat those as approved & self-owned.
const myTasksFilter = (userId) => ({
  status: 1,
  approvalStatus: { $nin: ['pending', 'rejected'] }, // approved or legacy(missing)
  $or: [
    { assigneeId: userId },
    { assigneeId: { $exists: false }, ownerId: userId },
  ],
});

const userName = async (db, userId) => {
  const u = await db.collection('users').findOne({ _id: toObjectId(userId) }, { projection: { name: 1 } });
  return u?.name || null;
};

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

    // Assigning to another person starts an approval flow; self-tasks are
    // approved immediately. pendingWith is whoever must act next.
    const needsApproval = assignmentType === 'team' && String(assigneeId) !== String(req.userId);

    const task = {
      ownerId: req.userId,
      assignmentType,
      teamId,
      assigneeId,
      approvalStatus: needsApproval ? 'pending' : 'approved',
      pendingWith: needsApproval ? assigneeId : null,
      remarks: [],
      rejectedBy: [], // users who rejected this task (excluded from reassignment)
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

// Get tasks I created for other people (approved ones)
exports.getAssignedTasks = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const tasks = await db.collection('tasks')
      .find({ status: 1, ownerId: req.userId, assigneeId: { $exists: true, $ne: req.userId }, approvalStatus: { $nin: ['pending', 'rejected'] } })
      .sort({ startDate: 1 })
      .toArray();
    res.status(200).json(await populateNames(db, tasks));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving assigned tasks', error: error.message });
  }
};

// Tasks rejected by their assignee — the owner must reassign them.
exports.getReassign = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const tasks = await db.collection('tasks')
      .find({ status: 1, approvalStatus: 'rejected', ownerId: req.userId })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json(await populateNames(db, tasks));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving tasks to reassign', error: error.message });
  }
};

// Tasks awaiting MY action (I must accept or request a change).
exports.getApprovalPending = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const tasks = await db.collection('tasks')
      .find({ status: 1, approvalStatus: 'pending', pendingWith: req.userId })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json(await populateNames(db, tasks));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving pending approvals', error: error.message });
  }
};

// Tasks I'm involved in that are waiting on the OTHER party to act.
exports.getWaitingApproval = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const tasks = await db.collection('tasks')
      .find({
        status: 1,
        approvalStatus: 'pending',
        pendingWith: { $ne: req.userId },
        $or: [{ ownerId: req.userId }, { assigneeId: req.userId }],
      })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json(await populateNames(db, tasks));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving waiting approvals', error: error.message });
  }
};

// Accept a task assigned to me → it becomes an approved task in my list.
exports.acceptTask = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: 'Invalid task id' });

    const result = await db.collection('tasks').findOneAndUpdate(
      { _id, approvalStatus: 'pending', pendingWith: req.userId },
      { $set: { approvalStatus: 'approved', pendingWith: null } },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ message: 'Task not found or not awaiting your approval' });
    const [task] = await populateNames(db, [result]);
    res.status(200).json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error accepting task', error: error.message });
  }
};

// Request a change: attach a remark and hand the task to the other party for
// approval. Works both during the pending flow and on an already-accepted task
// the assignee later wants changed (which re-opens the approval flow).
exports.requestChange = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: 'Invalid task id' });
    const text = (req.body.remark || '').trim();
    if (!text) return res.status(400).json({ message: 'A remark describing the change is required' });

    // The requester must be a participant (owner or assignee) of the task.
    const task = await db.collection('tasks').findOne({
      _id, status: 1, $or: [{ ownerId: req.userId }, { assigneeId: req.userId }],
    });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Hand to the other participant. A self-task has no counterpart.
    const other = String(req.userId) === String(task.assigneeId) ? task.ownerId : task.assigneeId;
    if (!other || String(other) === String(req.userId)) {
      return res.status(400).json({ message: 'There is no one to send this request to' });
    }
    const remark = { by: req.userId, byName: await userName(db, req.userId), text, at: new Date() };

    const result = await db.collection('tasks').findOneAndUpdate(
      { _id },
      { $push: { remarks: remark }, $set: { approvalStatus: 'pending', pendingWith: other } },
      { returnDocument: 'after' }
    );
    const [updated] = await populateNames(db, [result]);
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Error requesting change', error: error.message });
  }
};

// Resubmit after making the requested changes → hand back to the other party.
exports.resubmitTask = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: 'Invalid task id' });

    const task = await db.collection('tasks').findOne({ _id, approvalStatus: 'pending', pendingWith: req.userId });
    if (!task) return res.status(404).json({ message: 'Task not found or not awaiting your action' });

    const editable = {};
    ['title', 'description', 'startDate', 'endDate', 'priority', 'color'].forEach((k) => {
      if (req.body[k] !== undefined) editable[k] = req.body[k];
    });
    const other = String(req.userId) === String(task.assigneeId) ? task.ownerId : task.assigneeId;

    const result = await db.collection('tasks').findOneAndUpdate(
      { _id },
      { $set: { ...editable, pendingWith: other } },
      { returnDocument: 'after' }
    );
    const [updated] = await populateNames(db, [result]);
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Error resubmitting task', error: error.message });
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
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: 'Invalid task id' });

    // The owner (creator) or the assignee may update a task — so an assignee can
    // mark work assigned to them as complete.
    const task = await db.collection('tasks').findOne({
      _id, $or: [{ ownerId: req.userId }, { assigneeId: req.userId }],
    });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Never let a client set these directly — ownership, approval state, and the
    // pending pointer are server-controlled.
    const { _id: _bodyId, ownerId, approvalStatus, pendingWith, ...updateFields } = req.body;

    // Reassignment must go through the same approval logic as creation, and only
    // the owner may change it. Non-owners can't touch assignment fields.
    if (updateFields.assignmentType !== undefined || updateFields.assigneeId !== undefined || updateFields.teamId !== undefined) {
      if (String(task.ownerId) !== String(req.userId)) {
        delete updateFields.assignmentType;
        delete updateFields.assigneeId;
        delete updateFields.teamId;
      } else {
        const type = updateFields.assignmentType === 'team' ? 'team' : 'self';
        if (type === 'team') {
          const team = updateFields.teamId ? await db.collection('teams').findOne({ _id: toObjectId(updateFields.teamId) }) : null;
          if (!team) return res.status(400).json({ message: 'A valid team is required' });
          const memberIds = (team.memberIds || []).map(String);
          if (!updateFields.assigneeId || !memberIds.includes(String(updateFields.assigneeId))) {
            return res.status(400).json({ message: 'Assignee must be a member of the selected team' });
          }
          const needsApproval = String(updateFields.assigneeId) !== String(req.userId);
          updateFields.assignmentType = 'team';
          updateFields.approvalStatus = needsApproval ? 'pending' : 'approved';
          updateFields.pendingWith = needsApproval ? updateFields.assigneeId : null;
          if (needsApproval) updateFields.remarks = []; // fresh approval cycle
        } else {
          updateFields.assignmentType = 'self';
          updateFields.teamId = null;
          updateFields.assigneeId = req.userId;
          updateFields.approvalStatus = 'approved';
          updateFields.pendingWith = null;
        }
      }
    }

    // Set completedAt if status is changing to 0
    if (updateFields.status === 0) {
      updateFields.completedAt = new Date().toISOString();
    }

    const result = await db.collection('tasks').findOneAndUpdate(
      { _id },
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

// Reject a task assigned to me → back to the owner to reassign to someone else.
exports.rejectTask = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: 'Invalid task id' });
    const text = (req.body.remark || '').trim();
    if (!text) return res.status(400).json({ message: 'A reason for rejecting is required' });

    const task = await db.collection('tasks').findOne({ _id, approvalStatus: 'pending', pendingWith: req.userId });
    if (!task) return res.status(404).json({ message: 'Task not found or not awaiting your action' });

    const remark = { by: req.userId, byName: await userName(db, req.userId), text, at: new Date(), type: 'reject' };

    const result = await db.collection('tasks').findOneAndUpdate(
      { _id },
      {
        $push: { remarks: remark },
        $addToSet: { rejectedBy: req.userId },     // never reassign back to this person
        $set: { approvalStatus: 'rejected', pendingWith: task.ownerId },
      },
      { returnDocument: 'after' }
    );
    const [updated] = await populateNames(db, [result]);
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Error rejecting task', error: error.message });
  }
};

// Owner reassigns a rejected task to a different team member → new approval cycle.
exports.reassignTask = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: 'Invalid task id' });

    const task = await db.collection('tasks').findOne({ _id, approvalStatus: 'rejected', ownerId: req.userId });
    if (!task) return res.status(404).json({ message: 'Task not found or not awaiting reassignment' });

    const teamId = req.body.teamId || task.teamId;
    const assigneeId = req.body.assigneeId;
    const team = teamId ? await db.collection('teams').findOne({ _id: toObjectId(teamId) }) : null;
    if (!team) return res.status(400).json({ message: 'A valid team is required' });

    const memberIds = (team.memberIds || []).map(String);
    const rejected = (task.rejectedBy || []).map(String);
    if (!assigneeId || !memberIds.includes(String(assigneeId))) {
      return res.status(400).json({ message: 'Assignee must be a member of the team' });
    }
    if (String(assigneeId) === String(req.userId) || rejected.includes(String(assigneeId))) {
      return res.status(400).json({ message: 'Choose a different member who has not rejected this task' });
    }

    const result = await db.collection('tasks').findOneAndUpdate(
      { _id },
      { $set: { teamId, assigneeId, approvalStatus: 'pending', pendingWith: assigneeId } },
      { returnDocument: 'after' }
    );
    const [updated] = await populateNames(db, [result]);
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Error reassigning task', error: error.message });
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
