---
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
