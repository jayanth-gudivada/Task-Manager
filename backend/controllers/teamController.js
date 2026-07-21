const { ObjectId } = require('mongodb');

const toObjectId = (id) => {
  try { return new ObjectId(id); } catch { return null; }
};

// Resolve incoming member ids into ObjectIds, verifying each references a real
// user. Returns an array of ObjectIds, or null if anything is invalid/unknown.
async function validateMembers(db, memberIds) {
  if (!Array.isArray(memberIds) || memberIds.length === 0) return [];
  const ids = [];
  for (const id of memberIds) {
    const oid = toObjectId(id);
    if (!oid) return null;
    ids.push(oid);
  }
  const uniqueCount = new Set(memberIds.map(String)).size;
  const found = await db.collection('users').countDocuments({ _id: { $in: ids } });
  if (found !== uniqueCount) return null;
  return ids;
}

// Attach member details (id, name, email) to each team in a single lookup,
// so the client can render member avatars without extra requests.
async function populate(db, teams) {
  const ids = [
    ...new Set(teams.flatMap((t) => (t.memberIds || []).map(String))),
  ].map((id) => new ObjectId(id));

  const users = ids.length
    ? await db.collection('users').find({ _id: { $in: ids } }, { projection: { passwordHash: 0 } }).toArray()
    : [];
  const byId = new Map(users.map((u) => [u._id.toString(), { _id: u._id, name: u.name, email: u.email }]));

  return teams.map((t) => ({
    ...t,
    members: (t.memberIds || []).map((id) => byId.get(id.toString())).filter(Boolean),
  }));
}

// GET /api/teams/users — minimal user list for the member picker (leader/admin).
exports.listAvailableUsers = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const users = await db.collection('users')
      .find({}, { projection: { passwordHash: 0 } })
      .sort({ name: 1 })
      .toArray();
    res.status(200).json(users.map((u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role })));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving users', error: error.message });
  }
};

// GET /api/teams/mine — teams the caller is a member of (any authenticated
// user; read-only). Mounted with requireAuth only, so plain users can reach it.
exports.listMyTeams = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const me = toObjectId(req.userId);
    if (!me) return res.status(400).json({ message: 'Invalid user id' });
    const teams = await db.collection('teams')
      .find({ memberIds: me })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json(await populate(db, teams));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving teams', error: error.message });
  }
};

// GET /api/teams — list all teams with populated members (leader/admin).
exports.listTeams = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const teams = await db.collection('teams').find({}).sort({ createdAt: -1 }).toArray();
    res.status(200).json(await populate(db, teams));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving teams', error: error.message });
  }
};

// POST /api/teams — create a team (leader/admin).
exports.createTeam = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const name = (req.body.name || '').trim();
    const description = (req.body.description || '').trim();
    if (!name) return res.status(400).json({ message: 'Team name is required' });

    const memberIds = await validateMembers(db, req.body.memberIds);
    if (memberIds === null) return res.status(400).json({ message: 'One or more selected users are invalid' });

    const doc = { name, description, memberIds, createdBy: toObjectId(req.userId), createdAt: new Date() };
    const result = await db.collection('teams').insertOne(doc);
    const [team] = await populate(db, [{ ...doc, _id: result.insertedId }]);
    res.status(201).json(team);
  } catch (error) {
    res.status(400).json({ message: 'Error creating team', error: error.message });
  }
};

// PUT /api/teams/:id — update name/description/members (leader/admin).
exports.updateTeam = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: 'Invalid team id' });

    const updates = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ message: 'Team name cannot be empty' });
      updates.name = name;
    }
    if (req.body.description !== undefined) {
      updates.description = String(req.body.description).trim();
    }
    if (req.body.memberIds !== undefined) {
      const memberIds = await validateMembers(db, req.body.memberIds);
      if (memberIds === null) return res.status(400).json({ message: 'One or more selected users are invalid' });
      updates.memberIds = memberIds;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No changes provided' });
    }

    const result = await db.collection('teams').findOneAndUpdate(
      { _id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ message: 'Team not found' });

    const [team] = await populate(db, [result]);
    res.status(200).json(team);
  } catch (error) {
    res.status(400).json({ message: 'Error updating team', error: error.message });
  }
};

// DELETE /api/teams/:id — admin only (enforced by route middleware).
exports.deleteTeam = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: 'Invalid team id' });

    const result = await db.collection('teams').deleteOne({ _id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Team not found' });
    res.status(200).json({ message: 'Team deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting team', error: error.message });
  }
};
