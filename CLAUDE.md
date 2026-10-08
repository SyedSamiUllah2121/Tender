@AGENTS.md

# Inspire Tender & Project Management System

Tender and project management system for Inspire Builders General Contracting
(Abu Dhabi & Dubai, UAE). Next.js 16 (App Router, Turbopack), React 19,
Tailwind CSS v4, TypeScript 5.8. Repo: https://github.com/SyedSamiUllah2121/Tender
(deployed on Vercel from `main`).

This file is the source of truth for how the system is built and which
behaviour must not change by accident. [README.md](README.md) covers setup for
humans; parts of it are out of date (it still names `inspire_db_v2`,
`/admin/import` and a prefilled login form). Where they disagree, this file wins.

---

## Guardrails: read before changing anything

The rules below are business decisions made by the owner, not accidents of
the code. **Before you make a change that would break, weaken or bypass any
of them, stop and warn the user before editing.** Start the warning with
`⚠️ This breaks an existing rule:`, then name the rule (by its number below),
say what would change for which people, and ask for an explicit go-ahead. Do
this even if the user's request seems to imply it. Requests are often worded
loosely, and these rules are easy to break by accident. If the user confirms,
make the change and update this file (rule list and history) in the same
commit.

Also warn when a change *indirectly* breaks a rule: a new screen that reads
`db.tenders` directly, a UI button that skips a repository check, a refactor
that drops a guard.

A `PreToolUse` hook (`.claude/hooks/guard-core-files.mjs`, registered in
`.claude/settings.json`) also asks for confirmation before any edit to the
core files: `permissions.ts`, `followUpPolicy.ts`, `tenderRepository.ts`,
`seedData.ts`, `importedSeed.json`, `AuthContext.tsx`, `types/index.ts`,
`money.ts`, `providers.tsx`. Do not remove or weaken that hook unless the
user asks.

### Access and roles
1. **Scoping happens in the data layer.** Every tender list comes from
   `tenderRepository.getTenders(user)` → `scopeTenders`, and every single tender
   from `getTenderById` → `canAccessTender`. No screen may read `db.tenders`
   or `populatedTenders()` directly to show data. A salesperson must never
   receive another salesperson's tender.
2. **Lists and single tenders use the same rule** (`isInScope`). A list must
   never show a tender that would refuse to open.
3. **Territory scopes the Manager and Admins too.** `region: 'ALL'` sees
   everything; `ABU_DHABI`/`DUBAI` sees that region plus their own tenders.
4. **Manager-only actions:** reopening a closed tender (Awarded → Submitted /
   Under Review, Rejected → Submitted) and deleting a tender. Enforced in the
   repository (`changeStatus`, `softDeleteTender`), not only in the dialog.
5. **Senior accounts:** only the Manager creates, edits, resets or removes
   `MANAGER` and `ADMIN_1` accounts. Admin 1 manages everyone below
   (`canManagePerson`, `assignableRoles`). Admin 2 sees the team read-only.
6. **One active Manager must remain** (`assertManagerRemains`). Checked only
   when a change would remove one.
7. **Award and reassignment** need `MANAGER`, `ADMIN_1` or `ADMIN_2`. A tender
   can only be assigned to an active, non-deleted person.
8. **Comments and @mentions follow tender access.** You comment only where you
   can open the tender; a mention notifies only people who can open it.
9. **Notifications for tenders a person can no longer open are held back**
   (`getNotifications`). Deadline alerts go only to monitors whose territory
   covers the tender.
10. **Every permission check lives in the repository as well as the UI.** UI
    gating with `can()` is a convenience; the repository method must throw on
    its own.

### Tender workflow
11. **Status machine** (`changeStatus`, do not loosen):
    ```
    DRAFT        → SUBMITTED, CANCELLED
    SUBMITTED    → UNDER_REVIEW, AWARDED, REJECTED, ON_HOLD, CANCELLED
    UNDER_REVIEW → AWARDED, REJECTED, ON_HOLD, CANCELLED
    ON_HOLD      → SUBMITTED, UNDER_REVIEW, REJECTED, CANCELLED
    AWARDED      → SUBMITTED, UNDER_REVIEW   (Manager only)
    REJECTED     → SUBMITTED                 (Manager only; re-bid bumps "Rev N")
    CANCELLED    → (terminal)
    ```
12. **Rejecting requires a reason**; reason `OTHER` also requires a note.
13. **Awarding requires** a unique Project Number (PJ/N), a valid contract
    amount, and an award role. Creates an `Award` and notifies.
14. **`updateTender` writes only the `EDITABLE` whitelist.** Status, deletion
    and awards go through their own methods. All checks run *before* anything
    is written, so a refused change leaves no history behind.
