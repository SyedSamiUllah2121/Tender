// PreToolUse hook: before Claude edits a file that enforces a business rule,
// stop and ask the person at the keyboard, naming the rules that file holds.
// The rules themselves are listed under "Guardrails" in CLAUDE.md.

const GUARDED = [
  {
    match: /src\/lib\/permissions\.ts$/,
    rules:
      'role access (can, canAccessTender, scopeTenders, isInScope), territory scoping, ' +
      'Manager-only reopen/delete, Admin 1 limited to accounts below Admin 1',
  },
  {
    match: /src\/lib\/followUpPolicy\.ts$/,
    rules:
      'the 2-month follow-up rule: deadline = submittedAt + 2 months, follow-ups clamped to the window, ' +
      'BREACHED when no Awarded / Rejected / Under Process status after it',
  },
  {
    match: /src\/lib\/repositories\/tenderRepository\.ts$/,
    rules:
      'the only data store: storage key + seed stamp, status transition machine, award/reject validation, ' +
      'EDITABLE field whitelist in updateTender, checks-before-writes, "one active Manager must remain", ' +
      'notification visibility, the read-only shared tender cache',
  },
  {
    match: /src\/lib\/repositories\/seedData\.ts$/,
    rules:
      'the seeded roster and dataset stamp (SEED_REVISION / SEED_STAMP), PASSWORDLESS_MANAGER, SHORTCUT_LOGIN',
  },
  {
    match: /src\/lib\/repositories\/importedSeed\.json$/,
    rules: 'the 1,156-tender historical dataset; changing it needs a SEED_REVISION bump if the counts stay equal',
  },
  {
    match: /src\/context\/AuthContext\.tsx$/,
    rules:
      'sessionStorage session, guarded storage access, the ?next= whitelist (tender pages only), ' +
      'session re-resolved on every refreshData, cross-tab storage sync',
  },
  {
    match: /src\/types\/index\.ts$/,
    rules: 'the domain model: roles, statuses, money in bigint fils; persisted browser data depends on these shapes',
  },
  {
    match: /src\/lib\/money\.ts$/,
    rules: 'money is integer fils (1 AED = 100 fils) stored as bigint; never floats',
  },
  {
    match: /src\/app\/providers\.tsx$/,
    rules: 'client-only mount (the repository seeds with random ids, so SSR markup can never match)',
  },
];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0); // Not our business; never block on a parse failure.
  }

  const path = String(input?.tool_input?.file_path ?? input?.tool_input?.notebook_path ?? '').replace(/\\/g, '/');
  const hit = GUARDED.find((g) => g.match.test(path));
  if (!hit) process.exit(0);

  const file = path.slice(path.lastIndexOf('/src/') + 1) || path;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason:
          `WARNING: ${file} is a protected core file. It enforces ${hit.rules}. ` +
          'Approve only if this change is meant to alter that behaviour. See "Guardrails" in CLAUDE.md.',
      },
    })
  );
});
