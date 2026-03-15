# Auto-Config Mode Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When Claude Code CLI is available, skip the wizard and let Claude Code analyze the project to generate all config files automatically.

**Architecture:** `detect.ts` checks PATH → `prompt.ts` builds the analysis prompt with universal file content inlined → `run.ts` spawns `claude -p` with the prompt via temp file, streams output, enforces 5min timeout → falls back to wizard on failure.

**Tech Stack:** Node.js child_process (spawn), chalk, existing utils/fs.ts

**Spec:** `docs/specs/2026-03-15-auto-config-mode-design.md`

---

## Chunk 1: Auto-Config Implementation

### Task 1: detect.ts

**Files:**
- Create: `src/auto/detect.ts`

- [ ] **Step 1: Create src/auto/detect.ts**

```typescript
import { execSync } from 'node:child_process';

export function isClaudeAvailable(): boolean {
  try {
    execSync('claude --version', { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/auto/detect.ts
git commit -m "feat(auto): add Claude Code CLI detection"
```

---

### Task 2: prompt.ts

**Files:**
- Create: `src/auto/prompt.ts`

This is the core of the feature. The prompt must:
1. Include exact content for universal files (hooks, skills) so Claude Code copies them verbatim
2. Instruct Claude Code to analyze the project deeply
3. Instruct Claude Code to generate project-specific files (CLAUDE.md, settings.json, safe-dev-workflow, commit-and-pr)

- [ ] **Step 1: Create src/auto/prompt.ts**

The function `buildPrompt()` returns a single string with the full prompt. It inlines the universal file content (session-end.sh, check-promises.sh, systematic-debugging.md, code-review.md) directly in the prompt so Claude Code writes them verbatim.

