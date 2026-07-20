// Account settings: user-chosen colors for the fixed task tiers
// (priority / important). Stored as a single document in the `settings`
// collection. Project-base defaults act as the fallback when unset.

const DEFAULTS = {
  priorityColor: '#ef4444',  // Red
  importantColor: '#f59e0b', // Amber
};

const HEX = /^#[0-9a-fA-F]{6}$/;

// Read tier colors, falling back to project-base defaults for anything missing.
exports.getSettings = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const doc = await db.collection('settings').findOne({ key: 'tierColors' });
    res.status(200).json({
      priorityColor: doc?.priorityColor || DEFAULTS.priorityColor,
      importantColor: doc?.importantColor || DEFAULTS.importantColor,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving settings', error: error.message });
  }
};

// Upsert tier colors after validating they are proper hex values.
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
      { key: 'tierColors' },
      { $set: { key: 'tierColors', priorityColor, importantColor, updatedAt: new Date() } },
      { upsert: true }
    );

    res.status(200).json({ priorityColor, importantColor });
  } catch (error) {
    res.status(400).json({ message: 'Error updating settings', error: error.message });
  }
};
