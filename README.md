# Inspire Tender & Project Management System

Tender and project management system for Inspire Builders General Contracting
(Abu Dhabi & Dubai, UAE), built with **Next.js 16** (App Router, Turbopack), React 19 and
Tailwind CSS v4.

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in any keys you need.
3. Start the dev server:
   ```
   npm run dev
   ```
   The app runs at http://localhost:3000 (Next picks the next free port if
   3000 is taken) and redirects to `/dashboard`.

## Scripts

| Script          | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Next.js dev server (port 3000, or next free)  |
| `npm run build` | Production build                              |
| `npm start`     | Serve the production build on port 3000       |
| `npm run lint`  | Type-check with `tsc --noEmit`                |
| `npm run clean` | Remove `.next` and `out`                      |

## Project structure

```
src/
  app/                      App Router routes + root layout
    layout.tsx              fonts, metadata, providers, shell
    providers.tsx           AuthProvider, mounted client-side only
    app-shell.tsx           header + sidebar + command palette (⌘K)
    globals.css             Tailwind v4 entry and brand design tokens
    page.tsx                redirects to /dashboard
    dashboard/              /dashboard
    tenders/                /tenders, /tenders/new, /tenders/[id]
    awarded/                /awarded
    followups/              /followups
    monitoring/             /monitoring (Manager, Admin 1, Admin 2)
    reports/                /reports
    admin/                  /admin/{import,users,sources,consultants}
  views/                    page-level view components
  components/               layout, modal and UI components
  context/                  AuthContext (current user + data version)
  lib/                      repositories, permissions, followUpPolicy, money,
                            normalize, notify
  types/                    shared domain types
public/                     static assets served at /
```

## Data layer

Tenders, users, awards and follow-ups live in an in-memory repository
(`src/lib/repositories/tenderRepository.ts`) that persists to `localStorage`
under the key `inspire_db_v2` and seeds itself on first load. Data saved by an
earlier build under `inspire_db_v1` is migrated on first read (old role names
are mapped onto the department roles below, and anyone missing from the roster
is added). Because that
state only exists in the browser, `src/app/providers.tsx` mounts the app on the
client and shows a boot screen during server rendering — this keeps server and
client markup consistent.

There is no server database: the browser *is* the store. Each browser keeps its
own independent copy of the data, so edits persist across reloads on that
machine but are never shared between browsers, devices or private windows.
Clearing site data resets the app to its seed state.

## Signing in

The app opens on a sign-in screen and no route renders without a session.

**Development credentials:** the form is prefilled with `123` / `123`,
which signs in as the Manager. Any roster email also works with the password
`123` (for example `bilal@inspire.ae`), which is how you switch between
roles to check scoping. Sign out from the account menu in the header.

**These are placeholders, not security.** There is no server: the roster and
its passwords live in the browser, where anyone can read them. Before this is
used for real, remove the prefilled values and the `SHORTCUT_LOGIN` entry in
`seedData.ts`, and replace `tenderRepository.signIn` with a real authentication
call. Deactivated and removed accounts are refused, and a wrong password and
an unknown address return the same message so the form cannot be used to
discover who has an account.

## Roles & access

The Tendering Department structure is defined in `src/types/index.ts` and
enforced in `src/lib/permissions.ts`. Scoping happens in the data layer
(`scopeTenders`), so a restricted user never receives another person's tender.

| Role | Person | Access |
| --- | --- | --- |
| `MANAGER` | Engr. Hassan | Full access: view, monitor, assign and follow up on every tender; add persons and edit roles |
| `ADMIN_1` | Syed Shahzaib | Full access, plus adding persons and editing roles & permissions; monitors and assists follow-ups past the 2-month window |
| `ADMIN_2` | Haseeb | Full tender administration: tender details (Excel format), target dates, status, pending/overdue follow-ups |
| `SALESPERSON` | Engr. Bilal, Sir Yaqub, Engr. Waseem, Engr. Hamad (and Engr. Hassan as a source) | Only tenders they are assigned or sourced; must follow up continuously |
| `DUBAI_VILLAS` | Engr. Zeeshan | Dubai villa tenders only, plus anything specifically assigned to him |

Adding people and changing roles is limited to `MANAGER` and `ADMIN_1`. Recording an award and assigning
a tender to a salesperson require `MANAGER`, `ADMIN_1` or `ADMIN_2`; reverting a
closed (Awarded / Rejected) tender requires `MANAGER` or `ADMIN_1`.

## Tender follow-up rule

Implemented in `src/lib/followUpPolicy.ts`.

Every tender must be actively followed up after submission for a maximum of
**two months**. All follow-up activity is recorded against the tender. After two
months the tender must carry a clear status:

1. **Awarded**
2. **Rejected**
3. **Still Under Process / Ongoing** (`UNDER_REVIEW`)

The deadline is `submittedAt + 2 months`. A scheduled next follow-up is never
placed beyond that deadline — a later date is pulled back to it. A tender past
the deadline with no clear status is reported as **breached**: it is flagged on
the tender page, given its own bucket on `/followups`, raised on the dashboard,
and notified to the salesperson and to the Manager, Admin 1 and Admin 2 when the
follow-up check runs from the header.

## Management & admin monitoring

`/monitoring` is restricted to the Manager, Admin 1 and Admin 2. It lists every
tender in scope with the assigned salesperson, submission date, target date,
last follow-up date, next follow-up date, number of follow-ups, the 2-month
deadline with days remaining or overdue, the current status, and pending or
overdue flags. Tiles filter to the active pipeline, pending/overdue follow-ups,
approaching deadlines and breached tenders, and breaches are also summarised per
salesperson.
