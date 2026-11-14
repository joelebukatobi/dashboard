# COMMITS

## Rules

- **No AI attribution in commit messages.** Never add or leave trailers or footers such as `Co-authored-by: Cursor`, `Co-authored-by: Claude`, `Claude-Session:`, `Cursor-Session:`, `Assisted-by: …`, `Generated with Claude/Cursor`, or similar. Commit messages are human project history only.
- Prefer Conventional Commits. Subject focuses on why; body only when needed.
- Dashboard version lives in **git tags**, not `package.json` bumps.

## Log

- 2026-11-13: Cap batch file list height so Upload stays reachable without changing media layout scroll model.
- 2026-11-13: Match batch table scrollbar gutter to default table scroll; exempt static assets from production rate limit (fixes media 429 / broken previews).
- 2026-11-13: Fix image/video edit "Failed to load image" — toastScript was referenced in modals out of scope.
- 2026-11-13: Tagged v1.3.1 at ac111ce (media batch scroll, edit crash, static rate-limit).
- 2026-11-14: Strip AI attribution trailers from commit history on dev/main/staging; document the no-AI-in-messages rule.