```typescript
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

Use the Write tool to create every file below. For files marked [UNIVERSAL], write the exact content provided. For files marked [PROJECT-SPECIFIC], generate content based on your analysis.

### .claude/hooks/startup.sh [UNIVERSAL + conditional MCP]

Write this exact content. If Node.js is available (node --version succeeds), include the MCP re-index block at the end:

\`\`\`bash
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

Run: chmod 755 .claude/hooks/startup.sh

### .claude/hooks/session-end.sh [UNIVERSAL]

Write this exact content:

\`\`\`bash
#!/bin/bash
JOURNAL_DATE=\\$(date +%Y-%m-%d)
JOURNAL_FILE="memory/journal/\\${JOURNAL_DATE}.md"
mkdir -p "memory/journal"
if [ ! -f "\\$JOURNAL_FILE" ]; then
cat > "\\$JOURNAL_FILE" << EOF
# Journal — \\${JOURNAL_DATE}
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
echo "Journal created: \\$JOURNAL_FILE"
echo "REMINDER: Update wake-up.md before ending session."
fi
\`\`\`

Run: chmod 755 .claude/hooks/session-end.sh

### .claude/hooks/check-promises.sh [UNIVERSAL]

Write this exact content:

\`\`\`bash
#!/bin/bash
# Promise Checker Hook — runs on every Stop event
# Blocks response if Claude promised to write something but didn't

TRANSCRIPT_FILE="\\$1"

if [ -z "\\$TRANSCRIPT_FILE" ] || [ ! -f "\\$TRANSCRIPT_FILE" ]; then
  exit 0
fi

LAST_ASSISTANT_MSG=\\$(python3 -c "
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
" "\\$TRANSCRIPT_FILE" 2>/dev/null)

if [ -z "\\$LAST_ASSISTANT_MSG" ]; then
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
for pattern in "\\${PROMISE_PATTERNS[@]}"; do
  if echo "\\$LAST_ASSISTANT_MSG" | grep -qi "\\$pattern"; then
    FOUND_PROMISE=true
    break
  fi
done

if [ "\\$FOUND_PROMISE" = true ]; then
  WRITE_ACTION=\\$(echo "\\$LAST_ASSISTANT_MSG" | python3 -c "
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

  if [ "\\$WRITE_ACTION" = "no" ]; then
    echo "HOOK ERROR: You said you'd remember/write something but didn't."
    echo "Go back and write it to memory/ BEFORE responding."
    exit 1
  fi
fi

exit 0
\`\`\`

Run: chmod 755 .claude/hooks/check-promises.sh

### .claude/skills/systematic-debugging.md [UNIVERSAL]

Write this exact content:

\`\`\`markdown
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

### .claude/skills/code-review.md [UNIVERSAL]

Write this exact content:

\`\`\`markdown
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

### .claude/skills/safe-dev-workflow.md [PROJECT-SPECIFIC]

Generate based on your analysis. Must include real commands from the project:

\`\`\`markdown
---
name: safe-dev-workflow
description: Use for any code change to ensure quality and safety
---

# Safe Development Workflow

## Step 1: Understand
- Read all relevant source files before changing anything
- Identify the scope of the change

## Step 2: Implement
- Make changes incrementally
- Follow existing code patterns

## Step 3: Verify
Run all quality gates:
- [ ] [REAL type check command from project]
- [ ] [REAL test command from project]
- [ ] [REAL lint command from project]

## Step 4: Review
- Re-read the diff
- Ensure no debug code remains
\`\`\`

### .claude/skills/commit-and-pr.md [PROJECT-SPECIFIC]

Generate conventional commits skill with scope list derived from actual project modules/directories.

### .claude/settings.json [PROJECT-SPECIFIC]

Generate with:
- permissions: based on actual tooling detected (npm/python/go/bundle/mvn/etc + git + detected DB CLI)
- hooks: register all 3 hooks (SessionStart, SessionEnd, Stop) in the correct format
- mcpServers: include if Node.js available, with the bash auto-build command

Format:
\`\`\`json
{
  "permissions": { "allow": [...], "deny": [] },
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "bash .claude/hooks/startup.sh" }] }],
    "SessionEnd": [{ "hooks": [{ "type": "command", "command": "bash .claude/hooks/session-end.sh" }] }],
    "Stop": [{ "matcher": "", "hooks": [{ "type": "command", "command": "bash .claude/hooks/check-promises.sh \\${CLAUDE_TRANSCRIPT}" }] }]
  },
  "mcpServers": { "context": { "command": "bash", "args": ["-c", "cd .claude/mcp-servers/context-server && npm install --silent 2>/dev/null && npm run build --silent 2>/dev/null && node dist/index.js"] } }
}
\`\`\`

### CLAUDE.md [PROJECT-SPECIFIC]

Generate a comprehensive CLAUDE.md with these sections. Each must reflect THIS project's actual code:

1. **IDENTITY** — project name (from package.json/go.mod/etc), description, detected stack
2. **MANDATORY ROUTING TABLE** — map tasks to the 4 skills
3. **DECISION RULES** — universal memory discipline (same for all projects):
   - Architectural decision → write to memory/decisions/
   - "I'll remember" → write to memory NOW
   - Session start → read memory/wake-up.md
   - Session end → update wake-up.md + journal
4. **PROJECT RULES** — derived from ACTUAL code patterns you observed (e.g., "service layer pattern used", "repository pattern", "dependency injection via constructors")
5. **FORBIDDEN PATTERNS** — based on detected language + universal (no sensitive data logging, no hardcoded secrets)
6. **QUALITY GATES** — REAL commands that exist in the project (from package.json scripts, Makefile, etc.)
7. **FILE STRUCTURE** — ACTUAL directory tree (run ls/find to get it)
8. **API STANDARDS** — if REST API detected, include standard conventions
9. **COMMON COMMANDS** — REAL dev/test/lint/build commands from the project
10. **NAMING CONVENTIONS** — observed from actual code
11. **ENVIRONMENT VARIABLES** — from .env.example or detected config files
12. **MCP CONTEXT USAGE** — if MCP server was generated

### .gitignore [APPEND]

Append these lines if not already present:
\`\`\`
# Claude Code
.claude/settings.local.json
.claude/context.db
.claude/mcp-servers/*/node_modules/
.claude/mcp-servers/*/dist/

# Memory (local session data)
memory/
\`\`\`

### MCP Context Server (if Node.js available)

Generate the full .claude/mcp-servers/context-server/ with:
- package.json (deps: @modelcontextprotocol/sdk, better-sqlite3, zod; index script with detected source dirs)
- tsconfig.json (ES2022, Node16)
- index.ts (MCP server with get_symbol_context, add_observation, get_project_summary tools)
- index-project.ts (symbol indexer with parser patterns for detected languages)

Then run: cd .claude/mcp-servers/context-server && npm install

## CRITICAL RULES
- CLAUDE.md MUST reflect THIS project's actual patterns, NOT generic templates
- Quality gates MUST use commands that actually exist in the project
- File structure MUST show the real directory layout
- Project rules MUST be derived from code patterns you observed
- Permissions MUST match the project's actual tooling
- Do NOT generate placeholder or template content — everything must be real
`.trim();
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/auto/prompt.ts
git commit -m "feat(auto): add prompt builder with universal file content"
```

---

### Task 3: run.ts

**Files:**
- Create: `src/auto/run.ts`

- [ ] **Step 1: Create src/auto/run.ts**

```typescript
import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import chalk from 'chalk';
import { buildPrompt } from './prompt.js';
import { checkExistingConfig } from '../utils/fs.js';

