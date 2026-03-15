# Design Spec: Claude Code Auto-Config Mode

**Date:** 2026-03-15
**Status:** Approved
**Author:** Wagner Junior + Claude

## Overview

When `npx create-claude-config` runs in a project where the `claude` CLI is available, it skips the interactive wizard and instead invokes Claude Code to analyze the codebase and generate all configuration files directly. This produces project-specific rules based on actual code patterns rather than generic framework templates.

## Goals

1. Zero-question setup when Claude Code is available
2. Generate CLAUDE.md with rules derived from actual project code (not generic templates)
3. Detect real quality gate commands, naming conventions, and architecture patterns
4. Keep the existing wizard as fallback when Claude Code is not installed

## Non-Goals

- Modifying the existing wizard flow
- Requiring Claude Code as a dependency
- Caching or persisting analysis results

## Flow

```
npx create-claude-config
        │
        ▼
  claude CLI in PATH?
   ├── YES → Auto mode
   │     │
   │     ▼
   │   Check existing .claude/ and CLAUDE.md (backup if needed)
   │     │
   │     ▼
   │   "Claude Code detected. Analyzing project..." (real-time output)
   │     │
   │     ▼
   │   Spawn: claude -p <prompt-file> --allowedTools ...
   │     │
   │     ▼
   │   Claude Code reads configs + source code samples
   │   and generates .claude/, CLAUDE.md, .gitignore
   │     │
   │     ├── SUCCESS → List generated files → "✅ Done!"
   │     └── FAILURE → "Auto-config failed. Falling back to manual wizard."
   │                    → Run wizard (existing flow)
   │
   └── NO → "Claude Code not found, falling back to manual wizard."
             "Install Claude Code for auto-detection."
              │
              ▼
           Interactive wizard (existing flow, unchanged)
```

## Architecture

### New Files

```
src/
├── auto/
│   ├── detect.ts         # Detect if claude CLI is in PATH
│   ├── run.ts            # Spawn claude process, handle timeout, list results
│   └── prompt.ts         # Build the analysis + generation prompt
```

### Modified Files

```
src/
├── index.ts              # Add auto-mode branch before wizard
```

### Unchanged

```
src/
├── prompts/              # Wizard prompts (fallback)
├── generators/           # File generators (fallback)
├── parsers/              # Symbol parsers (fallback)
└── utils/                # Utilities (shared)
```

## Implementation Details

### detect.ts

Checks if `claude` is available:

```typescript
import { execSync } from 'node:child_process';

export function isClaudeAvailable(): boolean {
  try {
    execSync('claude --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
```

### run.ts

Spawns Claude Code as a child process with proper timeout and error handling.

**Prompt delivery:** The prompt is written to a temporary file and passed via stdin pipe to avoid shell escaping issues with the multi-KB prompt string.

**Process management:** Uses `spawn` (not `execSync`) for:
- Streaming output to the terminal in real-time
- Wall-clock timeout enforcement (5 minutes)
- Graceful cancellation on timeout

```typescript
import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import chalk from 'chalk';
import { buildPrompt } from './prompt.js';
import { checkExistingConfig } from '../utils/fs.js';

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function runAutoConfig(): Promise<void> {
  // Check for existing config before running (backup CLAUDE.md, etc.)
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
    const args = [
      '-p', `$(cat ${promptFile})`,
      '--allowedTools', 'Write,Bash(ls:*),Bash(cat:*),Bash(find:*),Bash(head:*),Bash(chmod:*)',
      '--max-turns', '30',
      '--output-format', 'text',
    ];

    const child = spawn('claude', args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true,
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
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(dir, entry.name), rel);
      else files.push(rel);
    }
  }

  const claudeDir = join(cwd, '.claude');
  if (statSync(claudeDir, { throwIfNoEntry: false })) walk(claudeDir, '.claude');

  const claudeMd = join(cwd, 'CLAUDE.md');
  if (statSync(claudeMd, { throwIfNoEntry: false })) files.push('CLAUDE.md');

  if (files.length > 0) {
    console.log(chalk.bold('\nGenerated files:'));
    for (const f of files) {
      console.log(chalk.dim(`  ${f}`));
    }
  }
}
```

### prompt.ts

Builds the full prompt string. The prompt is the core of this feature — it must instruct Claude Code to analyze deeply and generate project-specific configuration.

