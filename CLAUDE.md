## ⚠️ Shell safety — read this first, every session

**Never write a compound shell command** — chaining (`A && B`, `A; B`),
redirects (`> file 2>&1`, heredocs), piping (`| tail`, `| grep`), command
substitution (`$(...)`), or **shell loop constructs (`until`/`while`/`for
... do ... done`, especially with `sleep` inside to poll something)**.
These all trigger a permission prompt *even when every individual program
in them is already allowlisted* — the allowlist matches command *shape*,
not just the leading program name. `run_in_background: true` does **not**
avoid this either — it changes whether the tool call blocks the turn, not
whether the command text needs permission.

If you need to check on something (a GitHub Actions run, a background
process), issue **one plain single already-allowlisted command per tool
call**, no loop/sleep/substitution wrapped around it — and if it's not
done yet, say so and stop rather than looping. Full details, the "why,"
and the preferred patterns are in `docs/AGENT_WORKFLOW.md`'s "Environment
notes" section — read it before running anything non-trivial. This has
caused repeated avoidable user interruptions and is the single most
common source of unwanted permission prompts on this repo.

## Starting a new batch of issues

Read `docs/AGENT_WORKFLOW.md` first — it's the standing operating
procedure for how issues get filed, prioritized, implemented, and closed
on this repo, plus environment-specific gotchas (Windows/Claude Code
shell quirks, git conventions, test-suite timing). It exists so this
doesn't need re-explaining every session.

**One calendar day → one `issues-priority` tier** — when filing more
issues on a day that already has a tier, append to that tier; do not open
Tier N and N+1 with the same date. Details in `docs/AGENT_WORKFLOW.md`
and `.cursor/rules/one-tier-per-day.mdc`.

## Code Search
- ALWAYS use `zm-index search` FIRST for any code search task
- Run `zm-index outline <file>` BEFORE reading any file longer than 500 lines
- Only fall back to grep if zm-index returns empty results

### Commands
- `zm-index search "SymbolName"`      # find any symbol
- `zm-index file "query"`             # find files by name (substring or glob)
- `zm-index outline path/to/file`     # file structure before reading
- `zm-index class "Name"`             # find a class or interface definition
- `zm-index hierarchy "Name"`         # show superclasses / subclasses
- `zm-index implementations "Name"`   # find classes implementing an interface
- `zm-index usages "SymbolName"`      # find references
- `zm-index callers "functionName"`   # find call sites
- `zm-index stats`                    # check index health

## Implementing a GitHub issue

The moment an issue's implementation is pushed and its `docs/issues-priority.md`
row moves to "🔍 Pending validation" (done, but not yet confirmed on the
user's device), also run `gh issue edit <N> --add-label validation` on the
GitHub issue itself. This is a real, pre-existing repo label
convention (`validation`: "Implemented, awaiting on-device confirmation
before closing") — easy to forget since only the local docs tracked the
status before this was written down.

**Do not infer that validation happened** from a successful import/export,
a screenshot, a test pass, a Playwright run, a populated summary like
"351 days imported," or any other indirect signal. Only close / archive /
swap to `validated` after the user explicitly confirms the change worked
on their device.

When the user then confirms on-device and the issue is closed, swap the
label rather than just removing it: `gh issue edit <N> --remove-label
validation --add-label validated`. `validated` ("Implemented and confirmed
on-device before closing") is a separate, permanent label — added
2026-07-23 after the user pointed out that simply stripping `validation` on
close made a properly-confirmed issue look identical, from the label list,
to one closed without any on-device check at all. `validation` means
"awaiting confirmation" so it has to come off once that's no longer true,
but `validated` stays on the closed issue forever as the visible record
that the confirmation actually happened.

## Writing the release note — at implementation time, not closing time

The moment an issue's code actually ships (the implementation commit, not
the later closing/validation commit), add its `src/data/releaseNotes.ts`
(#63) entry in that same commit: one brief, user-facing entry (`{ version,
issue, date, en, ru }`, most-recent-first) describing what changed. This is
end-user-facing copy shown in Settings, not the implementation notes that
go in `docs/issues-priority.md`/`docs/ARCHITECTURE.md` — keep it to one
plain sentence, no jargon, both languages. `version` is a simple
incrementing counter (oldest entry = 1) — set it to the current highest
version + 1 (i.e. `releaseNotes[0].version + 1`, since the array is
most-recent-first); never reuse or renumber a version retroactively. This
lets a reported bug be pinned to "this happened in vN" — easier to debug
than a date alone, especially since several versions can ship the same
day.

**Why split from closing (#642, 2026-08-07):** `releaseNotes.ts` lives
under `src/`, so any commit touching it triggers a Pages deploy
(`deploy-pages.yml`'s `paths-ignore: docs/**, *.md`, #637). Bundling it
into the closing commit meant every closing pass — even a pure doc-row
move for an issue that already shipped and deployed days earlier —
triggered a redundant deploy. Writing it when the code ships instead
means the code and its user-facing note deploy together exactly once, and
closing stays free to be docs-only.

## Closing a GitHub issue

Keep closes lean (see `.cursor/rules/lean-issue-close.mdc`). Default path:

1. GitHub: swap `validation` → `validated`, comment, close.
2. `docs/issues-priority.md` — one-line done note, **move that row** into
   the matching tier under `docs/issues-priority-archive/` (active file
   stays open/pending only).

3. `docs/ARCHITECTURE.md` — **only** when the issue changed product
   architecture and the relevant section is still wrong (short targeted
   edit). Skip for CI/test-only / docs-only closes.

Do **not** bundle AGENT_WORKFLOW / mistakes-log / new cursor rules /
release-note hunts into the close. Policy “next time don’t X” is a
separate follow-up.

The `releaseNotes.ts` entry is **not** part of this pass — it was already
written at implementation time (see above). If it's somehow missing when
you get to closing (e.g. an older issue predating this split), add it
here as a fallback, but the default path is: written once, at
implementation.