const TIMEOUT_MS = 5 * 60 * 1000;

export async function runAutoConfig(): Promise<void> {
  const proceed = await checkExistingConfig();
  if (!proceed) {
    console.log('Cancelled.');
    process.exit(0);
  }

  const prompt = buildPrompt();
  const tmpFile = join(tmpdir(), `claude-config-prompt-${Date.now()}.txt`);

  try {
    writeFileSync(tmpFile, prompt, 'utf-8');
    console.log(chalk.cyan('Claude Code detected. Analyzing project...\n'));
    await spawnClaude(tmpFile);
    listGeneratedFiles();
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
}

function spawnClaude(promptFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', [
      '-c',
      `claude -p "$(cat '${promptFile}')" --allowedTools "Write,Bash(ls:*),Bash(cat:*),Bash(find:*),Bash(head:*),Bash(chmod:*),Bash(mkdir:*),Bash(npm:*),Bash(node:*)" --max-turns 30 --output-format text`,
    ], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Claude Code timed out after 5 minutes'));
    }, TIMEOUT_MS);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Claude Code exited with code ${code}`));
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function listGeneratedFiles(): void {
  const cwd = process.cwd();
  const files: string[] = [];

  function walk(dir: string, prefix: string) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) walk(join(dir, entry.name), rel);
        else files.push(rel);
      }
    } catch {}
  }

  const claudeDir = join(cwd, '.claude');
  try {
    statSync(claudeDir);
    walk(claudeDir, '.claude');
  } catch {}

  try {
    statSync(join(cwd, 'CLAUDE.md'));
    files.push('CLAUDE.md');
  } catch {}

  if (files.length > 0) {
    console.log(chalk.bold('\nGenerated files:'));
    for (const f of files) {
      console.log(chalk.dim(`  ${f}`));
    }
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/auto/run.ts
git commit -m "feat(auto): add Claude Code spawner with timeout and file listing"
```

---

### Task 4: Wire up index.ts

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Update src/index.ts**

```typescript
import { isClaudeAvailable } from './auto/detect.js';
import { runAutoConfig } from './auto/run.js';
import { runWizard } from './prompts/index.js';
import { generate } from './generators/index.js';
import chalk from 'chalk';

try {
  console.log('\n🔧 create-claude-config\n');

  if (isClaudeAvailable()) {
    try {
      await runAutoConfig();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.yellow(`\nAuto-config failed: ${msg}`));
      console.log('Falling back to manual wizard.\n');
      const config = await runWizard();
      await generate(config);
    }
  } else {
    console.log('Claude Code not found, falling back to manual wizard.');
    console.log('Install Claude Code for auto-detection.\n');
    const config = await runWizard();
    await generate(config);
  }

  console.log('\n✅ Configuration generated successfully!\n');
} catch (err) {
  console.error(err);
}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

- [ ] **Step 3: Test locally**

```bash
npm link
mkdir /tmp/test-auto && cd /tmp/test-auto
git init && npm init -y
create-claude-config
```

Expected: detects Claude Code, runs auto mode, generates files.

- [ ] **Step 4: Commit and push**

```bash
git add src/index.ts src/auto/
git commit -m "feat: add Claude Code auto-config mode with wizard fallback"
git push origin main
```
