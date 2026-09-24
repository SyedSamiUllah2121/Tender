@AGENTS.md

# Inspire Tender & Project Management System

Tender and project management system for Inspire Builders General Contracting
(Abu Dhabi & Dubai, UAE). Next.js 16 (App Router, Turbopack), React 19,
Tailwind CSS v4. Repo: https://github.com/SyedSamiUllah2121/Tender (deployed on
Vercel from `main`).

See [README.md](README.md) for setup, structure, roles, the follow-up rule and
monitoring. This file records how the project got here and the decisions that
are not obvious from the code.

## Working notes

- `npm run dev` (port 3000, or the next free one), `npm run lint` is `tsc --noEmit`.
- `.env.local` needs `GEMINI_API_KEY` for the AI features; everything else runs without it.
- There is **no server database**. All data lives in the browser via
  `src/lib/repositories/tenderRepository.ts` (localStorage). Each browser has
  its own copy; nothing is shared between users or devices.
- `src/app/providers.tsx` mounts the app client-side only, because the
  repository seeds with random ids/timestamps that can't match server markup.
- The seeded dataset is `importedSeed.json` (1,156 tenders, 147 awards, 354
  consultants, 2020–2026). The persisted snapshot carries a dataset stamp built
  from record counts; bump `SEED_REVISION` if you change the seed without
  changing the counts, or browsers will keep the old data.
- Sign-in credentials are browser-side placeholders, not security. Before real
  use: remove `SHORTCUT_LOGIN` in `seedData.ts` and replace
  `tenderRepository.signIn` with a real auth call.
- The session is kept in `sessionStorage` (ends when the browser closes). Every
  storage access is guarded, since storage throws in private mode.
- Signing in always lands on `/dashboard`; there is no `?next=` return path.
- `getWhatsAppUrl` lives in `lib/notify/deepLink.ts` so client bundles don't
  pull in the notifier modules that read credentials from `process.env`.
- `/logo.png` is the correct two-tone lockup (2560x760). Its bytes changed
  under the same URL once already; use a versioned filename next time so
  browsers don't keep a cached copy.
- The `xlsx` dependency is still used for exports (Tenders, Awarded, Reports).
- Commit messages explain *why*, in prose, and end with the Claude co-author line.

## Project history

### 2026-09-10: Vite SPA to Next.js 16
- Moved the app from Vite + React with a hash router to the Next.js App Router:
  `/dashboard`, `/tenders`, `/tenders/new`, `/tenders/[id]`, `/awarded`,
  `/followups`, `/reports`, `/admin/{import,users,sources,consultants}`.
- Replaced the `onNavigate` prop with `useRouter`; sidebar active state comes
  from `usePathname`. Added `app-shell.tsx`, next/font fonts, and client-only
  providers.
- Tailwind v4 moved to `@tailwindcss/postcss`. Removed Vite, esbuild, express,
  dotenv and autoprefixer.
- Fixed the Cmd/Ctrl+K command palette, which never opened.

### 2026-09-11: Browser storage kept, Prisma dropped
- Removed an unused `prisma/schema.prisma` that nothing imported (no client,
  migrations or `DATABASE_URL`).
- Unignored `public/`. A stray AI Studio `.gitignore` containing `*` was hiding it.

### 2026-09-15: Department roles, follow-up rule, monitoring, sign-in
- Roles are now `MANAGER`, `ADMIN_1`, `ADMIN_2`, `SALESPERSON`, `DUBAI_VILLAS`,
  with the department roster seeded. Tenders are scoped in the data layer. Fixed
  a bug where source attribution was resolved before the join populated it.
- People admin is limited to Manager and Admin 1, and the app refuses to leave
  nobody able to administer roles.
- `followUpPolicy`: a 2-month window from submission. After it, a tender must be
  Awarded, Rejected or Under Process. Follow-ups are clamped to the window and
  breaches show on the tender page, worklist, dashboard and follow-up check.
- Added `/monitoring` for Manager and both Admins.
- Added the sign-in screen and account management in Team & Permissions.
- UI rework: black header, red sidebar, flatter radius and shadows, darker borders.
- Imported the historical master spreadsheet, then removed the Excel migration
  module (`AdminImportView`, `/admin/import`, `commitImportBatch`, `import_excel`).
- Fixed browsers never re-seeding: the live site kept showing the 60-tender demo
  set after the real import shipped. Added the dataset stamp (see notes above).
  The storage key had previously been hand-bumped v2 to v5 to work around this.
- Deployed to Vercel.

### 2026-09-16: Sign-in route, mobile, dead ends
- Sign-in moved to its own `/login` page. Signed-in screens sit in an `(app)`
  route group whose layout gates them, and `/` decides the destination in the browser.
- Mobile: the sidebar is a drawer below `lg`, closed by the backdrop, Escape or
  navigation, and sticky on desktop.
- Added a "tender not found" state, a branded 404 and an error boundary.
- The follow-up worklist opens on the most urgent bucket that has work in it.
- Dropdowns and dialogs close on click-away and Escape, and dialogs lock page
  scroll. Also fixed the invalid `py-0.2` badges, the lost-reasons pie (it now
  reports missing reasons), and visible focus rings. The login form no longer
  ships prefilled.

### 2026-09-17: Sorting, filters, consultant stats
- The tender and awarded lists sort by received date, newest first, with tender
  number as a tiebreak. Added a Received column and sort indicators. The awarded
  list does not sort by contract date: 89 of 147 awards carry the import date
  as their contract date.
- Follow-ups can be filtered by client and owner, and reports by consultant and
  owner. Filters come from the rows on screen and feed the tab counts, the
  charts and the Excel export. The reports page names the filters applied.
- The consultant directory shows total, awarded and rejected tender counts per
  consultancy. The lead engineer column was removed from the table only; the
  field is still on the record.

### 2026-09-18: Header, branding, session
- The header was rebuilt after inspiregcc.com. A red utility strip carries the
  region scope, active count, follow-ups due, deadline breaches and last check
  time. A white bar below holds the logo, search and the New Tender Bid button.
  The sidebar offset is now 96px.
- The analytics export filename includes the filters it was taken under.
- Added the full company lockup (Arabic line and tagline) to the brand assets.
  It isn't used yet because it's too small to read on sign-in.
- Replaced `logo.png` with the correct lockup (79KB, was 530KB).
- Sign-in always opens the dashboard; the `?next=` mechanism was removed.
- The session moved from localStorage to sessionStorage, so it ends when the
  browser closes. Leftover localStorage sessions are purged.

## Open items

- **Shared database.** The biggest gap. Staff can't see each other's tenders
  and follow-ups until data moves off the browser to a server store.
- **Real authentication** to replace the placeholder browser-side credentials.
- Notification deep links to a specific tender no longer reopen that tender
  after sign-in (a side effect of always landing on the dashboard).
