#!/bin/bash
JOURNAL_DATE=$(date +%Y-%m-%d)
JOURNAL_FILE="memory/journal/${JOURNAL_DATE}.md"
mkdir -p "memory/journal"
if [ ! -f "$JOURNAL_FILE" ]; then
cat > "$JOURNAL_FILE" << EOF
# Journal — ${JOURNAL_DATE}
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