15. **Every change is logged** to `activityLogs` (FIELD_UPDATED, REASSIGNED,
    STATUS_CHANGED, SOFT_DELETED, ...). Deletion is soft (`deletedAt`), never a
    splice.
16. **Tender numbers are unique** among live tenders; new ones continue from
    the max (floor 1200). Project numbers continue from the max (floor 209).

### The 2-month follow-up rule (`followUpPolicy.ts`)
17. Deadline = `submittedAt + 2 months` (`FOLLOW_UP_WINDOW_MONTHS`). After it a
    tender must be **Awarded, Rejected or Under Process (`UNDER_REVIEW`)**
    (Cancelled also counts as resolved). Otherwise it is `BREACHED`.
18. A next follow-up is **never scheduled past the deadline**: `clampToWindow`
    pulls it back. Default gap 30 days. `DUE_SOON` is 14 days or less.
19. Breaches show on the tender page, the `/followups` worklist, the dashboard,
    `/monitoring`, and are notified by the follow-up check in the header.

### Data and money
20. **Money is integer fils in `bigint`** (1 AED = 100 fils). Convert only via
    `toFils` / `fromFils` / `formatAED` (`lib/money.ts`). Never store floats.
    `pricePerSqm` is derived (`lib/derive.ts`), never stored.
21. **Persisted shape is load-bearing.** Browsers hold data under
    `inspire_db_v5`. Renaming fields or enum values in `types/index.ts` breaks
    every existing browser's data unless a migration is added in `initialize`
    / `migrateUsers`.
22. **Seed stamp.** `SEED_STAMP` = `SEED_REVISION:tenders:awards:consultants`.
    Changing `importedSeed.json` without changing those counts requires a
    `SEED_REVISION` bump, or browsers keep the old data. A stamp change
    **wipes every browser's local edits** and re-seeds; warn about that.
23. **`migrateUsers` must not overwrite current-role users** from the seed
    roster. Edits made in Team & Permissions must survive a reload.
24. **Cached tenders are shared and read-only.** `populatedTenders()` returns
    shared objects keyed on `db.revision`. Never mutate them; every write goes
    through a repository method that ends in `db.persist()` (which bumps the
    revision).

### Auth and session
25. Session is in **`sessionStorage`** (`inspire_user_id`), ends when the
    browser closes. Every storage access is wrapped in `try/catch`.
26. `?next=` accepts **only tender pages** (`/tenders/<id>`, not `/new`)
    via `destinationAfterSignIn`. Never widen it to arbitrary paths (open
    redirect). Signing out does not carry the open tender.
27. Session is re-resolved on every `refreshData`; deactivating or removing
    yourself signs you out. Other tabs reload on the `storage` event.
28. Sign-in errors use one message for wrong password and unknown email, so the
    form cannot reveal who has an account. Passwords are 8+ characters
    (`MIN_PASSWORD_LENGTH`) when set or changed.
29. `PASSWORDLESS_MANAGER = true` and `SHORTCUT_LOGIN` are **deliberate, at the
    owner's request**. Do not remove them unless asked, and do not add more
    passwordless paths without asking.

### Rendering and UI
30. The app mounts **client-only** (`providers.tsx`). Do not add server
    rendering of data, server actions, or API routes that read the repository:
    it only exists in the browser.
31. Charts use `components/charts/chartKit.tsx` for colours, axes, tooltips,
    legends and motion. Legend and tooltip order follows draw order.
32. Lists over 25 rows use `ShowMore`. Dialogs close on Escape and click-away
    (`useModalDismiss`) and lock page scroll.
33. `prefers-reduced-motion` turns all motion off (CSS and `MotionConfig`).
    `.page-enter` / `.stagger` use `backwards` fill and skip `.fixed` children,
    so they never trap a fixed dialog.
34. Sorting: tenders and awards by received date, newest first, tender number as
    tiebreak. Awards are **not** sorted by contract date (89 of 147 carry the
    import date).

---

## Working notes

- `npm run dev` (port 3000, or next free). `npm run lint` is `tsc --noEmit`
  and must pass before committing. `npm run build` for a production check.
- **No environment variables are needed.** The app has no AI features;
  `GEMINI_API_KEY` and `APP_URL` in `.env.example` are leftovers from the AI
  Studio template, and `@google/genai` is an unused dependency. The WhatsApp
  notifier would read `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_API_TOKEN`, but
  nothing calls it.
- There is **no server database**. Each browser has its own copy; nothing is
  shared between users or devices.
- `getWhatsAppUrl` lives in `lib/notify/deepLink.ts` so client bundles don't
  pull in the notifier modules that read `process.env`.
- `/logo.png` is the two-tone lockup (2560x760). Its bytes changed under the
  same URL once already; use a versioned filename next time.
