export function buildPrompt(includeMcp: boolean): string {
  const mcpNote = includeMcp
    ? 'An MCP context server has been set up at .claude/mcp-servers/context-server/. Include the mcpServers config in settings.json and the MCP CONTEXT USAGE section in CLAUDE.md.'
    : 'No MCP context server was requested. Do NOT include mcpServers in settings.json or MCP sections in CLAUDE.md.';

  return `
You are setting up Claude Code configuration for THIS project. The universal files (hooks, universal skills, memory directory, .gitignore) have already been generated. ${includeMcp ? 'An MCP context server has also been generated.' : ''} Your job is to analyze the project and generate the PROJECT-SPECIFIC files only.

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
- Build command(s) and dev server command(s)
- Monorepo vs single-repo structure
- Architecture patterns in use (MVC, service layer, repository, etc.)
- Naming conventions in the code
- Available scripts (npm scripts, Makefile targets, etc.)

## Step 2: Generate project-specific files

You MUST generate ALL 4 files below using the Write tool. Do not skip any.

### File 1: .claude/settings.json

Generate with this exact structure:

{
  "permissions": {
    "allow": [
      "Bash(git log:*)", "Bash(git diff:*)", "Bash(git status:*)", "Bash(git stash:*)",
      "Bash(ls:*)", "Bash(cat:*)", "Bash(grep:*)", "Bash(echo:*)", "Bash(find:*)"
      // ADD tool-specific permissions based on detected stack:
      // Node.js: "Bash(npm:*)", "Bash(npx:*)", "Bash(node:*)"
      // Python: "Bash(python:*)", "Bash(pip:*)", "Bash(pytest:*)", "Bash(mypy:*)", "Bash(ruff:*)"
      // Go: "Bash(go:*)", "Bash(make:*)"
      // Ruby: "Bash(ruby:*)", "Bash(bundle:*)", "Bash(rails:*)", "Bash(rake:*)"
      // Java/Maven: "Bash(./mvnw:*)", "Bash(mvn:*)", "Bash(java:*)"
      // Java/Gradle: "Bash(./gradlew:*)", "Bash(gradle:*)", "Bash(java:*)"
      // PostgreSQL: "Bash(psql:*)"  MySQL: "Bash(mysql:*)"  MongoDB: "Bash(mongosh:*)"
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

${includeMcp ? 'Include the mcpServers block exactly as shown above.' : 'Do NOT include the mcpServers block.'} Only include permissions for tools actually used in the project. Output valid JSON (no comments).

### File 2: .claude/skills/safe-dev-workflow.md

Generate with REAL commands from this project:

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
- [ ] **[Type check]**: [REAL command from this project]
- [ ] **Tests**: [REAL test command from this project]
- [ ] **Lint**: [REAL lint command from this project]

## Step 4: Review
- Re-read the diff to catch mistakes
- Ensure no debug code or temporary changes remain

Replace all [REAL ...] placeholders with actual commands found in package.json scripts, Makefile, etc.

### File 3: .claude/skills/commit-and-pr.md

Generate a conventional commits skill with:
- Format: <type>(<scope>): <description>
- Types: feat, fix, refactor, chore, style, test, perf, ci
- Scopes: derived from actual project top-level directories/modules (e.g., api, service, model, config, auth, ui, test)
- Rules: imperative mood, lowercase, no period, max 72 chars, NEVER include Co-Authored-By
- PR template with ## Summary, ### Changes, ## Testing, ## Checklist sections

### File 4: CLAUDE.md

Generate a comprehensive CLAUDE.md with these sections. EVERY section must reflect THIS project's actual code — no generic templates.

1. **# <project-name> — Claude Code Configuration**
2. **## IDENTITY** — "You are a developer working on <name>, <description>." + bullet list of detected stack (backend, frontend, database, tests)
3. **## MANDATORY ROUTING TABLE** — table:
   | When the user asks for... | First action |
   |---|---|
   | Any code change | Invoke safe-dev-workflow skill |
   | Bug or error | Invoke systematic-debugging skill |
   | Code review | Invoke code-review skill |
   | Commit or PR | Invoke commit-and-pr skill |
4. **## DECISION RULES** — these 4 universal rules:
   - Architectural decision → write to memory/decisions/YYYY-MM-DD.md BEFORE responding
   - "I'll remember"/"I've noted" → write to memory NOW
   - Session start → read memory/wake-up.md as FIRST action
   - Session end → update wake-up.md + create journal entry
5. **## PROJECT RULES** — rules derived from ACTUAL patterns observed (e.g., "service layer mandatory", "fat models thin views", "constructor injection only")
6. **## FORBIDDEN PATTERNS** — based on detected language + universals (no sensitive data logging, no hardcoded secrets, no skipping tests)
7. **## QUALITY GATES** — checklist with REAL commands from package.json/Makefile/etc.
8. **## FILE STRUCTURE** — ACTUAL directory tree (use find/ls, show 2-3 levels deep)
9. **## COMMON COMMANDS** — REAL dev/test/lint/build commands
10. **## NAMING CONVENTIONS** — table based on observed patterns
11. **## ENVIRONMENT VARIABLES** — from .env.example or detected config (placeholders only, never real secrets)
${includeMcp ? `12. **## MCP CONTEXT USAGE** — include:
    - get_symbol_context(symbolName)
    - add_observation(symbolName, "insight")
    - get_project_summary()` : '(No MCP section — MCP server was not requested)'}

## CRITICAL RULES

1. You MUST generate ALL 4 files — settings.json, safe-dev-workflow.md, commit-and-pr.md, CLAUDE.md
2. CLAUDE.md MUST reflect THIS project's actual patterns — NOT generic templates
3. Quality gates MUST use commands that actually exist in this project
4. File structure MUST show the real directory layout
5. Project rules MUST be derived from code patterns you observed
6. Do NOT regenerate hooks, universal skills, memory, or .gitignore — those already exist
`.trim();
}
