---
name: commit-and-pr
description: Use when creating commits or pull requests
---

# Commit & PR Workflow

## Conventional Commits
Format: `<type>(<scope>): <description>`

### Types
- **feat**: New feature
- **fix**: Bug fix
- **refactor**: Code restructuring (no behavior change)
- **test**: Adding or updating tests
- **docs**: Documentation only
- **chore**: Build, CI, or tooling changes
- **perf**: Performance improvement

### Scopes
`api`, `service`, `config`, `db`, `auth`, `ui`, `test`

## Commit Rules
1. Only commit staged changes — never use `git add -A` or `git add .`
2. Review the diff before committing
3. Keep commits atomic — one logical change per commit
4. Use HEREDOC format for commit messages:
```bash
git commit -m "$(cat <<'EOF'
feat(scope): short description

Longer explanation if needed.
EOF
)"
```

## Pull Request Template
When creating PRs, use this format:
```
gh pr create --title "type(scope): description" --body "$(cat <<'EOF'
## Summary
- Key change 1
- Key change 2

## Test Plan
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] No regressions
EOF
)"
```

## Pre-Commit Checklist
- [ ] All quality gates pass
- [ ] No unrelated changes included
- [ ] Commit message follows conventional format
- [ ] Branch is up to date with base
