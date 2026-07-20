const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL = '7d';       // sessions last a week
const BCRYPT_ROUNDS = 10;     // deliberate slowness against brute force

// Strip the password hash before a user object ever leaves the server.
function publicUser(u) {
  return { _id: u._id, name: u.name, email: u.email, role: u.role };
}

function issueToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

// POST /api/auth/register — open self-registration.
exports.register = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!name || !EMAIL.test(email) || password.length < 6) {
      return res.status(400).json({
        message: 'Name, a valid email, and a password of at least 6 characters are required',
      });
    }

    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    // Everyone signs up as a plain user; an admin elevates roles later through
    // User Management. Admin identity lives entirely in the DB role.
    const doc = { name, email, passwordHash, role: 'user', createdAt: new Date() };
    const result = await db.collection('users').insertOne(doc);
    const user = { ...doc, _id: result.insertedId };

    res.status(201).json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Error creating account', error: error.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    const user = await db.collection('users').findOne({ email });
    // Same response whether the email is unknown or the password is wrong,
    // so an attacker can't probe which emails have accounts.
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.status(200).json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// GET /api/auth/me — validate the session and return the current user.
exports.me = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { ObjectId } = require('mongodb');
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.userId) });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Error loading user', error: error.message });
  }
};
