export function buildPrompt(): string {
  return `
You are setting up Claude Code configuration for THIS project. Analyze the codebase deeply, then generate all configuration files.

## Step 1: Analyze the project

Read these config files (if they exist) to understand the stack:
- package.json, requirements.txt, go.mod, pom.xml, Gemfile, Makefile, Cargo.toml
- tsconfig.json, pyproject.toml, build.gradle, settings.gradle
- .eslintrc*, .prettierrc*, ruff.toml, .rubocop.yml
- docker-compose.yml, Dockerfile
- .env.example, .env.development

Then sample source code (up to 15 files) to detect architecture patterns:
- Controllers/handlers/views/routes
- Services/use cases/business logic
- Models/entities/schemas
- Tests (to detect test framework and patterns)
- Config/setup files

From your analysis, determine:
- Backend language and framework
- Frontend framework (if any)
- Database and ORM/ODM
- Test framework(s) and test runner command(s)
- Linter and formatter command(s)
- Build command(s)
- Dev server command(s)
- Monorepo vs single-repo structure
- Architecture patterns in use (MVC, service layer, repository, etc.)
- Naming conventions in the code
- Available scripts (npm scripts, Makefile targets, etc.)

## Step 2: Generate ALL configuration files

Use the Write tool to create every file below. For files marked [UNIVERSAL], write the EXACT content provided — do not modify it. For files marked [PROJECT-SPECIFIC], generate content based on your analysis.

---

### .claude/hooks/startup.sh [UNIVERSAL + conditional MCP]

Write this content. If Node.js is available on the system (check with \`node --version\`), include the MCP re-index block. Otherwise omit the last 2 lines.

\`\`\`
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
\`\`\`

After writing, run: chmod 755 .claude/hooks/startup.sh

---

### .claude/hooks/session-end.sh [UNIVERSAL]

Write this EXACT content — do not modify:

\`\`\`
#!/bin/bash
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
\`\`\`

After writing, run: chmod 755 .claude/hooks/session-end.sh

---

### .claude/hooks/check-promises.sh [UNIVERSAL]

Write this EXACT content — do not modify:

\`\`\`
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
    echo "Go back and write it to memory/ BEFORE responding."
    exit 1
  fi
fi

exit 0
\`\`\`

After writing, run: chmod 755 .claude/hooks/check-promises.sh

---

### .claude/skills/systematic-debugging.md [UNIVERSAL]

Write this EXACT content:

\`\`\`
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
\`\`\`

---

### .claude/skills/code-review.md [UNIVERSAL]

Write this EXACT content:

\`\`\`
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
For each finding: [OK|CRITICAL|WARNING|INFO] <description>
End with overall assessment.
\`\`\`

---

### .claude/skills/safe-dev-workflow.md [PROJECT-SPECIFIC]

Generate this skill based on your analysis. Must include REAL commands from the project:

\`\`\`
---
name: safe-dev-workflow
description: Use for any code change to ensure quality and safety
---

# Safe Development Workflow

## Step 1: Understand
- Read all relevant source files before changing anything
- Identify the scope of the change
- Check for existing tests covering this area

## Step 2: Implement
- Make changes incrementally
- Follow existing code patterns and conventions

## Step 3: Verify
Run all quality gates:
- [ ] **[Type check tool]**: \`[REAL command]\`
- [ ] **Tests**: \`[REAL test command]\`
- [ ] **Lint**: \`[REAL lint command]\`

## Step 4: Review
- Re-read the diff to catch mistakes
- Ensure no debug code or temporary changes remain
\`\`\`

Replace the [REAL command] placeholders with actual commands from the project (e.g., from package.json scripts, Makefile, etc.).

---

### .claude/skills/commit-and-pr.md [PROJECT-SPECIFIC]

Generate a conventional commits skill. The scope list must be derived from actual project modules/directories. Include:
- Conventional commit format: \`<type>(<scope>): <description>\`
- Types: feat, fix, refactor, chore, style, test, perf, ci
- Scopes: derived from actual top-level directories and modules
- Rules: imperative mood, lowercase, no period, max 72 chars
- PR template with Summary, Changes, Testing, Checklist sections

---

### .claude/settings.json [PROJECT-SPECIFIC]

Generate with this structure:

\`\`\`json
{
  "permissions": {
    "allow": [
      "Bash(git log:*)", "Bash(git diff:*)", "Bash(git status:*)", "Bash(git stash:*)",
      "Bash(ls:*)", "Bash(cat:*)", "Bash(grep:*)", "Bash(echo:*)", "Bash(find:*)"
      // ADD permissions for detected tooling:
      // Node.js: "Bash(npm:*)", "Bash(npx:*)", "Bash(node:*)"
      // Python: "Bash(python:*)", "Bash(pip:*)", "Bash(pytest:*)", "Bash(mypy:*)", "Bash(ruff:*)"
      // Go: "Bash(go:*)", "Bash(make:*)"
      // Ruby: "Bash(ruby:*)", "Bash(bundle:*)", "Bash(rails:*)", "Bash(rake:*)"
      // Java/Maven: "Bash(./mvnw:*)", "Bash(mvn:*)", "Bash(java:*)"
      // Java/Gradle: "Bash(./gradlew:*)", "Bash(gradle:*)", "Bash(java:*)"
      // PostgreSQL: "Bash(psql:*)"
      // MySQL: "Bash(mysql:*)"
      // MongoDB: "Bash(mongosh:*)"
    ],
    "deny": []
  },
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "bash .claude/hooks/startup.sh" }] }],
    "SessionEnd": [{ "hooks": [{ "type": "command", "command": "bash .claude/hooks/session-end.sh" }] }],
    "Stop": [{ "matcher": "", "hooks": [{ "type": "command", "command": "bash .claude/hooks/check-promises.sh \${CLAUDE_TRANSCRIPT}" }] }]
  },
  "mcpServers": {
    "context": {
      "command": "bash",
      "args": ["-c", "cd .claude/mcp-servers/context-server && npm install --silent 2>/dev/null && npm run build --silent 2>/dev/null && node dist/index.js"]
    }
  }
}
\`\`\`

Only include mcpServers if Node.js is available. Only include permissions for tools that are actually used in the project.

---

### CLAUDE.md [PROJECT-SPECIFIC]

Generate a comprehensive CLAUDE.md. Every section must reflect THIS project — no generic templates.

Sections (in order):
1. **# <project-name> — Claude Code Configuration**
2. **## IDENTITY** — "You are a developer working on <name>, <description>." + bullet list of detected stack
3. **## MANDATORY ROUTING TABLE** — table mapping tasks to 4 skills (safe-dev-workflow, systematic-debugging, code-review, commit-and-pr)
4. **## DECISION RULES** — these 4 universal rules:
   - Architectural decision → write to memory/decisions/YYYY-MM-DD.md
   - "I'll remember"/"I've noted" → write to memory NOW
   - Session start → read memory/wake-up.md
   - Session end → update wake-up.md + create journal
5. **## PROJECT RULES** — rules derived from ACTUAL patterns you observed in the code (e.g., "service layer mandatory", "repository pattern used", "dependency injection via constructors", etc.)
6. **## FORBIDDEN PATTERNS** — based on detected language + universals (no sensitive data logging, no hardcoded secrets, no skipping tests)
7. **## QUALITY GATES** — checklist with REAL commands from the project's package.json/Makefile/etc.
8. **## FILE STRUCTURE** — ACTUAL directory tree (use find/ls to get it, show 2-3 levels deep)
9. **## API STANDARDS** — if REST API detected, show standard REST conventions
10. **## COMMON COMMANDS** — REAL dev/test/lint/build commands from the project
11. **## NAMING CONVENTIONS** — table based on observed code patterns
12. **## ENVIRONMENT VARIABLES** — from .env.example or detected config (use placeholders for values, never real secrets)
13. **## MCP CONTEXT USAGE** — if MCP server was generated, include:
    - get_symbol_context(symbolName)
    - add_observation(symbolName, "insight")
    - get_project_summary()

---

### .gitignore [APPEND]

Append these lines to .gitignore (create if it doesn't exist). Check first if they already exist to avoid duplicates:

\`\`\`
# Claude Code
.claude/settings.local.json
.claude/context.db
.claude/mcp-servers/*/node_modules/
.claude/mcp-servers/*/dist/

# Memory (local session data)
memory/
\`\`\`

---

### MCP Context Server [CONDITIONAL — only if Node.js is available]

Check if Node.js is available (\`node --version\`). If yes, generate the full MCP context server.

Create .claude/mcp-servers/context-server/ with these 4 files:

**package.json:**
\`\`\`json
{
  "name": "context-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "index": "node dist/index-project.js <DETECTED_SOURCE_DIRS>"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.27.1",
    "better-sqlite3": "^12.8.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^25.5.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3"
  }
}
\`\`\`

Replace <DETECTED_SOURCE_DIRS> with the actual source directories of this project (e.g., "src", "backend ui/src", "app lib", "src/main/java").

**tsconfig.json:**
\`\`\`json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./",
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["."],
  "exclude": ["node_modules", "dist"]
}
\`\`\`

**index.ts** — MCP server with 3 tools:
- get_symbol_context(symbolName) — returns symbol info + observations
- add_observation(symbolName, observation) — records insight for future sessions
- get_project_summary() — returns symbol stats + recent observations

Use better-sqlite3 for storage, @modelcontextprotocol/sdk for the MCP protocol, zod for input validation. Resolve project root with: \`path.resolve(import.meta.dirname, "../../../..")\`

**index-project.ts** — Symbol indexer:
- Walks source directories and extracts symbols using regex patterns appropriate for the detected language(s)
- Stores in SQLite: symbols(name, type, file_path, line_number, signature)
- Preserves observations across re-indexes (backup by symbol name, restore after)
- Resolve project root with: \`path.resolve(import.meta.dirname, "../../../..")\`

After creating all files, run: cd .claude/mcp-servers/context-server && npm install

---

## CRITICAL RULES

1. CLAUDE.md MUST reflect THIS project's actual patterns — NOT generic templates
2. Quality gates MUST use commands that actually exist in the project
3. File structure MUST show the real directory layout
4. Project rules MUST be derived from code patterns you observed
5. Permissions MUST match the project's actual tooling
6. Do NOT generate placeholder content — everything must be based on real analysis
7. Universal files (hooks, systematic-debugging, code-review) must be written EXACTLY as provided
`.trim();
}
