# create-claude-config — Claude Code Configuration

## IDENTITY

You are a **TypeScript developer** working on **create-claude-config**, an interactive CLI tool (npm package) that scaffolds Claude Code project configuration for any tech stack.

- **Runtime**: Node.js 18+, TypeScript (strict), ESM
- **CLI**: @inquirer/prompts for interactive wizard
- **Templating**: All templates are inlined as string constants (no EJS files — tsc doesn't copy non-TS files)
- **Distribution**: npm (`npx create-claude-config`)
- **Tests**: Vitest

## MANDATORY ROUTING TABLE

| When the user asks for... | First action |
|---|---|
| Any code change | Invoke safe-dev-workflow skill |
| Bug or error | Invoke systematic-debugging skill |
| Code review | Invoke code-review skill |
| Commit or PR | Invoke commit-and-pr skill |
| New stack support | Add parser + update generators + update prompts |
| New CLAUDE.md section | Add section function in `claude-md.ts` |

## DECISION RULES

1. **Architectural decision made** → write to `memory/decisions/YYYY-MM-DD.md` BEFORE responding
2. **When saying "I'll remember" / "I've noted"** → write to memory NOW
3. **Session start** → read `memory/wake-up.md` as FIRST action
4. **Session end** → update `memory/wake-up.md` + create journal entry
5. **New dependency added** → document reason in `memory/decisions/YYYY-MM-DD.md`

## PROJECT RULES

1. **Templates are inlined** — all template content lives as string constants inside generator files. Never use external `.ejs` or `.md` template files (tsc won't copy them to `dist/`).
2. **Generators are independent** — each generator receives a `ProjectConfig` and writes its files. No generator depends on another's output.
3. **Prompts are modular** — each prompt file handles one step of the wizard and returns a typed partial config.
4. **Parsers are declarative** — each parser file exports a `ParserDef` with regex patterns. The MCP generator embeds them into the output.
5. **Config derivation is separate** — `utils/derive.ts` computes `isMonorepo`, `languages`, and `sourceDirs` from raw wizard answers.
6. **Edge cases are handled** — existing `.claude/` dir triggers overwrite confirmation, existing `CLAUDE.md` offers backup.

## FORBIDDEN PATTERNS

- NEVER use `any` type without a comment explaining why
- NEVER skip running tests after a code change
- NEVER use external template files (EJS, Handlebars, etc.) — inline all templates as string constants
- NEVER hardcode paths to `dist/` in templates — use `import.meta.url` or `import.meta.dirname`
- NEVER add runtime dependencies that aren't needed by the end user's generated config

## QUALITY GATES

Before marking ANY task complete:

- [ ] `npx tsc --noEmit` — zero type errors
- [ ] `npm run build` — compiles to `dist/`
- [ ] `npm test` — all tests pass (when tests exist)

## FILE STRUCTURE

```
create-claude-config/
├── bin/cli.js                # Entry point (#!/usr/bin/env node)
├── src/
│   ├── index.ts              # Main orchestrator (wizard → generate)
│   ├── types.ts              # ProjectConfig interface
│   ├── prompts/              # Wizard steps
│   │   ├── index.ts          # Orchestrates all prompts + preview
│   │   ├── project.ts        # Project name, description
│   │   ├── stack.ts          # Backend, frontend, database selection
│   │   ├── features.ts       # ORM, test framework, MCP, hooks
│   │   └── preview.ts        # Summary display + confirmation
│   ├── generators/           # File generators (one per output type)
│   │   ├── index.ts          # Orchestrates all generators
│   │   ├── settings.ts       # .claude/settings.json
│   │   ├── hooks.ts          # .claude/hooks/*.sh
│   │   ├── skills.ts         # .claude/skills/*.md
│   │   ├── claude-md.ts      # CLAUDE.md (12 section functions)
│   │   ├── gitignore.ts      # .gitignore appender
│   │   └── mcp-server.ts     # .claude/mcp-servers/context-server/
│   ├── parsers/              # Symbol regex definitions by language
│   │   ├── index.ts          # ParserDef type + getParserDefs()
│   │   ├── javascript.ts     # JS/TS patterns
│   │   ├── python.ts         # Python patterns
│   │   ├── go.ts             # Go patterns
│   │   ├── ruby.ts           # Ruby patterns
│   │   └── java.ts           # Java patterns
│   └── utils/
│       ├── derive.ts         # Config derivation (monorepo, languages, sourceDirs)
│       ├── fs.ts             # File operations (writeFile, appendToFile, checkExisting)
│       └── template.ts       # Template rendering utility
├── package.json
└── tsconfig.json
```

## KEY PATTERNS

### Adding a New Stack

1. Create parser in `src/parsers/<language>.ts` exporting a `ParserDef`
2. Register in `src/parsers/index.ts` → `parserMap`
3. Add prompt choices in `src/prompts/stack.ts`
4. Add permission rules in `src/generators/settings.ts` → `getPermissions()`
5. Add quality gates in `src/generators/claude-md.ts` → `sectionQualityGates()`
6. Add project rules in `src/generators/claude-md.ts` → `sectionProjectRules()`
7. Add forbidden patterns in `src/generators/claude-md.ts` → `sectionForbiddenPatterns()`
8. Add common commands in `src/generators/claude-md.ts` → `sectionCommonCommands()`
9. Add file structure in `src/generators/claude-md.ts` → `sectionFileStructure()`
10. Update safe-dev-workflow skill in `src/generators/skills.ts`

### Adding a New CLAUDE.md Section

1. Add `function sectionMySection(config: ProjectConfig): string` in `src/generators/claude-md.ts`
2. Add it to the `sections` array in `generateClaudeMd()`

## COMMON COMMANDS

```bash
npm run build            # Compile TypeScript to dist/
npm run dev              # Watch mode
npm test                 # Run tests (Vitest)
npm link                 # Link for local testing
npx create-claude-config # Run locally after link
```

## NAMING CONVENTIONS

| Context | Convention | Example |
|---|---|---|
| Files | kebab-case | `claude-md.ts` |
| Functions | camelCase | `generateSettings()` |
| Interfaces/Types | PascalCase | `ProjectConfig` |
| Constants | UPPER_SNAKE_CASE | `CLAUDE_GITIGNORE` |
| Template strings | camelCase functions | `sectionIdentity()` |

## MCP CONTEXT USAGE

When working with any function or class:

1. FIRST call get_symbol_context(symbolName) to see what you already know
2. After making observations, call add_observation(symbolName, "your insight")
3. Start sessions with get_project_summary() for orientation