- `xlsx` is used for exports (Tenders, Awarded, Reports).
- Commit messages explain *why*, in prose, and end with the Claude co-author line.
- This is Next.js 16: read `node_modules/next/dist/docs/` before using an API
  you are unsure of (see AGENTS.md).

---

## Architecture

### Big picture

```
Browser only
┌──────────────────────────────────────────────────────────────┐
│ app/layout.tsx → Providers (client-only mount, MotionConfig)  │
│   └ AuthProvider (session, allUsers, dataVersion, refreshData)│
│       ├ /login           LoginView                            │
│       ├ /                decides /dashboard or /login         │
│       └ (app)/layout.tsx RequireAuth → AppShell               │
│             header + sidebar + ⌘K palette + page              │
│               page.tsx → views/*View.tsx                      │
│                    │ calls                                    │
│                    ▼                                          │
│   lib/repositories/tenderRepository.ts  (single data API)     │
│     uses permissions.ts, followUpPolicy.ts, money, normalize  │
│                    │                                          │
│   InMemoryDatabase `db` ⇄ localStorage "inspire_db_v5"        │
│     seeded from seedData.ts + importedSeed.json               │
└──────────────────────────────────────────────────────────────┘
```

- Pages under `src/app/(app)/*/page.tsx` are thin; the screen lives in
  `src/views/*View.tsx`.
- Views read `currentUser` and `dataVersion` from `useAuth()`, call the
  repository, and call `refreshData()` after a write so everything re-reads.
- The repository is the only module that touches `db`. It validates, checks
  permission, writes, logs activity, creates notifications and persists.

### Directory map

```
src/
  app/
    layout.tsx            fonts (next/font), metadata, <Providers>
    providers.tsx         client-only mount, MotionConfig, AuthProvider
    page.tsx              "/" → /dashboard or /login (client redirect)
    login/                /login (login-screen.tsx → views/LoginView)
    (app)/layout.tsx      RequireAuth + AppShell for every signed-in route
    (app)/app-shell.tsx   header, sidebar drawer, command palette, .page-enter
    (app)/dashboard       /dashboard        DashboardView
    (app)/tenders         /tenders          TendersView
                          /tenders/new      TenderFormView
                          /tenders/[id]     TenderDetailView
    (app)/awarded         /awarded          AwardedView
    (app)/followups       /followups        FollowUpsView
    (app)/monitoring      /monitoring       MonitoringView (Manager, Admins)
    (app)/reports         /reports          ReportsView
    (app)/admin/users     Team & Permissions AdminUsersView
    (app)/admin/sources   AdminSourcesView
    (app)/admin/consultants AdminConsultantsView
    error.tsx, global-error.tsx, not-found.tsx
    globals.css           Tailwind v4 @theme tokens, motion, focus rings
  components/
    layout/AppHeader.tsx  red utility strip (scope, counts, follow-up check,
                          notifications, account menu, Reset Seed Data)
    layout/AppSidebar.tsx red nav, sliding highlight (pendingPath), admin section
    modals/               CommandPalette (⌘/Ctrl+K), StatusChangeModal,
                          ChangePasswordDialog
    charts/chartKit.tsx   shared chart styling and motion
    ui/                   AccessDenied, CountUp, LoadingScreen, ShowMore,
                          StatusBadge, TabUnderline
  context/AuthContext.tsx session, RequireAuth, useAuth/useSession
  lib/
    repositories/tenderRepository.ts  db + repository API (~1,350 lines)
    repositories/seedData.ts          roster, sources, consultants, stamp
    repositories/importedSeed.json    1,156 tenders, 147 awards, 354 consultants
    permissions.ts        can(), scopeTenders, canAccessTender, canManagePerson
    followUpPolicy.ts     2-month rule, monitor rows
    money.ts / derive.ts  fils conversion, price per m²
    normalize.ts          status / source / location normalisation, Excel dates
    notify/               deepLink (client-safe), whatsapp + email (stubs)
    initials.ts           personInitial (skips "Engr."/"Sir")
    useModalDismiss.ts    Escape / click-away for dialogs
    utils.ts              cn() (clsx + tailwind-merge)
  types/index.ts          all domain types and role labels
```

### Domain model (`types/index.ts`)

| Entity | Key fields | Notes |
| --- | --- | --- |
| `User` | role, region (`ABU_DHABI`/`DUBAI`/`OTHER`/`ALL`), isActive, password | soft-deleted via `deletedAt` |
| `Tender` | tenderNumber, revision, status, region, ownerId, sourceId, consultantId, clientId, receivedAt, submittedAt, nextFollowUpAt, tenderAmount/targetPrice (bigint fils), rejectReason | populated fields (owner, source, award, followUps, comments, activityLogs) are joins, not stored |
| `Award` | tenderId, projectNumber (PJ/N, unique), contractAmount (bigint fils), contractDate | one per tender |
| `FollowUp` | tenderId, userId, contactedAt, method (WhatsApp/Call/Email/Visit), outcome, nextActionAt | |
| `Comment` | body, @mentions | soft-deleted |
| `ActivityLog` | action, field, oldValue, newValue | append-only history |
| `Notification` | type (FOLLOWUP_DUE, STATUS_CHANGED, ASSIGNED, MENTIONED, AWARDED), linkUrl `/tenders/<id>` | |
| `Source`, `Consultant`, `Client` | lookup tables | sources have aliases (normalize.ts) |

