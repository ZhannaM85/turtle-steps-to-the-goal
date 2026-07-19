# Agent workflow — read this before picking up a new batch of issues

This is the standing operating procedure for working GitHub issues on this
repo. It exists so a new agent session can pick up exactly where the last
one left off without the user re-explaining it. If anything here conflicts
with a direct instruction from the user in the current conversation, the
user's instruction wins.

## What this project is

`turtle-steps-to-the-goal` — a local-first weight-tracking PWA (React 19 +
TypeScript + Vite + Tailwind v4 + Dexie/IndexedDB), deployed to GitHub
Pages. The original scope is `PROJECT_BRIEF.md` at the repo root. The
living architecture doc is `docs/ARCHITECTURE.md` — read it (or the
relevant section) before touching a feature area you haven't worked in
this session; it explains *why* things are shaped the way they are, not
just what's there. `docs/issues-priority.md` is the full closed/open issue
history grouped into tiers — its Notes column is effectively a changelog of
past decisions and their reasoning. Skim the most recent tier before
starting new work; it's the fastest way to pick up context.

## The standing contract

1. **Issue-first.** Don't implement a change without a GitHub issue already
   filed for it, *except*: (a) something already documented as by-design —
   explain why instead of filing, or (b) a feature the user explicitly says
   is too sensitive for a public issue (this repo is public) — build it
   directly and document it under the "Private (no public GitHub issue, by
   request)" section of `docs/issues-priority.md` instead.
2. **Scrutinize before filing.** If a reported issue is actually unnecessary,
   overly complex, underspecified, or already-correct-by-design, say so and
   push back rather than filing it verbatim. Filing a bad issue just to
   file it wastes a later implementation pass.
3. **Prioritize easiest → hardest** within a batch unless told otherwise.
4. **Once told to proceed automatically**, keep implementing the queued
   issues one after another without pausing for confirmation on routine
   ones. **Exception:** if an issue has a genuine fork in end-user behavior
   — multiple materially different valid implementations, not just an
   implementation detail — pause and ask (a short clarifying question is
   enough) even under a standing auto-proceed instruction. An issue whose
   own "Notes" section flags an open design question is a strong signal
   it's this kind of fork. Issues with one clearly-correct-by-elimination
   design (reasoned out and documented) don't need a pause.
5. **Per-issue checklist**, in order:
   - Implement.
   - `npx tsc -b` (there is no `npm run typecheck` script — use `tsc -b`
     directly, or `npm run build` which runs it as a first step).
   - `npm run lint`.
   - Run the affected test file(s), then the full suite (`npx vitest run`
     with no path — currently 600+ tests, takes 2–4 minutes).
   - Update all three docs (see `CLAUDE.md`'s "Closing a GitHub issue"
     section — `docs/issues-priority.md`, `docs/ARCHITECTURE.md`,
     `src/data/releaseNotes.ts`). Do this as part of finishing the issue,
     not a later pass.
   - Close the GitHub issue with a real explanatory comment (`gh issue
     comment <n> --body "..."` then `gh issue close <n>`) — don't just mark
     it done in the docs and move on without actually closing it on GitHub.
   - Commit (stage explicit filenames, never `git add -A`/`.`) and push.
6. **End of batch:** run `gh issue list --state open --json number,title`
   as a final check. Docs saying "✅ Done" is not proof the issue is
   actually closed on GitHub — verify directly. If anything was missed,
   close it properly (with a comment) before considering the batch done.

## Release notes vs. implementation notes

`src/data/releaseNotes.ts` entries are **end-user-facing** copy shown in
the app's Settings/About screen — one plain sentence, no jargon, both
`en`/`ru`. They are not the same as the detailed engineering notes in
`docs/issues-priority.md`/`docs/ARCHITECTURE.md`. Get the entry's `date`
field from the real commit time (`node -e` to compute now + 3h in ISO
format works as a close-enough approximation, since the commit lands
moments later — see existing entries for the exact format). Skip a release
note only when there's truly no new user-facing behavior (e.g. an issue
closed as "already fixed by a previous issue, no code change" — see #131's
and #144's precedent in `docs/issues-priority.md`).

## Environment notes (Windows + Claude Code)

- Primary shell is PowerShell; the Bash tool (Git Bash) is also available
  and uses POSIX syntax. Pick whichever fits the command, don't force one.
- **Never prepend `cd` to a git/gh command** — run it standalone from the
  already-correct working directory. Chaining `cd X && git ...` in one Bash
  call trips the permission checker even when both segments are
  individually allowlisted.
- **Compound shell shapes trigger permission prompts even when every
  segment's prefix is already allowlisted** — heredocs, `cmd > file 2>&1`,
  `cmd; echo`, `A && B` chaining. Adding the missing prefix to the
  allowlist does NOT fix this class of prompt (it's the *shape*, not a
  missing prefix). The fix: don't hand-roll redirects/backgrounding at
  all — use the Bash tool's own `run_in_background: true` and read the
  harness's auto-captured output file afterward (via the `Read` tool, or
  `Grep` on that file for specific lines like `FAIL |Tests\s+\d`). This
  also avoids a real correctness bug: piping a command through `tail` or
  `grep` in the same Bash call **masks its real exit code** (the pipe's
  exit code is the last command's, i.e. `tail`'s, which is always 0) — a
  failing typecheck/test run can silently report success this way.
- Never use raw `grep`/`awk`/`sed`/`sort`/`uniq` pipelines via the Bash
  tool for searching or aggregating — use the Grep tool instead, even for
  multi-step aggregation. Reserve Bash for things that are genuinely
  shell-only.
- `TaskStop` (or ending a session) can leave a Windows `npm run dev`
  process orphaned holding port 5173. If a "port already in use" error
  shows up, check with `netstat -ano | findstr :5173` and `taskkill /PID
  <pid> /F` the specific PID rather than guessing.
- Playwright is not a project dependency. `npx playwright install
  chromium` / `npx playwright screenshot ...` works via npm's own `_npx`
  cache and is useful for visually verifying a UI change (seed IndexedDB
  first via `--load-storage <storageState.json>`, or a small Node script
  that opens the page then calls `indexedDB.open(name)` — **without** an
  explicit version — inside `page.evaluate` to write records into stores
  the app's own Dexie init already created). `storageState.json`'s
  `indexedDB` seeding can silently drop some nested/computed fields; treat
  a resulting oddity (e.g. a missing label) as a seeding-technique
  limitation, not a real app bug, if the same logic already has real unit
  test coverage.
- Full test suite (`npx vitest run`) legitimately takes 2–4 minutes under
  this environment's load — don't assume a long-running background task is
  stuck; poll its output file, don't re-run it.

## Git conventions

- Stage explicit filenames (`git add path/to/file.ts ...`), never `-A` or
  `.` — avoids accidentally sweeping up unrelated in-progress files.
- New commit per fix/issue, not amends, unless the user explicitly asks
  for an amend.
- Never `--no-verify`, never force-push, never skip hooks.
- Commit message: 1–2 sentences on *why*, not a restatement of the diff.
