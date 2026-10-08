# Inspire Tender & Project Management System

Tender and project management system for Inspire Builders General Contracting
(Abu Dhabi & Dubai, UAE). It tracks every tender from receipt to award or
rejection, enforces the department's 2-month follow-up rule, and gives
management a monitoring board, reports and Excel exports.

Built with **Next.js 16** (App Router, Turbopack), React 19, Tailwind CSS v4,
TypeScript, Recharts and `motion`. Deployed on Vercel from `main`.

> Contributors and AI agents: [CLAUDE.md](CLAUDE.md) holds the full
> architecture, the business rules that must not be broken, and the project
> history.

## Run locally

**Prerequisites:** Node.js 20+

```
npm install
npm run dev
```

The app runs at http://localhost:3000 (or the next free port). No environment
variables or API keys are needed.

## Scripts

| Script          | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Dev server (port 3000, or next free)         |
| `npm run build` | Production build                             |
| `npm start`     | Serve the production build                   |
| `npm run lint`  | Type-check with `tsc --noEmit`               |
| `npm run clean` | Remove `.next` and `out`                     |

## Screens

| Route | Screen | Who |
| --- | --- | --- |
| `/login` | Sign-in | everyone |
| `/dashboard` | KPIs, 12-month volume, locations, win rates | everyone (scoped) |
| `/tenders` | Tender pipeline, filters, Excel export, bulk reassignment | everyone (scoped) |
| `/tenders/new` | New tender bid | everyone |
| `/tenders/[id]` | Tender detail: status, follow-ups, comments, history | anyone the tender is in scope for |
| `/awarded` | Awarded projects (PJ/N) and export | everyone (scoped) |
| `/followups` | Follow-up worklist by urgency, client and owner filters | everyone (scoped) |
| `/monitoring` | Department monitoring board, breaches per salesperson | Manager, Admin 1, Admin 2 |
| `/reports` | Rejection reasons, consultant performance, size buckets | everyone (scoped) |
| `/admin/users` | Team & Permissions | Manager, Admin 1 (Admin 2 read-only) |
| `/admin/sources`, `/admin/consultants` | Lookup tables | Manager, Admin 1, Admin 2 |

Press **Ctrl/Cmd + K** anywhere for the command palette.

## Project structure

```
src/
  app/
    layout.tsx, providers.tsx   root layout; app mounts client-side only
    page.tsx                    sends you to /dashboard or /login
    login/                      sign-in screen
    (app)/                      signed-in routes (layout gates them)
      app-shell.tsx             header, sidebar, command palette
      dashboard, tenders, awarded, followups, monitoring, reports, admin/
    globals.css                 Tailwind v4 theme tokens and motion
  views/                        one component per screen
  components/                   layout, modals, charts (chartKit), UI pieces
  context/AuthContext.tsx       session and route guard
  lib/
    repositories/               tenderRepository (data API), seed data
    permissions.ts              roles and access rules
    followUpPolicy.ts           the 2-month follow-up rule
    money.ts, derive.ts         money in fils, price per m²
    normalize.ts, notify/       data normalisation, notification helpers
  types/index.ts                domain types
public/                         logo and static assets
```

## Data

There is **no server database yet**. All data lives in the browser's
`localStorage` (key `inspire_db_v5`) through
`src/lib/repositories/tenderRepository.ts`, seeded on first load with the real
tender history: 1,156 tenders, 147 awards and 354 consultants (2020–2026).

- Each browser keeps its own copy. Nothing is shared between people or devices.
- Clearing site data, or **Reset Seed Data** in the header (Manager and Admin 1),
  returns to the seeded data.
- When the shipped dataset changes, browsers re-seed automatically (dataset
  stamp), which discards local edits.

## Signing in

Sign in with a roster email and password. Everyone starts on the shared
password `123` until they change it from the account menu; new passwords need
8+ characters. **Continue as Manager** opens the Manager account with no
password, at the owner's request.

**These are placeholders, not security.** The roster and passwords live in the
browser. Before real use: set `PASSWORDLESS_MANAGER` to `false` and remove
`SHORTCUT_LOGIN` in `seedData.ts`, and replace `tenderRepository.signIn` with a
real authentication call.

The session lasts until the browser closes. Notification links to a tender
reopen that tender after signing in.

## Roles & access

| Role | Person | Access |
| --- | --- | --- |
| `MANAGER` | Engr. Hassan | Everything. Only role that reopens or deletes a closed tender and manages Manager and Admin 1 accounts |
| `ADMIN_1` | Syed Shahzaib | All tenders in territory, plus team administration for everyone below Admin 1, sources and consultants |
| `ADMIN_2` | Haseeb | All tenders in territory: details, status, follow-ups, awards. Team is read-only |
| `SALESPERSON` | Engr. Bilal, Sir Yaqub, Engr. Waseem, Engr. Hamad | Only tenders they own or sourced |
| `DUBAI_VILLAS` | Engr. Zeeshan | Dubai villa tenders, plus anything assigned to him |

The Manager and Admins see their **territory**: All UAE covers everything;
Abu Dhabi or Dubai covers that region plus their own tenders. Access is
enforced in the data layer (`scopeTenders`, `canAccessTender`), so a list
never shows a tender that would refuse to open. At least one active Manager
must always remain.

## Tender status flow

```
DRAFT        → SUBMITTED, CANCELLED
SUBMITTED    → UNDER_REVIEW, AWARDED, REJECTED, ON_HOLD, CANCELLED
UNDER_REVIEW → AWARDED, REJECTED, ON_HOLD, CANCELLED
ON_HOLD      → SUBMITTED, UNDER_REVIEW, REJECTED, CANCELLED
AWARDED      → SUBMITTED, UNDER_REVIEW   (Manager only)
REJECTED     → SUBMITTED                 (Manager only; re-bid bumps the revision)
```

Rejecting needs a reason (and a note for "Other"). Awarding needs a unique
project number (PJ/N) and a contract amount. Every change is logged in the
tender's history.

## The 2-month follow-up rule

Implemented in `src/lib/followUpPolicy.ts`. Every submitted tender is followed
up for at most **two months** from submission. After that it must be
**Awarded**, **Rejected** or **Still Under Process** (`UNDER_REVIEW`).

- A next follow-up is never scheduled past the deadline.
- A tender past the deadline without one of those statuses is **breached**: it
  is flagged on the tender page, the follow-up worklist, the dashboard and
  `/monitoring`, and the header's follow-up check notifies the salesperson and
  the Manager and Admins whose territory covers it.

## Open items

- **Shared database** so staff see each other's tenders and follow-ups.
- **Real authentication** in place of the browser-side credentials.
