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
  use: set `PASSWORDLESS_MANAGER` to false and remove `SHORTCUT_LOGIN` in
  `seedData.ts`, and replace `tenderRepository.signIn` with a real auth call.
- `PASSWORDLESS_MANAGER` is on, at the owner's request: the sign-in screen,
  live site included, has "Continue as Manager", which opens the Manager
  account with no password for anyone who can load the page.
- The session is kept in `sessionStorage` (ends when the browser closes). Every
  storage access is guarded, since storage throws in private mode.
- Signing in lands on `/dashboard`, except that a tender page (`/tenders/<id>`,
  where notification links point) is carried through `?next=` and reopened.
  `destinationAfterSignIn` in `AuthContext.tsx` accepts only that shape. Signing
  out does not carry the open tender to the next person.
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

### 2026-09-30: Pipeline filter, tender links through sign-in
- Removed the owner filter from the tenders pipeline. The Owner column, export
  field and bulk reassignment stay.
- Notification links to a tender reopen that tender after sign-in again. Only
  tender pages are carried; every other screen still opens the dashboard.

### 2026-10-01: Per-person passwords
- Add Person requires a password (8+ characters); Edit can reset one. Each
  person changes their own from the account menu. The roster flags anyone
  still on the shared starting password.
- The Edit dialog opens with the person's current password in the field
  (masked, with a reveal toggle). Only a different, non-empty value is saved
  and length-checked, so re-saving someone still on `123` is not refused. An
  empty field had looked as though the password had been wiped.
- `migrateUsers` used to copy name, role and territory from the seed roster
  on every load, so edits to seeded people reverted on refresh. It now only
  upgrades records still on a pre-department role.
- The session is looked up again on every `refreshData`, so a change to your
  own role or territory applies at once. Deactivating or removing yourself
  signs you out. It no longer switches you into another admin's account.
- Tabs reload the store when another tab saves (`storage` event), so a person
  added in one tab can sign in from another.
- Reset Seed Data is limited to the Manager and Admin 1, and asks first.

### 2026-10-01: Charts and long lists
- Every chart takes its tooltip, axes, legend and motion from
  `components/charts/chartKit.tsx`. Legend and tooltip rows keep the order
  the series are drawn in; Recharts sorts them alphabetically by default.
- The dashboard volume chart is 12 months of smooth areas (Received, Awarded,
  Rejected), not 6 months of bars. Location bars run sideways so long names
  fit. Scatter dots animate in CSS (`popDot` in chartKit, `.scatter-dot`),
  not through Recharts, whose per-point animation stutters at ~370 points.
  The chart is keyed on its filters so the sweep replays.
- The reports pie is a donut with a legend beside it; the size chart shows
  the win rate its title promises. Year filters come from the data.
- The dashboard's YoY figure compares year to date with the same period last
  year. It used to fall back to a made-up +12%.
- Follow-ups and Monitoring render 25 rows at a time (`components/ui/ShowMore.tsx`),
  resetting when the tab or a filter changes. All dialogs close on Escape.

### 2026-10-01: Visual refresh
- The look is set in `globals.css`: `@theme` raises the radius scale
  (`rounded-md` is 8px), adds `shadow-card`/`shadow-pop` and the
  `animate-fade-in`/`animate-pop-in` motions, and the canvas and borders are
  lighter. Field focus rings and the select chevron are unlayered CSS on
  purpose, so they win over every screen's utilities.
- Cards are `rounded-xl` with `shadow-card`; page titles are `text-xl`.
- The sidebar keeps the brand red with a slight gradient, white active pill
  and a profile card. Avatars use `personInitial` (`lib/initials.ts`), which
  skips "Engr."/"Sir", since nearly everyone showed "E".

### 2026-10-01: Motion
- The shell keys `.page-enter` on the route; each page's top-level sections
  rise in, staggered (`globals.css`). `.stagger` does the same for grids.
  Both use `backwards` fill so no transform is left behind to trap a fixed
  dialog, and `.fixed` children are excluded.
- The sidebar highlight is one element moved by a CSS transform transition,
  not `motion`: a JavaScript spring froze while the next page rendered. It
  moves on click (`pendingPath`), before the route commits. Tab underlines
  still use `motion` layoutIds (`components/ui/TabUnderline.tsx`).
- `getTenders` reads a cached, index-joined list (`populatedTenders`) keyed
  on `db.revision`, which every save, load and `refreshData` bumps. It was
  ~17ms per call and ran several times per navigation. The tender objects
  it returns are shared: treat them as read-only.
- Dashboard and Reports charts mount a frame apart behind `DeferredChart`
  (shimmer placeholder), so the page paints before the charts build.
- Navigation measured on a production build: highlight moves in 3–26ms,
  the dashboard shows in ~30ms with every chart drawn by ~220ms. Dev mode
  is several times slower (React's dev `createElement` dominates).
- `CountUp` animates headline figures. It times from the first frame and
  discounts long stalls (capped at 1s), since the dashboard's first build
  blocks the main thread long enough to skip the whole count.
- Buttons give slightly on press, clickable cards lift, new rows fade in.
  `prefers-reduced-motion` turns all of it off, `motion` included
  (`MotionConfig` in `providers.tsx`).

### 2026-10-01: Manager vs Admin 1, and access audit
- The Manager has everything. Only the Manager reopens a closed tender (both
  Awarded and Rejected, enforced in the repository, not just the dialog),
  deletes a tender, and manages Manager and Admin 1 accounts. Admin 1 manages
  everyone below Admin 1 (`canManagePerson`, `assignableRoles`). The guard is
  now "one active Manager must remain", checked only when a change would
  remove one.
- Territory now scopes the Manager and Admins too: All UAE sees everything, a
  region sees that region plus their own tenders. Before, the header said
  "Scope DUBAI" while the lists showed everything, and `scopeTenders` let
  admins skip the territory check that single tenders applied.
- Fixed while auditing: comments had no access check, and @mentions notified
  people who could not open the tender. `updateTender` wrote any field in the
  patch (status, deletedAt) and logged history before checks that could
  throw; it now takes editable fields only and checks first. Notifications
  for tenders a person can no longer open are held back, and deadline alerts
  go only to monitors whose territory covers the tender.

## Open items

- **Shared database.** The biggest gap. Staff can't see each other's tenders
  and follow-ups until data moves off the browser to a server store.
- **Real authentication** to replace the placeholder browser-side credentials.
