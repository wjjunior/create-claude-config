import { mkdirSync, writeFileSync, chmodSync, existsSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const STARTUP_SH = `#!/bin/bash
echo "=== SESSION STARTUP: $(date) ==="
if [ -f "memory/wake-up.md" ]; then
echo "--- WAKE-UP CONTEXT ---"
cat "memory/wake-up.md"
echo "--- END CONTEXT ---"
else
echo "No wake-up.md found. This is a fresh start."
fi
echo "=== STARTUP COMPLETE ==="
echo "Re-indexing project symbols..."
(cd .claude/mcp-servers/context-server && npm run build && npm run index) 2>/dev/null || echo "Skipped: index-project not available"
`;

const SESSION_END_SH = `#!/bin/bash
JOURNAL_DATE=$(date +%Y-%m-%d)
JOURNAL_FILE="memory/journal/\${JOURNAL_DATE}.md"
mkdir -p "memory/journal"
if [ ! -f "$JOURNAL_FILE" ]; then
cat > "$JOURNAL_FILE" << EOF
# Journal — \${JOURNAL_DATE}
## Work Done
[Auto-created by session-end hook — Claude should fill this]
## Decisions Made
-
## Bugs Found / Resolved
-
## TODO For Next Session
- [ ]
## Estimated Time
- Total: ~?h
EOF
echo "Journal created: $JOURNAL_FILE"
echo "REMINDER: Update wake-up.md before ending session."
fi
`;

const CHECK_PROMISES_SH = `#!/bin/bash
# Promise Checker Hook — runs on every Stop event
# Blocks response if Claude promised to write something but didn't

TRANSCRIPT_FILE="$1"

if [ -z "$TRANSCRIPT_FILE" ] || [ ! -f "$TRANSCRIPT_FILE" ]; then
  exit 0
fi

LAST_ASSISTANT_MSG=$(python3 -c "
import json, sys

try:
    with open(sys.argv[1], 'r') as f:
        for line in reversed(f.readlines()):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                if obj.get('message', {}).get('role') == 'assistant':
                    print(json.dumps(obj['message']['content']))
                    break
            except json.JSONDecodeError:
                continue
except Exception:
    pass
" "$TRANSCRIPT_FILE" 2>/dev/null)

if [ -z "$LAST_ASSISTANT_MSG" ]; then
  exit 0
fi

PROMISE_PATTERNS=(
  "I'll remember"
  "I've noted"
  "I'll write that down"
  "let me record"
  "I'll keep track"
  "noted that"
  "I'll make a note"
)

FOUND_PROMISE=false
for pattern in "\${PROMISE_PATTERNS[@]}"; do
  if echo "$LAST_ASSISTANT_MSG" | grep -qi "$pattern"; then
    FOUND_PROMISE=true
    break
  fi
done

if [ "$FOUND_PROMISE" = true ]; then
  WRITE_ACTION=$(echo "$LAST_ASSISTANT_MSG" | python3 -c "
import json, sys

content = json.loads(sys.stdin.read())
if isinstance(content, list):
    for item in content:
        if isinstance(item, dict) and item.get('type') == 'tool_use':
            if item.get('name') in ['Edit', 'Write', 'MultiEdit']:
                print('yes')
                exit()
print('no')
")

  if [ "$WRITE_ACTION" = "no" ]; then
    echo "HOOK ERROR: You said you'd remember/write something but didn't."
    echo "Go back and write it to memory/ BEFORE responding."
    exit 1
  fi
fi

exit 0
`;

const SYSTEMATIC_DEBUGGING_MD = `---
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

const CODE_REVIEW_MD = `---
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
For each finding: [OK|CRITICAL|WARNING|INFO] <description>
End with overall assessment.
`;

const WAKEUP_MD = `# Wake-Up Context

## Current Project State

[First session — Claude should fill this at session end]

## Recent Decisions

- (none yet)

## Next Steps

- [ ] (to be filled)
`;

const GITIGNORE_ENTRIES = `
# Claude Code
.claude/settings.local.json
.claude/context.db
.claude/mcp-servers/*/node_modules/
.claude/mcp-servers/*/dist/

# Memory (local session data)
memory/
`;

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function writeHook(dir: string, name: string, content: string): void {
  const filePath = join(dir, name);
  writeFileSync(filePath, content, 'utf-8');
  chmodSync(filePath, 0o755);
}

function appendGitignore(cwd: string): void {
  const gitignorePath = join(cwd, '.gitignore');
  const entries = GITIGNORE_ENTRIES.trim();

  if (existsSync(gitignorePath)) {
    const existing = readFileSync(gitignorePath, 'utf-8');
    if (existing.includes(entries)) return;
    appendFileSync(gitignorePath, '\n' + entries + '\n', 'utf-8');
  } else {
    writeFileSync(gitignorePath, entries + '\n', 'utf-8');
  }
}

export async function generateUniversalFiles(): Promise<void> {
  const cwd = process.cwd();

  // Hooks
  const hooksDir = join(cwd, '.claude', 'hooks');
  ensureDir(hooksDir);
  writeHook(hooksDir, 'startup.sh', STARTUP_SH);
  writeHook(hooksDir, 'session-end.sh', SESSION_END_SH);
  writeHook(hooksDir, 'check-promises.sh', CHECK_PROMISES_SH);

  // Universal skills
  const skillsDir = join(cwd, '.claude', 'skills');
  ensureDir(skillsDir);
  writeFileSync(join(skillsDir, 'systematic-debugging.md'), SYSTEMATIC_DEBUGGING_MD, 'utf-8');
  writeFileSync(join(skillsDir, 'code-review.md'), CODE_REVIEW_MD, 'utf-8');

  // Memory directory with wake-up.md
  const memoryDir = join(cwd, 'memory');
  ensureDir(memoryDir);
  ensureDir(join(memoryDir, 'decisions'));
  ensureDir(join(memoryDir, 'journal'));
  const wakeupPath = join(memoryDir, 'wake-up.md');
  if (!existsSync(wakeupPath)) {
    writeFileSync(wakeupPath, WAKEUP_MD, 'utf-8');
  }

  // .gitignore
  appendGitignore(cwd);
}
