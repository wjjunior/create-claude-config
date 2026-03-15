import fs from 'node:fs';
import path from 'node:path';
import type { ProjectConfig } from '../types.js';
import { writeFile } from '../utils/fs.js';

const STARTUP_BASE = `#!/bin/bash
echo "=== SESSION STARTUP: $(date) ==="
if [ -f "memory/wake-up.md" ]; then
echo "--- WAKE-UP CONTEXT ---"
cat "memory/wake-up.md"
echo "--- END CONTEXT ---"
else
echo "No wake-up.md found. This is a fresh start."
fi
echo "=== STARTUP COMPLETE ==="`;

const STARTUP_MCP_SUFFIX = `
echo "Re-indexing project symbols..."
(cd .claude/mcp-servers/context-server && npm run build && npm run index) 2>/dev/null || echo "Skipped: index-project not available"`;

const SESSION_END = `#!/bin/bash
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

const CHECK_PROMISES = `#!/bin/bash
# Promise Checker Hook — runs on every Stop event
# Blocks response if Claude promised to write something but didn't

TRANSCRIPT_FILE="$1"

if [ -z "$TRANSCRIPT_FILE" ] || [ ! -f "$TRANSCRIPT_FILE" ]; then
  exit 0
fi

# Extract last assistant message
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

# Check for promise patterns
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
  # Check if a write action occurred (Edit or Write tool)
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
    echo "Go back and write it to memory/persistent.md or decisions/ BEFORE responding."
    exit 1
  fi
fi

exit 0
`;

async function writeHookFile(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content);
  fs.chmodSync(filePath, 0o755);
}

export async function generateHooks(config: ProjectConfig): Promise<void> {
  const hooksDir = path.join(process.cwd(), '.claude', 'hooks');

  if (config.hooks.startup) {
    let startupContent = STARTUP_BASE;
    if (config.includeMcp) {
      startupContent += STARTUP_MCP_SUFFIX;
    }
    startupContent += '\n';
    await writeHookFile(path.join(hooksDir, 'startup.sh'), startupContent);
  }

  if (config.hooks.sessionEnd) {
    await writeHookFile(path.join(hooksDir, 'session-end.sh'), SESSION_END);
  }

  if (config.hooks.promiseChecker) {
    await writeHookFile(path.join(hooksDir, 'check-promises.sh'), CHECK_PROMISES);
  }
}
