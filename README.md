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
    reports/                /reports
    admin/                  /admin/{import,users,sources,consultants}
  views/                    page-level view components
  components/               layout, modal and UI components
  context/                  AuthContext (current user + data version)
  lib/                      repositories, permissions, money, normalize, notify
  types/                    shared domain types
public/                     static assets served at /
```

## Data layer

Tenders, users, awards and follow-ups live in an in-memory repository
(`src/lib/repositories/tenderRepository.ts`) that persists to `localStorage`
under the key `inspire_db_v1` and seeds itself on first load. Because that
state only exists in the browser, `src/app/providers.tsx` mounts the app on the
client and shows a boot screen during server rendering — this keeps server and
client markup consistent.

There is no server database: the browser *is* the store. Each browser keeps its
own independent copy of the data, so edits persist across reloads on that
machine but are never shared between browsers, devices or private windows.
Clearing site data resets the app to its seed state.
