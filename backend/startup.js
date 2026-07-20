// Idempotent startup routines run once per boot after the DB connects.
module.exports = async function runStartup(db) {
  await ensureIndexes(db);
  await wipeLegacyGlobalData(db);
};

// Enforce one account per email at the database level.
async function ensureIndexes(db) {
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
}

// One-time migration: the app moved from global tasks/settings to per-user
// data. Any legacy document lacking an ownerId is from the old model and is
// removed so everyone starts fresh. Runs harmlessly (deletes nothing) once done.
async function wipeLegacyGlobalData(db) {
  const tasks = await db.collection('tasks').deleteMany({ ownerId: { $exists: false } });
  const settings = await db.collection('settings').deleteMany({ ownerId: { $exists: false } });
  if (tasks.deletedCount || settings.deletedCount) {
    console.log(
      `Migration: removed ${tasks.deletedCount} legacy tasks and ` +
      `${settings.deletedCount} legacy settings docs (pre-auth global data).`
    );
  }
}
