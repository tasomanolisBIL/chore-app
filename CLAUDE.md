# Office Chore App

Shared office chore dashboard for Orland Park Plastic Surgery — no login, single SQLite database per machine, distributed as an Electron installer. Anyone on the team can add chores, assign them, and mark them done.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + FullCalendar.js |
| Backend | Node.js (ESM) + Express |
| Database | SQLite via built-in `node:sqlite` (Node.js 22+) |
| Desktop | Electron + electron-builder (Windows NSIS installer) |
| SMS | Twilio + node-cron |

> **Important:** `better-sqlite3` will NOT compile on this machine (no Visual Studio / C++ build tools). Always use `node:sqlite`.

## Project Structure

```
chore-app/
├── electron/
│   └── main.cjs          # Electron entry; starts Express, opens BrowserWindow, auto-updater
├── server/
│   ├── index.js          # Express entry point; loads dotenv, mounts routes, starts scheduler
│   ├── db.js             # SQLite init + schema (team_members, chores, chore_completions, settings)
│   ├── recurrence.js     # Expands chore rules → occurrence dates for a date range
│   ├── sms.js            # Twilio wrapper; sendMorningBriefing, sendOverdueAlert, sendWeeklyDigest, checkAndSendAllDone
│   ├── scheduler.js      # node-cron jobs: 9am briefing, 8pm overdue alert, Friday 6pm digest
│   └── routes/
│       ├── chores.js     # CRUD + complete/uncomplete endpoints; triggers checkAndSendAllDone
│       ├── team.js       # Team member CRUD
│       └── settings.js   # GET/POST /api/settings, POST /api/settings/test
└── client/src/
    ├── App.tsx           # Root component: state, data fetching, modal orchestration
    ├── api.ts            # Typed fetch wrappers + shared TypeScript interfaces
    ├── notifications.ts  # (empty — browser notifications removed in favour of SMS)
    └── components/
        ├── CalendarView.tsx      # FullCalendar integration (month/week/day); top nav bar
        ├── ChoreModal.tsx        # Create/edit chore form with recurrence builder
        ├── CompletionModal.tsx   # View occurrence + mark done / undo
        ├── TeamPanel.tsx         # Collapsible sidebar; exports getAssigneeColor()
        ├── AnalyticsDashboard.tsx # Slide-in drawer: monthly reports, streaks
        └── SettingsPanel.tsx     # Slide-in drawer: appearance (theme/dark mode) + SMS credentials
```

## Essential Commands

```bash
npm install              # install all deps (no native compilation)
npm run dev              # server on :3001, Vite HMR on :5173
npm run build            # Vite production build → dist/
npm start                # serve built app from Express on :3001
npm run electron:preview # build + run as Electron app locally
npm run electron:build   # build Windows installer → dist-electron/
npm run electron:publish # build + publish to GitHub Releases (requires GH_TOKEN)
```

## API Surface

All endpoints under `/api`. Vite proxies `/api/*` to `:3001` in dev.

- `GET/POST/DELETE /api/team` — team member CRUD
- `GET /api/chores?start=YYYY-MM-DD&end=YYYY-MM-DD` — expanded occurrences with completion status
- `POST/PUT/DELETE /api/chores/:id` — chore template CRUD
- `POST/DELETE /api/chores/:id/complete` — mark / unmark an occurrence done (`{ occurrence_date }` in body)
- `GET /api/settings` — fetch SMS config (auth token masked)
- `POST /api/settings` — save SMS config (upserts into `settings` table)
- `POST /api/settings/test` — send a test SMS using saved credentials

## Key Data Model Concept

Chores are stored as **templates** (recurrence rules). The API expands them into **instances** at query time via `server/recurrence.js`. Completions are recorded per `(chore_id, occurrence_date)` pair. See `server/db.js` for full schema.

## SMS Notifications

Credentials are stored in the `settings` SQLite table (not in env vars) so each Electron install is independent. Only the machine with credentials configured sends SMS.

