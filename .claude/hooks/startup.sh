#!/bin/bash
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
