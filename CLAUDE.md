# Office Chore App
2
Shared office chore dashboard — no login, single SQLite database, accessed in the browser. Anyone on the team can add chores, assign them, and mark them done.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + FullCalendar.js |
| Backend | Node.js (ESM) + Express |
| Database | SQLite via built-in `node:sqlite` (Node.js 22+) |

> **Important:** `better-sqlite3` will NOT compile on this machine (no Visual Studio / C++ build tools). Always use `node:sqlite`.

## Project Structure

```
chore-app/
├── server/
│   ├── index.js          # Express entry point; serves /api/* and static dist in prod
│   ├── db.js             # SQLite init + schema (team_members, chores, chore_completions)
│   ├── recurrence.js     # Expands chore rules → occurrence dates for a date range
│   └── routes/
│       ├── chores.js     # CRUD + complete/uncomplete endpoints
│       └── team.js       # Team member CRUD
└── client/src/
    ├── App.tsx           # Root component: state, data fetching, modal orchestration
    ├── api.ts            # Typed fetch wrappers + shared TypeScript interfaces
    ├── notifications.ts  # Browser Notification API integration
    └── components/
        ├── CalendarView.tsx    # FullCalendar integration (month/week/day views)
        ├── ChoreModal.tsx      # Create/edit chore form with recurrence builder
        ├── CompletionModal.tsx # View occurrence + mark done / undo
        └── TeamPanel.tsx       # Collapsible sidebar; exports getAssigneeColor()
```

## Essential Commands

```bash
npm install          # install all deps (no native compilation)
npm run dev          # server on :3001, Vite HMR on :5173
npm run build        # Vite production build → dist/
npm start            # serve built app from Express on :3001
```

## API Surface

All endpoints under `/api`. Vite proxies `/api/*` to `:3001` in dev.

- `GET/POST/DELETE /api/team` — team member CRUD
- `GET /api/chores?start=YYYY-MM-DD&end=YYYY-MM-DD` — expanded occurrences with completion status
- `POST/PUT/DELETE /api/chores/:id` — chore template CRUD
- `POST/DELETE /api/chores/:id/complete` — mark / unmark an occurrence done (`{ occurrence_date }` in body)

## Key Data Model Concept

Chores are stored as **templates** (recurrence rules). The API expands them into **instances** at query time via `server/recurrence.js`. Completions are recorded per `(chore_id, occurrence_date)` pair. See `server/db.js:1` for full schema.

## Additional Documentation

Check these files when working on the relevant areas:

| File | When to read |
|---|---|
| `.claude/docs/architectural_patterns.md` | Before modifying data flow, adding state, or touching recurrence logic |