| Trigger | Time | Message |
|---|---|---|
| Morning briefing | 9:00 AM daily | Today's chores + assignees |
| All done | Instant (on last completion) | Confirmation all chores complete |
| Overdue alert | 8:00 PM daily | List of incomplete chores |
| Weekly digest | Friday 6:00 PM | Completion rate + top performer |

Configure via **Settings** in the top nav → SMS Notifications section. Twilio toll-free number: (877) 318-5125 (pending verification).

## Auto-Updates

Updates are published to GitHub Releases (`tasomanolisBIL/chore-app`). On startup, Electron checks for updates automatically. To publish a new version, bump the version in `package.json` then run `npm run electron:publish` with a `GH_TOKEN` env var set.

## UI Layout

- **Top nav bar** (in CalendarView header): Add Chore | Analytics | Settings
- **Right sidebar** (TeamPanel): collapsible, shows team members with today's status + monthly completions
- **SettingsPanel drawer**: Appearance (season theme + dark/light) + SMS credentials
- **AnalyticsDashboard drawer**: Monthly reports, team performance, chore breakdown, streaks

## Environment Variables

Loaded via `dotenv` at server startup. Copy `.env.example` to `.env` to configure locally. In production (Electron), credentials are stored in the `settings` SQLite table instead — the `.env` values serve as fallbacks.

| Variable | Description |
|---|---|
| `PORT` | Express port (default: 3001) |
| `NODE_ENV` | Set to `production` by Electron automatically |
| `USER_DATA_PATH` | Set by Electron to persist `chores.db` across app updates |
| `TWILIO_ACCOUNT_SID` | Twilio account SID (fallback; prefer in-app Settings) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token (fallback; prefer in-app Settings) |
| `TWILIO_FROM` | Sending phone number — (877) 318-5125 |
| `MANAGER_PHONE` | Manager's phone number — (708) 645-6901 |

## Database

File: `chores.db` — stored in `USER_DATA_PATH` (Electron userData) or project root in dev.

| Table | Purpose |
|---|---|
| `team_members` | id, name, created_at |
| `chores` | Chore templates with full recurrence rule columns |
| `chore_completions` | Per-occurrence completions; UNIQUE(chore_id, occurrence_date) |
| `settings` | Key-value store for SMS credentials; read by `server/sms.js` |

## Recurrence Types

Supported values for `chores.recurrence_type`:

| Type | Behaviour |
|---|---|
| `none` | One-off, fires on `start_date` only |
| `daily` | Every day from `start_date` |
| `weekly` | Specific days of week (`recurrence_days` JSON array, 0=Sun) |
| `monthly` | Same day of month as `start_date` |
| `monthly_weekday` | Nth weekday of month (`recurrence_week` + `recurrence_weekday`) |
| `custom` | Every N days (`recurrence_interval`) |

## Theming

Defined in `client/src/themes.ts`. Five seasons: `classic`, `winter`, `spring`, `summer`, `autumn`. Each season defines a header gradient, today-highlight colours, accent bar colour, and an 8-colour member palette. `applyTheme(season, mode)` writes CSS variables to `:root`. Persisted to `localStorage['theme']`.

Assignee colours are derived from `member.id % palette.length` — consistent per member regardless of list order.

## Incentive Chores

Chores with `is_incentive = 1` render with a gold `$` badge and shimmer animation on the calendar. Used to flag bonus/reward tasks.

## Dev Notes

- Server uses Node.js ESM (`"type": "module"`) — all `import`/`export`, no `require()`
- Electron entry (`electron/main.cjs`) uses CommonJS because Electron does not support ESM entry points
- Vite root is `client/` — build output goes to `dist/` (project root), which Express serves in production
- `node:sqlite` is synchronous — no `await` needed for DB queries
- Schema migrations use try/catch `ALTER TABLE` blocks — safe to re-run on every startup

## Additional Documentation

| File | When to read |
|---|---|
| `.claude/docs/architectural_patterns.md` | Before modifying data flow, adding state, or touching recurrence logic |
