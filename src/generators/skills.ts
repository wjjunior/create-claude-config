import path from 'node:path';
import type { ProjectConfig } from '../types.js';
import { writeFile } from '../utils/fs.js';

const SYSTEMATIC_DEBUGGING = `---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior
---

# Systematic Debugging

## Phase 1: Understand the Problem
- Reproduce the issue
- Read the full error message/stack trace
- Check git log for recent changes
- Search codebase for related code

## Phase 2: Form Hypothesis
- Write down your hypothesis BEFORE looking at code
- What do you think is causing this?
- What evidence would confirm or deny it?

## Phase 3: Test Hypothesis
- Add targeted logs or breakpoints
- Run the minimal reproduction
- Collect evidence

## Phase 4: Fix and Verify
- Make the minimal fix
- Verify no regression
- Add a test to prevent recurrence

## Phase 5: Document
- Record findings in journal
- Note any patterns for future reference
`;

const CODE_REVIEW = `---
name: code-review
description: Use when reviewing code or pull requests
---

# Code Review Checklist

## Dimension 1: Correctness
- [ ] Edge cases handled
- [ ] Async operations properly awaited
- [ ] Error handling present and appropriate
- [ ] No race conditions

## Dimension 2: Code Quality
- [ ] No unnecessary type assertions or suppressions
- [ ] Interfaces/types defined for data structures
- [ ] Functions have clear return types

## Dimension 3: Security
- [ ] Input validation at system boundaries
- [ ] No sensitive data logged
- [ ] Queries use parameterized inputs
- [ ] Auth/authz checks in place

## Dimension 4: Performance
- [ ] No N+1 queries
- [ ] No unnecessary re-renders or recomputations
- [ ] Pagination for large datasets
- [ ] Appropriate caching

## Dimension 5: Maintainability
- [ ] Single responsibility per function/class
- [ ] Clear naming (intention-revealing)
- [ ] No code duplication
- [ ] Comments only where logic isn't self-evident

## Output Format
For each finding: \`[OK|CRITICAL|WARNING|INFO] <description>\`
End with overall assessment.
`;

interface QualityGate {
  name: string;
  command: string;
}

function getBackendGates(config: ProjectConfig): QualityGate[] {
  switch (config.backend) {
    case 'nodejs': {
      const ts = config.backendLanguage === 'typescript'
        ? [{ name: 'TypeScript check', command: 'npx tsc --noEmit' }]
        : [];
      return [...ts, { name: 'Tests', command: 'npm test' }, { name: 'Lint', command: 'npm run lint' }];
    }
    case 'python':
      return [
        { name: 'Type check', command: 'mypy .' },
        { name: 'Tests', command: 'pytest' },
        { name: 'Lint', command: 'ruff check .' },
      ];
    case 'go':
      return [
        { name: 'Vet', command: 'go vet ./...' },
        { name: 'Tests', command: 'go test ./...' },
      ];
    case 'ruby':
      return [
        { name: 'Tests', command: 'bundle exec rspec' },
        { name: 'Lint', command: 'bundle exec rubocop' },
      ];
    case 'java':
      return config.javaBuildTool === 'gradle'
        ? [
            { name: 'Build + Tests', command: './gradlew build' },
            { name: 'Lint', command: './gradlew check' },
          ]
        : [
            { name: 'Build + Tests', command: './mvnw verify' },
            { name: 'Lint', command: './mvnw checkstyle:check' },
          ];
    default:
      return [];
  }
}

function getFrontendGates(config: ProjectConfig): QualityGate[] {
  if (config.frontend === 'none') return [];
  const prefix = config.isMonorepo ? 'cd ui && ' : '';
  return [
    { name: 'Frontend TypeScript check', command: `${prefix}npx tsc --noEmit` },
    { name: 'Frontend tests', command: `${prefix}npm test` },
    { name: 'Frontend lint', command: `${prefix}npm run lint` },
    { name: 'Frontend build', command: `${prefix}npm run build` },
  ];
}

function getQualityGates(config: ProjectConfig): QualityGate[] {
  return [...getBackendGates(config), ...getFrontendGates(config)];
}

function buildSafeDevWorkflow(config: ProjectConfig): string {
  const gates = getQualityGates(config);
  const gatesList = gates.map((g) => `- [ ] **${g.name}**: \`${g.command}\``).join('\n');

  return `---
name: safe-dev-workflow
description: Use for any code change to ensure quality and safety
---

# Safe Development Workflow

## Step 1: Understand
- Read all relevant source files before changing anything
- Identify the scope of the change
- Check for existing tests covering this area

## Step 2: Plan
- List the files that need to change
- Identify potential side effects
- Consider edge cases

## Step 3: Implement
- Make changes incrementally
- Keep each change focused and minimal
- Follow existing code patterns and conventions

## Step 4: Verify
Run all quality gates before considering the task complete:

${gatesList}

## Step 5: Review
- Re-read the diff to catch mistakes
- Ensure no debug code or temporary changes remain
- Verify error handling is in place for new code paths
`;
}

function getScopes(config: ProjectConfig): string[] {
  switch (config.backend) {
    case 'nodejs':
      return ['api', 'service', 'config', 'db', 'auth', 'ui', 'test'];
    case 'python':
      return ['api', 'model', 'service', 'config', 'db', 'auth', 'test'];
    case 'go':
      return ['api', 'service', 'config', 'db', 'auth', 'test'];
    case 'ruby':
      return ['controller', 'model', 'service', 'config', 'db', 'auth', 'view', 'test'];
    case 'java':
      return ['controller', 'service', 'config', 'db', 'auth', 'dto', 'test'];
    default:
      return ['ui', 'config', 'test'];
  }
}

function buildCommitAndPr(config: ProjectConfig): string {
  const scopes = getScopes(config);
  const scopeList = scopes.map((s) => `\`${s}\``).join(', ');

  return `---
name: commit-and-pr
description: Use when creating commits or pull requests
---

# Commit & PR Workflow

## Conventional Commits
Format: \`<type>(<scope>): <description>\`

### Types
- **feat**: New feature
- **fix**: Bug fix
- **refactor**: Code restructuring (no behavior change)
- **test**: Adding or updating tests
- **docs**: Documentation only
- **chore**: Build, CI, or tooling changes
- **perf**: Performance improvement

### Scopes
${scopeList}

## Commit Rules
1. Only commit staged changes — never use \`git add -A\` or \`git add .\`
2. Review the diff before committing
3. Keep commits atomic — one logical change per commit
4. Use HEREDOC format for commit messages:
\`\`\`bash
git commit -m "$(cat <<'EOF'
feat(scope): short description

Longer explanation if needed.
EOF
)"
\`\`\`

## Pull Request Template
When creating PRs, use this format:
\`\`\`
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
\`\`\`

## Pre-Commit Checklist
- [ ] All quality gates pass
- [ ] No unrelated changes included
- [ ] Commit message follows conventional format
- [ ] Branch is up to date with base
`;
}

export async function generateSkills(config: ProjectConfig): Promise<void> {
  const skillsDir = path.join(process.cwd(), '.claude', 'skills');

  await writeFile(
    path.join(skillsDir, 'systematic-debugging.md'),
    SYSTEMATIC_DEBUGGING,
  );

  await writeFile(
    path.join(skillsDir, 'code-review.md'),
    CODE_REVIEW,
  );

  await writeFile(
    path.join(skillsDir, 'safe-dev-workflow.md'),
    buildSafeDevWorkflow(config),
  );

  await writeFile(
    path.join(skillsDir, 'commit-and-pr.md'),
    buildCommitAndPr(config),
  );
}
