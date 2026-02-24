# Architectural Patterns

Patterns that appear across multiple files and should be preserved when making changes.

---

## 1. Chore Template / Instance Split

The core data model separates *what a chore is* from *when it occurs*.

- **Templates** live in `chores` table (`server/db.js:20`) — recurrence rules, title, assignee.
- **Instances** are computed at query time by `expandOccurrences()` (`server/recurrence.js:8`).
- **Completions** track per-instance state in `chore_completions` keyed on `(chore_id, occurrence_date)` (`server/db.js:32`).

The merge happens in `GET /api/chores` (`server/routes/chores.js:10-46`): fetch all templates, expand into occurrences, join completions via an in-memory map, return flat `ChoreInstance[]`.

**Consequence:** Deleting a chore deletes all completions (CASCADE). There is no concept of "future-only" deletion — it's all or nothing.

---

## 2. Composite Instance ID

Each occurrence is identified by the string `"${chore_id}-${occurrence_date}"` (`server/routes/chores.js:35`). This ID flows to the client as `ChoreInstance.id` (`client/src/api.ts:27`). It is used as FullCalendar event ID (`client/src/components/CalendarView.tsx:25`) and makes each calendar event uniquely addressable without a database lookup.

---

## 3. Refresh-After-Mutate Pattern

`App.tsx` does not optimistically update local state. Every mutation (create, update, delete, complete, uncomplete, team changes) ends with a call to `refreshInstances()` (`client/src/App.tsx:61`), which re-fetches the full instance list for the current date range. This keeps the client in sync with the server without complex cache invalidation.

---

## 4. Modal State Machine

Three mutually exclusive UI states managed as a discriminated union in `App.tsx:14`:

```
none  ←→  chore (create/edit)
      ←→  completion (view/toggle)
            ↓ onEdit
          chore (edit, same instance)
```

`switchToEdit()` (`client/src/App.tsx:84`) handles the completion → edit transition. Components never manage their own open/close state; the parent `App` controls it entirely via the `modal` state variable.

---

## 5. Async Prop Handlers with Local Saving State

Every modal component receives mutation callbacks typed as `() => Promise<void>`. Components track their own `saving` boolean to disable the submit button during the async call:

- `ChoreModal.tsx:44` — `saving` state, button disabled at `client/src/components/ChoreModal.tsx:120`
- `CompletionModal.tsx` — handlers `await` then call `onClose()` immediately after

The pattern: `setSaving(true)` → `await handler()` → `setSaving(false)` (in finally) → `onClose()`.

---

## 6. Local Date Semantics (YYYY-MM-DD)

All dates are stored and transmitted as `YYYY-MM-DD` ISO strings and must be parsed as **local** dates, not UTC, to avoid timezone-shift bugs.

- `recurrence.js:71-74` — `parseDate()` uses `new Date(y, m-1, d)` (local constructor).
- `CompletionModal.tsx:16` — `new Date(date + 'T00:00:00')` forces local interpretation.

Never use `new Date('YYYY-MM-DD')` directly — it parses as UTC midnight and will show the wrong day in negative-UTC-offset timezones.

---

## 7. Singleton API Module

`client/src/api.ts` exports a single `api` object. All HTTP calls go through the generic `request<T>()` helper at `api.ts:38`, which sets `Content-Type: application/json`, parses error responses, and throws a typed `Error`. No component calls `fetch()` directly.

---

## 8. Color Assignment via getAssigneeColor()

Assignee colors are derived from the member's index in the `members[]` array using a fixed 8-color palette. The helper is defined in `TeamPanel.tsx:13` and imported by `CalendarView.tsx:7`. Adding a color requires updating the arrays in both the avatar section (`TeamPanel.tsx:7`) and the hex-color section (`TeamPanel.tsx:13`) to stay in sync.

---

## 9. ESM __dirname Workaround

The project uses `"type": "module"`. Any server file that needs the current directory must use:

```js
import { fileURLToPath } from 'url'
import { dirname } from 'path'
const __dirname = dirname(fileURLToPath(import.meta.url))
```

Used in `server/db.js:3` and `server/index.js:4`. Do not use `__dirname` bare — it does not exist in ESM.

---

## 10. Optional Fields as null, Not ""

When a field is absent (no assignee, no description, no end date), it is sent to the server as `null` explicitly, not as an empty string. The server stores `null` in SQLite. The client checks for `null` to display "Unassigned" or omit optional UI sections. See `client/src/api.ts:57` and `server/routes/chores.js:55`.
