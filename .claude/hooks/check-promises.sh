#!/bin/bash
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
for pattern in "${PROMISE_PATTERNS[@]}"; do
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
