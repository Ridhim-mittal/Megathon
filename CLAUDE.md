# CLAUDE.md — Megathon team rules

Four people commit to this repo, each through their own Claude Code session, often at the
same time. These rules exist to keep us out of merge-conflict hell. Follow them every session.

## Before you start any task
1. `git pull --rebase origin main` — always start from the latest `main`.
2. Check `git log --oneline -15` to see what teammates just changed.
3. Stay inside the area of the task. If a change needs to touch someone else's area
   (see **Ownership**), keep that part as small as possible and say so in the commit message.

## While working
- Make small, focused commits. One logical change per commit.
- Do NOT reformat, rename, or reorganize files unrelated to the task — that is the #1
  cause of conflicts between parallel sessions.
- Do NOT edit lockfiles by hand. Change dependencies only with the package manager.
- Never commit secrets. Real values go in `.env` (git-ignored); add the key name with a
  placeholder to `.env.example`.
- Keep this file and `README.md` current when you add a new command, service, or folder.

## Before you push
1. Run the project's checks (fill these in once the stack is chosen):
   - Install: `TODO`
   - Run dev: `TODO`
   - Lint / test: `TODO`
2. `git pull --rebase origin main`, resolve any conflicts, re-run checks.
3. `git push origin main` (or your feature branch).
- Never `git push --force` to `main`. Never rewrite history others may have pulled.
- If a rebase conflict is in code you did not write, stop and ask the human rather than guessing.

## Commit messages
`<area>: <what changed>` — e.g. `frontend: add login form`, `backend: fix /api/score 500`.

## Ownership (edit to match the team)
| Area        | Folder        | Owner |
|-------------|---------------|-------|
| Frontend    | `frontend/`   | TODO  |
| Backend/API | `backend/`    | TODO  |
| ML / data   | `ml/`         | TODO  |
| Infra, docs, integration | root, `docs/` | TODO |

## Project overview
TODO: one paragraph on what we are building, the stack, and how the pieces talk to each other.