The prompt includes:
- Exact content for universal files (hooks, skills) — inlined from our existing generators
- Instructions for project-specific files (CLAUDE.md, settings.json, safe-dev-workflow)
- Examples of expected output format for each file
- Rules to ensure quality (real commands, real patterns, no generic templates)

The prompt will be written during implementation following this structure:

```
You are setting up Claude Code configuration for this project.

## Step 1: Analyze the project

Read these files to understand the stack:
- package.json, requirements.txt, go.mod, pom.xml, Gemfile, Makefile, Cargo.toml
- tsconfig.json, pyproject.toml, build.gradle, settings.gradle

Then sample source code (up to 15 files) from:
- Controllers/handlers/views/routes
- Services/use cases/business logic
- Models/entities/schemas
- Tests
- Config files

Detect:
- Backend language and framework
- Frontend framework (if any)
- Database and ORM
- Test framework and runner
- Linter and formatter
- Monorepo vs single-repo structure
- Architecture patterns in use (MVC, service layer, repository pattern, etc.)
- Naming conventions used in the code
- Available npm scripts / make targets / CLI commands

## Step 2: Generate configuration files

Generate ALL of the following files using the Write tool:

### .claude/settings.json
[format spec: permissions array based on detected tooling, hooks registration,
 optional MCP server config]

### .claude/hooks/startup.sh
[exact content with wake-up context + optional MCP re-index if Node.js available]
Make executable: chmod 755

### .claude/hooks/session-end.sh
[exact content — universal, provided inline]
Make executable: chmod 755

### .claude/hooks/check-promises.sh
[exact content — universal, provided inline]
Make executable: chmod 755

### .claude/skills/systematic-debugging.md
[exact content — universal, provided inline]

### .claude/skills/code-review.md
[exact content — universal, provided inline]

### .claude/skills/safe-dev-workflow.md
[instructions: generate quality gates from actual project commands]

### .claude/skills/commit-and-pr.md
[instructions: generate scopes from actual project modules]

### .claude/mcp-servers/context-server/
[instructions: generate full MCP server if Node.js is available,
 including package.json, tsconfig.json, index.ts, index-project.ts
 with parsers for detected languages. Then run npm install.]

### CLAUDE.md
[instructions for each section:
 - Identity: project name, detected stack
 - Routing table: map tasks to skills
 - Decision rules: universal memory discipline
 - Project rules: based on ACTUAL patterns observed in code
 - Forbidden patterns: based on detected language
 - Quality gates: REAL commands from package.json/Makefile/etc.
 - File structure: ACTUAL directory tree (not template)
 - API standards: if REST API detected
 - Common commands: from actual scripts/Makefile
 - Naming conventions: from actual code patterns
 - Environment variables: from .env.example or detected config
 - MCP context usage: if MCP server was generated]

### .gitignore
[append Claude Code entries if not already present]

## Rules
- CLAUDE.md must reflect THIS project's actual patterns, not generic templates
- Quality gates must use commands that actually exist in the project
- File structure must show the real directory layout
- Project rules must be derived from code patterns you observed
- Permissions in settings.json must match the project's actual tooling
- If Node.js is not available, skip MCP server generation entirely
```

### index.ts Changes

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

## Edge Cases

1. **Claude Code available but API key not configured** — `claude -p` fails with auth error. Caught by inner try/catch, falls back to wizard with message.
2. **Claude Code times out** — 5-minute wall-clock timeout kills the process. Falls back to wizard.
3. **Existing .claude/ directory** — `checkExistingConfig()` runs before Claude Code, prompts for backup/overwrite (same UX as wizard).
4. **Project with no recognizable stack** — Claude Code analyzes directory structure and generates minimal config.
5. **Prompt file cleanup** — temp file is always cleaned up via `finally` block.
6. **`--max-turns` exceeded** — Claude Code exits with non-zero code, caught as failure, falls back to wizard.

## CLI Flags (future)

- `--wizard` — force wizard mode even when Claude Code is available
- Not in scope for MVP but noted for future enhancement

## What Changes vs. Current

| Aspect | Current (wizard) | New (auto mode) |
|--------|------------------|-----------------|
| Questions asked | ~8 interactive prompts | 0 (fully automatic) |
| CLAUDE.md rules | Generic per framework | Specific to project code |
| Quality gates | Template commands | Real commands from project |
| File structure | Default per framework | Actual directory layout |
| Time | ~2 min (user interaction) | ~30-60s (automated) |
| Dependency | None | Claude Code CLI + API key |
| Failure mode | N/A | Falls back to wizard |
