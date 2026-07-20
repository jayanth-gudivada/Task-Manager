// Per-user account settings: each user's chosen colors for the fixed task tiers
// (priority / important). Stored as one document per user in the `settings`
// collection, keyed by ownerId. Project-base defaults act as the fallback when
// unset. All access is scoped to req.userId (set by requireAuth).

const DEFAULTS = {
  priorityColor: '#ef4444',  // Red
  importantColor: '#f59e0b', // Amber
};

const HEX = /^#[0-9a-fA-F]{6}$/;

// Read this user's tier colors, falling back to project-base defaults.
exports.getSettings = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const doc = await db.collection('settings').findOne({ ownerId: req.userId });
    res.status(200).json({
      priorityColor: doc?.priorityColor || DEFAULTS.priorityColor,
      importantColor: doc?.importantColor || DEFAULTS.importantColor,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving settings', error: error.message });
  }
};

// Upsert this user's tier colors after validating they are proper hex values.
exports.updateSettings = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { priorityColor, importantColor } = req.body;

    if (!HEX.test(priorityColor || '') || !HEX.test(importantColor || '')) {
      return res.status(400).json({ message: 'Colors must be valid hex values like #ef4444' });
    }
    if (priorityColor.toLowerCase() === importantColor.toLowerCase()) {
      return res.status(400).json({ message: 'Priority and Important colors must differ' });
    }

    await db.collection('settings').updateOne(
      { ownerId: req.userId },
      { $set: { ownerId: req.userId, priorityColor, importantColor, updatedAt: new Date() } },
      { upsert: true }
    );

    res.status(200).json({ priorityColor, importantColor });
  } catch (error) {
    res.status(400).json({ message: 'Error updating settings', error: error.message });
  }
};
