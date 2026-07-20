# Phase 1 Design — Auth + User Model + Redux Foundation

**Date:** 2026-07-20
**Status:** Approved, building
**Context:** Converting the single-user Task Manager into a multi-user team
application. This is Phase 1 of a phased rollout; it delivers the identity
foundation every later phase depends on.

## Phased roadmap (for context)

1. **Phase 1 (this spec):** Auth + per-user data + Redux store.
2. Phase 2: Teams + admin (Teams menu, team cards, create/manage).
3. Phase 3: Task assignment between users with deadlines.
4. Later: invite/approval restrictions on registration.

Each phase gets its own spec → plan → build cycle.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Auth mechanism | Email + password, **JWT** bearer tokens |
| Password hashing | **bcryptjs** (pure-JS, builds cleanly in alpine Docker; salted + slow). MD5 explicitly rejected as unsafe. |
| Data scoping (Phase 1) | **Own tasks only** — each user isolated |
| Registration | **Open self-registration** now; restrict in a later phase |
| Admin bootstrap | Seed `gudivada.jayanth@hono.ai` as `role: 'admin'` |
| Existing prod data | **Wipe** old global tasks/settings; everyone starts fresh |
| State management | **Redux Toolkit** — `authSlice` + `settingsSlice`. Tasks stay in TaskContext for now (limit blast radius). |
| Token storage | `localStorage` (pragmatic for this scale; httpOnly cookie deferred) |

## A. Data model

**New `users` collection**
```
{ _id, name, email (unique index), passwordHash, role: 'admin' | 'user', createdAt }
```
- Password stored only as bcrypt hash.
- Unique index on `email`.

**`tasks` collection** gains `ownerId` (the owning user's `_id`). All existing
global tasks are deleted in a one-time migration.

**`settings` collection** becomes per-user:
`{ ownerId, priorityColor, importantColor, updatedAt }` — replacing today's
single global `{ key: 'tierColors' }` doc.

## B. Backend (Express)

**New auth surface**
| Route | Behavior |
|---|---|
| `POST /api/auth/register` | validate → ensure email unused → bcrypt hash → insert user → return `{ token, user }` |
| `POST /api/auth/login` | find by email → `bcrypt.compare` → return `{ token, user }` |
| `GET /api/auth/me` | via `requireAuth` → return current user (no hash) |

**`requireAuth` middleware:** reads `Authorization: Bearer <token>`, verifies
JWT with `JWT_SECRET`, sets `req.userId` + `req.userRole`, else 401.

**Per-user scoping:** every task and settings route is wrapped in `requireAuth`
and every query is filtered/stamped with `ownerId: req.userId`. No endpoint can
read or mutate another user's data. `user` never sees anyone else's tasks.

**Startup tasks (idempotent):**
- Seed: upsert the admin user (`gudivada.jayanth@hono.ai`, `role:'admin'`) with
  a hashed password from an env-provided value.
- Migration: one-time drop of legacy global tasks and the old global settings
  doc.

**New secret:** `JWT_SECRET` — handled like `MONGO_URI` (`.env` locally, Render
env var in prod; never committed, never in the image).

## C. Frontend (React + Redux Toolkit)

**Store** (`src/store/`)
- `authSlice` — `{ user, token, status }`; thunks `login`, `register`, `logout`,
  `loadMe`. Token hydrated from `localStorage` on boot; persisted on change.
- `settingsSlice` — `{ priorityColor, importantColor, status }`; thunks
  `fetchSettings`, `updateSettings`. Moves tier colors out of TaskContext.
- `store.js` — `configureStore` combining both; `<Provider>` wraps the app in
  `main.jsx`.

**API layer** (`services/api.js`)
- Axios request interceptor attaches `Authorization: Bearer <token>` from the
  store/localStorage.
- Response interceptor: on 401 → clear auth → redirect to login.
- `authService` with `register`, `login`, `me`.

**Screens & flow**
- `LoginPage`, `RegisterPage` — MUI, purple theme, client-side validation,
  error toasts.
- **Route guard** in `App.jsx`: no valid token → auth screens only; logged in →
  existing calendar/tasks/performance/settings layout, now scoped to the user.
- Sidebar: add user avatar + logout control. **Teams** menu item rendered only
  when `role === 'admin'` (gate wired now; menu contents are Phase 2).

## D. Explicitly out of scope for Phase 1

Teams, team cards, task assignment between users, invite/approval-gated
registration, moving tasks into Redux, httpOnly-cookie auth. All deferred to
later phases.

## Success criteria

- A visitor can register, is auto-logged-in, and lands on an empty personal
  calendar.
- Logging in as a second user shows entirely separate tasks/settings.
- `gudivada.jayanth@hono.ai` sees the (empty, admin-gated) Teams menu item;
  a normal user does not.
- Refreshing the page keeps the session.
- No route returns another user's data (verified by test).
- The app still builds into the single Docker image and deploys via the
  existing CI/CD pipeline.
