# create-claude-config

Interactive CLI that scaffolds [Claude Code](https://claude.ai/claude-code) project configuration for any tech stack. Generates `.claude/` directory, `CLAUDE.md`, hooks, skills, and an optional MCP context server — all customized to your project.

## Quick Start

```bash
npx create-claude-config
```

Answer ~8 questions about your project and get a complete Claude Code configuration in seconds.

## Supported Stacks

| Layer | Options |
|-------|---------|
| **Backend** | Node.js (Express, Fastify, NestJS), Python (Django, FastAPI, Flask), Go, Ruby (Rails, Sinatra), Java (Spring Boot, Quarkus) |
| **Frontend** | React (Vite, Next.js, CRA), Vue (Vite, Nuxt), Angular, Svelte |
| **Database** | PostgreSQL, MySQL, MongoDB, SQLite |
| **ORM** | Sequelize, Prisma, TypeORM, Drizzle, Mongoose, Hibernate/JPA, jOOQ |

## What Gets Generated

```
.claude/
├── settings.json              # Permissions, hooks, MCP config
├── hooks/
│   ├── startup.sh             # Session wake-up context + re-index
│   ├── session-end.sh         # Daily journal creation
│   └── check-promises.sh      # Memory discipline enforcement
├── skills/
│   ├── safe-dev-workflow.md   # Type-check → test → lint workflow
│   ├── systematic-debugging.md # Phase-based debugging methodology
│   ├── code-review.md         # 5-dimension review checklist
│   └── commit-and-pr.md       # Conventional commits + PR template
└── mcp-servers/               # (optional)
    └── context-server/        # Symbol indexing for codebase navigation
CLAUDE.md                      # Project rules, quality gates, conventions
.gitignore                     # Claude Code entries appended
```

### Generated CLAUDE.md includes:

- **Identity** — project name, tech stack summary
- **Routing Table** — maps tasks to skills
- **Project Rules** — framework-specific best practices
- **Forbidden Patterns** — language-specific anti-patterns
- **Quality Gates** — real CLI commands for your stack
- **File Structure** — default directory layout
- **Common Commands** — dev/test/lint/build
- **Naming Conventions** — per-language standards

### MCP Context Server (optional)

When enabled, generates a local MCP server that indexes your codebase symbols (functions, classes, interfaces) into a SQLite database. Claude Code uses this for faster navigation.

Includes parsers for: JavaScript/TypeScript, Python, Go, Ruby, Java.

## Requirements

- Node.js 18+
- Claude Code CLI

## License

MIT
