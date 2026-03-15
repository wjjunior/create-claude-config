---
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
For each finding: `[OK|CRITICAL|WARNING|INFO] <description>`
End with overall assessment.