Statuses: `DRAFT, SUBMITTED, UNDER_REVIEW, AWARDED, REJECTED, CANCELLED, ON_HOLD`.
Active pipeline (`ACTIVE_STATUSES`): `SUBMITTED, UNDER_REVIEW, ON_HOLD`.

### Roles

| Role | Person | Can |
| --- | --- | --- |
| `MANAGER` | Engr. Hassan (`u_hassan`) | everything; only one who reopens/deletes tenders and manages Manager/Admin 1 accounts |
| `ADMIN_1` | Syed Shahzaib | all tenders in territory, team admin below Admin 1, sources, consultants |
| `ADMIN_2` | Haseeb | all tenders in territory, status, follow-ups, awards; team read-only |
| `SALESPERSON` | Bilal, Yaqub, Waseem, Hamad | only tenders they own or sourced |
| `DUBAI_VILLAS` | Engr. Zeeshan | Dubai tenders mentioning "villa", plus own |

`FULL_ACCESS_ROLES = MANAGER, ADMIN_1, ADMIN_2` (`hasFullAccess`). The
`can(user, action, tender?)` actions: `see_all_tenders`, `monitor_department`,
`company_reports` (full access); `create_tender`, `export_excel` (everyone);
`edit_tender`, `log_followup`, `change_status`, `comment` (in scope);
`reassign_owner`, `record_award`, `manage_admin` (full access);
`revert_terminal_status`, `soft_delete` (Manager); `manage_users` (Manager,
Admin 1).

### Repository API (`tenderRepository`)

- Users: `getUsers`, `getRoster`, `getUserById/ByEmail`, `createUser`,
  `updateUser`, `deleteUser`, `setPassword`, `changePassword`,
  `usesDefaultPassword`, `countTendersOwnedBy`.
- Auth: `signIn`, `signInAsManager` (the one place to swap for real auth).
- Lookups: `getSources`, `getConsultants`, `getClients`, `createSource`,
  `createConsultant`.
- Tenders: `getTenders(user, filters)`, `getTenderById(user, id)`,
  `createTender`, `updateTender`, `changeStatus`, `softDeleteTender`,
  `getNextTenderNumber`, `getNextProjectNumber`.
- Activity: `addFollowUp` (clamped to window), `addComment` (mentions).
- Notifications: `getNotifications`, `markNotificationRead`,
  `markAllNotificationsRead`.
- Monitoring: `getMonitorRows`, `runFollowUpCron` (run from the header's
  follow-up check; no real scheduler exists).
- Store: `populatedTenders` (cached joins), `invalidateCache`,
  `reloadFromStorage`, `resetToSeed` (no actor check in the repository; the
  header shows it only to Manager / Admin 1 and confirms first).

### Storage lifecycle

1. `new InMemoryDatabase()` at import time runs `initialize()`.
2. Reads `inspire_db_v5` (falls back to legacy `inspire_db_v1`, migrated once).
3. If the snapshot's `seedStamp` differs from `SEED_STAMP`, it is discarded.
4. Otherwise it is loaded (bigint strings revived, `migrateUsers` applied).
5. With nothing usable, it seeds from `generateSeedTenders()` and persists.
6. Every write calls `db.persist()`: bumps `revision`, serialises bigints as
   strings, writes localStorage. Failures are logged, not thrown.

### Adding things safely

- **A new screen:** add `src/app/(app)/<route>/page.tsx` rendering a view in
  `src/views/`. Get data only via repository methods with `currentUser`.
  Gate with `can()` and render `AccessDenied` when refused. Add it to the
  sidebar nav (and the admin section if it is admin-only) and to the command
  palette.
- **A new tender field:** add to `Tender` (optional, so old browser data still
  loads), to `EDITABLE` and `fieldsToTrack` in `updateTender` if editable, to
  `createTender`, the form, the detail view and the Excel export.
- **A new permission:** add an `Action`, decide it in `can()`, check it in the
  repository method, then gate the UI.
- **A new status:** touches the status machine, `ACTIVE_STATUSES` /
  `RESOLUTION_STATUSES`, `StatusBadge`, `StatusChangeModal`, `normalizeStatus`,
  charts and reports. Warn first (rules 11, 17).

---

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
