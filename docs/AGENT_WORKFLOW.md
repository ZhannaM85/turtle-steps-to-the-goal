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

**`docs/agent-mistakes-log.md`** tracks every avoidable permission prompt
and every skipped/out-of-order step from this contract, at the user's
explicit request (2026-07-19). Log a new row **the moment it happens**,
not retroactively — including ones you catch yourself, not just ones the
user points out.

## The standing contract

1. **Issue-first.** Don't implement a change without a GitHub issue already
   filed for it, *except*: (a) something already documented as by-design —
   explain why instead of filing, or (b) a feature the user explicitly says
   is too sensitive for a public issue (this repo is public) — build it
   directly and document it under the "Private (no public GitHub issue, by
   request)" section of `docs/issues-priority.md` instead.
2. **Scrutinize before filing — but only using what you already know, don't
   go dig for it.** If something is *immediately* obvious without opening
   files or running anything (e.g. it's already documented as by-design, or
   you were just reading the exact code being reported on moments ago), say
   so and push back rather than filing it verbatim. But do **not** read
   code, run the app, or otherwise investigate *in order to* decide whether
   to file — that's implementation-time work. A user reporting a bug from
   the live app is the source of truth at filing time; take the report at
   face value, file it (root cause "not yet investigated" is a perfectly
   fine thing to write in the issue body), and do the actual digging when
   you get to implementing it. Concretely: don't open a live-verification
   tool (Playwright, dev server, etc.) between "user reported a bug" and
   "issue filed" — confirmed directly by the user, who interrupted exactly
   this sequence mid-session on 2026-07-19.
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
- **⚠️ HIGH PRIORITY — compound shell shapes trigger permission prompts
  even when every individual program is already allowlisted.** This has
  caused repeated, avoidable user interruptions (2026-07-19, three times
  in one session alone) and is the single most common source of unwanted
  permission prompts on this repo. The allowlist matches *command shape*,
  not just the leading program name — so `git`, `gh`, `node`, `sleep` each
  being individually allowlisted does **not** cover a command that
  combines them. Shapes that trigger a prompt regardless of what's inside
  them:
  - Chaining: `A && B`, `A; B`, `cmd; echo`
  - Redirects: `cmd > file 2>&1`, heredocs (`<<'EOF'`)
  - Piping: `cmd | tail`, `cmd | grep ...`
  - Command substitution: `$(cmd)`, backticks
  - **Shell loop constructs: `until ... do ... done`, `while ... do
    ... done`, `for ... do ... done`** — including a `sleep N` inside the
    loop body to poll something. This one is easy to reach for when
    "waiting for a GitHub Actions run to finish" and is exactly what
    caused the 2026-07-19 repeats.
  - **`run_in_background: true` does NOT fix any of the above** — it
    changes whether the *tool call* blocks the turn, not whether the
    *command string* needs permission. A hand-rolled `until`-loop wrapped
    in `run_in_background: true` still prompts, because the permission
    check runs on the command text itself before it's ever executed,
    foreground or background. (Confirmed directly: this was tried
    2026-07-19 as a "fix" for the loop problem and still prompted.)

  **The actual fix, in order of preference:**
  1. **Don't poll at all.** If waiting on a background Bash task
     (`run_in_background: true` on a *simple, single, already-allowlisted*
     command) or a background Agent, the harness sends an automatic
     completion notification — no loop, no check-back command, needed.
     See "Don't idle waiting on a background full-suite run" below.
  2. **If you need to check external state that the harness can't notify
     you about** (e.g. "has this GitHub Actions run finished yet"), issue
     ONE plain, single, already-allowlisted command per tool call — e.g.
     `gh run view <id> --json status,conclusion` — with **no** loop,
     `sleep`, chaining, or substitution wrapped around it. If it's not
     done yet, say so and stop; check again in a later turn (after the
     user's next message, or — only inside an active `/loop` session —
     via `ScheduleWakeup`, which does not apply to a normal conversation
     turn).
  3. For genuinely long-running single background commands (a test
     suite, a build), use the Bash tool's own `run_in_background: true`
     on the *plain* command (no wrapping) and read the harness's
     auto-captured output file afterward (via `Read`, or `Grep` on that
     file for specific lines like `FAIL |Tests\s+\d`) once notified. This
     also avoids a real correctness bug: piping a command through `tail`
     or `grep` in the same Bash call **masks its real exit code** (the
     pipe's exit code is the last command's, i.e. `tail`'s, which is
     always 0) — a failing typecheck/test run can silently report success
     this way.
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
  stuck; the harness notifies you when it finishes, don't re-run it or poll
  its output file in a loop waiting for it.
- **Don't idle waiting on a background full-suite run.** Once an issue's
  typecheck/lint/targeted-test pass is green and the full suite is kicked
  off in the background, immediately move on to implementing the *next*
  queued issue (research, write the code, run its own targeted tests) while
  that suite runs — only the final commit+close step for the issue that
  triggered the run needs to wait for its actual result. Confirmed directly
  by the user, who pointed out mid-session (2026-07-19) that stopping to
  wait wastes time when there's more queued work ready to start.

## Git conventions

- Stage explicit filenames (`git add path/to/file.ts ...`), never `-A` or
  `.` — avoids accidentally sweeping up unrelated in-progress files.
- New commit per fix/issue, not amends, unless the user explicitly asks
  for an amend.
- Never `--no-verify`, never force-push, never skip hooks.
- Commit message: 1–2 sentences on *why*, not a restatement of the diff.
