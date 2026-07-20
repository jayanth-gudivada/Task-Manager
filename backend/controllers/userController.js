const { ObjectId } = require('mongodb');
const { ROLES } = require('../roles');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Never expose password hashes.
const PROJECTION = { projection: { passwordHash: 0 } };

// GET /api/users — admin: list every user for the management table.
exports.listUsers = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const users = await db.collection('users')
      .find({}, PROJECTION)
      .sort({ createdAt: 1 })
      .toArray();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving users', error: error.message });
  }
};

// PUT /api/users/:id — admin: edit a user's name, email, and/or role.
// Guardrails prevent the admin from locking themselves out.
exports.updateUser = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { id } = req.params;

    let target;
    try {
      target = await db.collection('users').findOne({ _id: new ObjectId(id) });
    } catch {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updates = {};

    // Name
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ message: 'Name cannot be empty' });
      updates.name = name;
    }

    // Email (must stay unique)
    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!EMAIL.test(email)) {
        return res.status(400).json({ message: 'A valid email is required' });
      }
      if (email !== target.email) {
        const clash = await db.collection('users').findOne({ email });
        if (clash) return res.status(409).json({ message: 'Another account already uses that email' });
      }
      updates.email = email;
    }

    // Role
    if (req.body.role !== undefined) {
      const role = String(req.body.role);
      if (!ROLES.includes(role)) {
        return res.status(400).json({ message: `Role must be one of: ${ROLES.join(', ')}` });
      }
      // Can't demote yourself — guarantees at least one admin always remains,
      // so the app can never be locked out of its admin functions.
      if (target._id.toString() === req.userId && role !== 'admin') {
        return res.status(400).json({ message: 'You cannot change your own role' });
      }
      updates.role = role;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No changes provided' });
    }

    const result = await db.collection('users').findOneAndUpdate(
      { _id: target._id },
      { $set: updates },
      { returnDocument: 'after', projection: { passwordHash: 0 } }
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: 'Error updating user', error: error.message });
  }
};
