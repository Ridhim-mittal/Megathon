# CLAUDE.md — Megathon team rules

Four people commit to this repo, each through their own Claude Code session, often at the
same time. These rules exist to keep us out of merge-conflict hell. Follow them every session.

## Branch workflow (one branch per person)
- **Nobody commits or pushes to `main` directly.** `main` only changes by merging a pull request.
- Each person works on their own branch, named `<name>/<task>` (e.g. `alice/login-form`).
  In a Claude Code cloud session the branch is pre-assigned — use that one.
- One Claude session = one branch. Never commit to a teammate's branch.
- **At the end of every prompt that changed code**: merge `origin/main` into your branch, run
  the checks, commit, push your branch, and then finish your reply with this reminder:
  > ✅ Pushed to `<branch>`. **Merge it into `main` now:** open a PR from `<branch>` → `main`
  > on GitHub and merge it (link: `https://github.com/Ridhim-mittal/Megathon/compare/main...<branch>`).
  If the merge of `origin/main` had conflicts you could not safely resolve, say so instead of
  giving the reminder. Skip the reminder for prompts that changed nothing (questions, reviews).
- After the user merges, the next task starts again from the latest `origin/main`.
- To pick up teammates' work, merge `main` into your branch: `git fetch origin main && git merge origin/main`.
  Use merge, not rebase — rebasing a pushed branch needs a force-push, which is blocked.

## Before you start any task
1. `git fetch origin main` and branch from it: `git checkout -b <name>/<task> origin/main`
   (or, if your branch already exists, `git merge origin/main` into it).
2. Check `git log --oneline -15 origin/main` to see what teammates just merged.
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
2. `git fetch origin main && git merge origin/main`, resolve any conflicts, re-run checks.
3. `git push -u origin <your-branch>` — never `main`.
4. When the work is usable, open a PR into `main`. The human merges it on GitHub.
- Never `git push --force`. Never rewrite history others may have pulled.
- If a merge conflict is in code you did not write, stop and ask the human rather than guessing.

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
