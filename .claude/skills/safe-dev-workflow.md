---
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

- [ ] **TypeScript check**: `npx tsc --noEmit`
- [ ] **Tests**: `npm test`
- [ ] **Lint**: `npm run lint`

## Step 5: Review
- Re-read the diff to catch mistakes
- Ensure no debug code or temporary changes remain
- Verify error handling is in place for new code paths
