## Starting a new batch of issues

Read `docs/AGENT_WORKFLOW.md` first — it's the standing operating
procedure for how issues get filed, prioritized, implemented, and closed
on this repo, plus environment-specific gotchas (Windows/Claude Code
shell quirks, git conventions, test-suite timing). It exists so this
doesn't need re-explaining every session.

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

## Closing a GitHub issue
Whenever a GitHub issue is closed (implementation done, verified working), update **all three**:
1. `docs/issues-priority.md` — mark the row done with a one-line implementation note.
2. `docs/ARCHITECTURE.md` — reflect whatever actually changed (new/changed files, data model, routes, etc.) in the relevant section(s). Update the `## Status` diagram too if the issue moves an epic between tiers.
3. `src/data/releaseNotes.ts` (#63) — add one brief, user-facing entry (`{ issue, date, en, ru }`, most-recent-first) describing what changed. This is end-user-facing copy shown in Settings, not the implementation notes from #1/#2 — keep it to one plain sentence, no jargon, both languages.

Do this as part of finishing the issue, not as a separate later pass — `ARCHITECTURE.md` says at the top "this document is updated after each issue is completed," and it only stays true if it happens every time.
