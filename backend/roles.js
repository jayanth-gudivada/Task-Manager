// Central definition of the role system so every file agrees on valid values.
// New signups default to 'user'; elevated roles are granted by an admin through
// the User Management screen. Admin identity comes purely from the DB role.
const ROLES = ['admin', 'leader', 'user'];

module.exports = { ROLES };
