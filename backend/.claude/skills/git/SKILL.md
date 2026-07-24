---
name: git
description: >
  Read for any git task: branching, commit messages, PR workflow,
  branch naming, or release tagging.
  Official spec: https://www.conventionalcommits.org/
---

# Git Skill

## BRANCH STRATEGY (GitHub Flow — simplified, works for all team sizes)

```
main          → always production-ready, never commit directly
develop       → integration branch, merges to main via PR
feature/*     → new features, branch from develop
fix/*         → bug fixes, branch from develop
hotfix/*      → urgent prod fixes, branch from main → merge to main + develop
release/*     → optional, for pre-release QA
chore/*       → maintenance, dependency updates, refactoring
```

```bash
# Start a feature
git checkout develop
git pull origin develop
git checkout -b feature/user-authentication

# Finish — open PR to develop, never push to main directly
git push origin feature/user-authentication
```

---

## COMMIT MESSAGE FORMAT (Conventional Commits)

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

```
feat      New feature
fix       Bug fix
refactor  Code change — no feature, no bug
perf      Performance improvement
docs      Documentation only
test      Add or fix tests
chore     Build, deps, config — no production code change
ci        CI/CD pipeline changes
style     Formatting, whitespace — no logic change
revert    Reverts a previous commit
```

### Scopes — use module names consistently

```
auth, users, products, billing, payments, db, config, docker, ci
```

### Examples

```bash
feat(auth): add JWT refresh token rotation
fix(users): prevent duplicate email on update
refactor(billing): extract stripe webhook to separate handler
chore(deps): upgrade NestJS to v11
docs(api): update swagger descriptions for auth endpoints
test(users): add unit tests for users.service
ci: add Docker build step to GitHub Actions
feat(payments)!: change webhook signature verification method
# ! = BREAKING CHANGE
```

### Rules

```
✅ lowercase type and scope
✅ imperative mood — "add" not "added" or "adds"
✅ max 72 chars for subject line
✅ reference issue in footer: Closes #123
✅ BREAKING CHANGE: in footer for breaking changes

❌ "fix bug", "update code", "wip", "misc" — too vague
❌ Multiple unrelated changes in one commit — split them
❌ Committing directly to main or develop without PR
```

---

## BRANCH NAMING

```
feature/short-description          feature/user-authentication
feature/issue-42-short-description feature/issue-42-email-verification
fix/short-description              fix/login-token-expiry
hotfix/short-description           hotfix/critical-payment-bug
chore/short-description            chore/upgrade-prisma-v6
release/version                    release/1.2.0
```

---

## PR / MERGE RULES

```
✅ PR title must follow Conventional Commits format
✅ At least 1 reviewer before merge
✅ Squash commits when merging feature branches — clean history
✅ Delete branch after merge
✅ PR must be up-to-date with target branch before merge
✅ All CI checks must pass

❌ Never force push to main or develop
❌ Never merge your own PRs without review (unless solo project)
❌ Never leave stale branches (delete within 1 week of merge)
```

---

## .gitignore (essentials)

```
node_modules/
dist/
.env
.env.*
!.env.example
*.log
coverage/
.DS_Store
prisma/generated/
src/generated/
```

---

## TAGGING RELEASES

```bash
# Semantic versioning: MAJOR.MINOR.PATCH
git tag -a v1.0.0 -m "feat: initial release"
git tag -a v1.1.0 -m "feat: add billing module"
git tag -a v1.1.1 -m "fix: login token expiry"
git push origin v1.1.1

# MAJOR → breaking change
# MINOR → new feature, backward-compatible
# PATCH → bug fix
```

---

## USEFUL COMMANDS

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Stash work in progress
git stash
git stash pop

# Rebase feature branch on latest develop
git fetch origin
git rebase origin/develop

# Interactive rebase — squash last 3 commits
git rebase -i HEAD~3

# Cherry-pick a single commit to another branch
git cherry-pick <commit-hash>

# Find who changed a line
git log -L 10,20:src/modules/auth/auth.service.ts
```

---

## KEY DOCS

```
Conventional Commits:  https://www.conventionalcommits.org/en/v1.0.0/
GitHub Flow:           https://docs.github.com/en/get-started/using-github/github-flow
Git branching model:   https://nvie.com/posts/a-successful-git-branching-model/
Semantic versioning:   https://semver.org/
```