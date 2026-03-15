import path from 'node:path';
import type { ProjectConfig } from '../types.js';
import { writeFile } from '../utils/fs.js';

const BACKEND_LABELS: Record<string, string> = {
  nodejs: 'Node.js',
  python: 'Python',
  go: 'Go',
  ruby: 'Ruby',
  java: 'Java',
};
const FRONTEND_LABELS: Record<string, string> = {
  react: 'React',
  vue: 'Vue',
  angular: 'Angular',
  svelte: 'Svelte',
};
const DB_LABELS: Record<string, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mongodb: 'MongoDB',
  sqlite: 'SQLite',
};
const LANG_LABELS: Record<string, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
};

function getBackendLine(config: ProjectConfig): string {
  const label = BACKEND_LABELS[config.backend] ?? config.backend;
  const langKey = config.backendLanguage ?? '';
  const lang = langKey ? (LANG_LABELS[langKey] ?? '') : '';
  const framework = config.backendFramework ? ` + ${config.backendFramework}` : '';
  const langPart = lang ? ` (${lang})` : '';
  return `**Backend**: ${label}${framework}${langPart}`;
}

function getFrontendLine(config: ProjectConfig): string {
  const label = FRONTEND_LABELS[config.frontend] ?? config.frontend;
  const meta = config.frontendMeta ? ` (${config.frontendMeta})` : '';
  return `**Frontend**: ${label}${meta}`;
}

function getDatabaseLine(config: ProjectConfig): string {
  const label = DB_LABELS[config.database] ?? config.database;
  const ormPart = config.orm ? ` + ${config.orm}` : '';
  return `**Database**: ${label}${ormPart}`;
}

// ---------------------------------------------------------------------------
// Section: Identity
// ---------------------------------------------------------------------------

function sectionIdentity(config: ProjectConfig): string {
  const stackParts: string[] = [];
  if (config.backend !== 'none') stackParts.push(getBackendLine(config));
  if (config.frontend !== 'none') stackParts.push(getFrontendLine(config));
  if (config.database !== 'none') stackParts.push(getDatabaseLine(config));
  stackParts.push(`**Tests**: ${config.testFramework}`);

  const identityDesc = config.description ? `, ${config.description}` : '';
  const intro = `You are a **full-stack developer** working on **${config.projectName}**${identityDesc}.`;
  const bullets = stackParts.map(s => `- ${s}`);

  const lines = [
    `# ${config.projectName} — Claude Code Configuration`,
    '',
    '## IDENTITY',
    '',
    intro,
    '',
    ...bullets,
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Section: Routing Table
// ---------------------------------------------------------------------------

function sectionRoutingTable(): string {
  return `## MANDATORY ROUTING TABLE

| When the user asks for... | First action |
|---|---|
| Any code change | Invoke safe-dev-workflow skill |
| Bug or error | Invoke systematic-debugging skill |
| Code review | Invoke code-review skill |
| Commit or PR | Invoke commit-and-pr skill |`;
}

// ---------------------------------------------------------------------------
// Section: Decision Rules
// ---------------------------------------------------------------------------

function sectionDecisionRules(): string {
  return `## DECISION RULES

1. **Architectural decision made** → write to \`memory/decisions/YYYY-MM-DD.md\` BEFORE responding
2. **When saying "I'll remember" / "I've noted"** → write to memory NOW
3. **Session start** → read \`memory/wake-up.md\` as FIRST action
4. **Session end** → update \`memory/wake-up.md\` + create journal entry`;
}

// ---------------------------------------------------------------------------
// Section: Project Rules
// ---------------------------------------------------------------------------

function getStackRules(config: ProjectConfig): string[] {
  const backend = config.backend;
  const fw = config.backendFramework;
  if (backend === 'nodejs' && fw === 'express') {
    const base = [
      '**Service layer is mandatory** — ALL business logic lives in services/. Controllers handle HTTP only (parse request → call service → send response).',
      '**Use database transactions** for any operation touching multiple tables.',
    ];
    const front = config.frontend === 'none'
      ? []
      : [
          '**React Query for ALL server state** — Redux is ONLY for auth state and cross-component UI state. Never store API data in Redux.',
          '**Custom hooks for data fetching** — every `useQuery`/`useMutation` must be wrapped in a custom hook, never called inline in components.',
        ];
    return [...base, ...front];
  }
  if (backend === 'nodejs' && fw === 'nestjs') {
    return [
      '**Use dependency injection** — let NestJS manage service lifetimes. Never manually instantiate services.',
      '**Thin controllers** — controllers handle HTTP concerns only. All business logic belongs in services.',
      '**Services for business logic** — encapsulate domain logic in injectable service classes.',
    ];
  }
  if (backend === 'python' && fw === 'django') {
    return [
      '**Fat models, thin views** — business logic belongs in models and managers, not in views.',
      '**Use Django ORM managers** — encapsulate common queries in custom managers.',
      '**Signals for side effects** — use Django signals for cross-cutting concerns, not inline logic in views.',
    ];
  }
  if (backend === 'python' && fw === 'fastapi') {
    return [
      '**Pydantic models for validation** — all request/response schemas use Pydantic models.',
      '**Dependency injection** — use FastAPI `Depends()` for shared logic (auth, DB sessions, etc.).',
      '**Async by default** — use `async def` for route handlers and service methods.',
    ];
  }
  if (backend === 'go') {
    return [
      '**Accept interfaces, return structs** — depend on behavior, not concrete types.',
      '**Error wrapping with %w** — always wrap errors with `fmt.Errorf("context: %w", err)` for stack traces.',
      '**Context propagation** — pass `context.Context` as the first parameter to all functions that do I/O.',
    ];
  }
  if (backend === 'ruby' && fw === 'rails') {
    return [
      '**Convention over configuration** — follow Rails conventions for naming, file placement, and routing.',
      '**Concerns for shared behavior** — extract shared model/controller logic into concerns.',
      '**Service objects for complex logic** — operations involving multiple models belong in app/services/.',
    ];
  }
  if (backend === 'java' && fw === 'spring-boot') {
    return [
      '**Constructor injection** — always use constructor injection, never field injection with `@Autowired`.',
      '**@Transactional on service layer** — annotate service methods, not controllers or repositories.',
      '**DTOs for API boundaries** — never expose JPA entities directly in API responses.',
    ];
  }
  return [];
}

function sectionProjectRules(config: ProjectConfig): string {
  const migrationRule = config.database === 'none'
    ? []
    : ['**Never modify existing migration files** — always create a new migration.'];
  const rules: string[] = [
    ...getStackRules(config),
    '**Error responses follow a standard format** — consistent error shape across all endpoints.',
    '**All API data formatting and calculations must be pure functions** — never inline complex logic in handlers/components.',
    ...migrationRule,
  ];
  const numbered = rules.map((r, i) => `${i + 1}. ${r}`).join('\n');
  return `## PROJECT RULES\n\n${numbered}`;
}

// ---------------------------------------------------------------------------
// Section: Forbidden Patterns
// ---------------------------------------------------------------------------

const FORBIDDEN_BY_LANG: Record<string, string[]> = {
  typescript: [
    'NEVER use `any` type in TypeScript without a comment explaining why it\'s unavoidable',
    'NEVER skip running tests after a code change',
  ],
  javascript: [
    'NEVER use `var` — always use `const` or `let`',
    'NEVER skip running tests after a code change',
  ],
  python: [
    'NEVER use `type: ignore` without a comment explaining why',
    'NEVER use mutable default arguments in function signatures',
  ],
  go: [
    'NEVER ignore errors with `_` — always handle or explicitly document why',
    'NEVER use `panic` for control flow — return errors instead',
  ],
  ruby: [
    'NEVER use `rescue Exception` — rescue `StandardError` or more specific classes',
    'NEVER skip validations with `save(validate: false)` unless explicitly justified',
  ],
  java: [
    'NEVER catch `Exception` generically — catch specific exception types',
    'NEVER use field injection (`@Autowired` on fields) — use constructor injection',
  ],
};

const FORBIDDEN_UNIVERSAL = [
  'NEVER log sensitive data (passwords, tokens, API keys)',
  'NEVER hardcode secrets — always use environment variables',
];

function sectionForbiddenPatterns(config: ProjectConfig): string {
  const patterns: string[] = [];
  for (const lang of config.languages) {
    const items = FORBIDDEN_BY_LANG[lang];
    if (items) patterns.push(...items);
  }
  patterns.push(...FORBIDDEN_UNIVERSAL);
  const bullets = patterns.map(p => `- ${p}`).join('\n');
  return `## FORBIDDEN PATTERNS\n\n${bullets}`;
}

// ---------------------------------------------------------------------------
// Section: Quality Gates
// ---------------------------------------------------------------------------

function getNodejsQualityChecks(config: ProjectConfig): string[] {
  if (config.isMonorepo) {
    const ts = config.backendLanguage === 'typescript' ? ['`cd backend && npx tsc --noEmit` — zero type errors'] : [];
    const base = ['`cd backend && npm test` — all tests pass', '`cd backend && npm run lint` — zero lint errors'];
    const ui = config.frontend === 'none'
      ? []
      : ['`cd ui && npx tsc --noEmit` — zero type errors', '`cd ui && npm test` — all tests pass', '`cd ui && npm run lint` — zero lint errors', '`cd ui && npm run build` — build succeeds'];
    return [...ts, ...base, ...ui];
  }
  const ts = config.backendLanguage === 'typescript' ? ['`npx tsc --noEmit` — zero type errors'] : [];
  const base = ['`npm test` — all tests pass', '`npm run lint` — zero lint errors'];
  const build = config.frontend === 'none' ? [] : ['`npm run build` — build succeeds'];
  return [...ts, ...base, ...build];
}

function getQualityGatesChecks(config: ProjectConfig): string[] {
  const backend = config.backend;
  if (backend === 'nodejs') return getNodejsQualityChecks(config);
  if (backend === 'python') return ['`pytest` — all tests pass', '`mypy .` — zero type errors', '`ruff check .` — zero lint errors'];
  if (backend === 'go') return ['`go test ./...` — all tests pass', '`go vet ./...` — zero vet warnings', '`golangci-lint run` — zero lint errors'];
  if (backend === 'ruby') return ['`bundle exec rspec` — all tests pass', '`bundle exec rubocop` — zero lint errors'];
  if (backend === 'java') {
    return config.javaBuildTool === 'gradle'
      ? ['`./gradlew build` — compilation succeeds', '`./gradlew test` — all tests pass', '`./gradlew check` — all checks pass']
      : ['`./mvnw compile` — compilation succeeds', '`./mvnw test` — all tests pass', '`./mvnw checkstyle:check` — zero style violations'];
  }
  return [];
}

function sectionQualityGates(config: ProjectConfig): string {
  const checks = getQualityGatesChecks(config);
  if (checks.length === 0) return '';
  const items = checks.map(c => `- [ ] ${c}`).join('\n');
  return `## QUALITY GATES\n\nBefore marking ANY task complete:\n\n${items}`;
}

const FILE_STRUCTURE_TREES: Record<string, string> = {
  'nodejs-monorepo': `/
├── backend/
│   ├── controllers/        # Thin HTTP handlers
│   ├── services/           # ALL business logic
│   ├── models/             # ORM models + associations
│   ├── migrations/         # DB migrations (append-only)
│   ├── middleware/          # Auth, validation, error handling
│   ├── routes/             # Route definitions
│   ├── jobs/               # Scheduled tasks
│   ├── utils/              # Shared helpers
│   └── config/             # Environment config
│
├── ui/
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Route-level pages
│       ├── hooks/          # Custom hooks (data fetching)
│       ├── services/       # API client functions
│       ├── store/          # State management
│       ├── types/          # TypeScript interfaces
│       └── utils/          # Pure helper functions`,
  'nodejs-nestjs': `src/
├── modules/
│   └── <feature>/
│       ├── <feature>.controller.ts
│       ├── <feature>.service.ts
│       ├── <feature>.module.ts
│       ├── dto/
│       └── entities/
├── common/
│   ├── guards/
│   ├── interceptors/
│   ├── filters/
│   └── pipes/
└── config/`,
  'nodejs': `src/
├── controllers/        # Thin HTTP handlers
├── services/           # ALL business logic
├── models/             # ORM models
├── migrations/         # DB migrations (append-only)
├── middleware/          # Auth, validation
├── routes/             # Route definitions
├── utils/              # Shared helpers
└── config/             # Environment config`,
  'python-django': `project/
├── settings.py
├── urls.py
└── wsgi.py

app/
├── models.py           # Fat models with business logic
├── views.py            # Thin views
├── serializers.py      # DRF serializers
├── urls.py             # App-level routes
├── admin.py            # Admin configuration
├── managers.py         # Custom ORM managers
├── signals.py          # Signal handlers
└── tests/
    ├── test_models.py
    └── test_views.py`,
  'python-fastapi': `app/
├── main.py             # FastAPI app + router includes
├── api/
│   └── v1/
│       ├── endpoints/  # Route handlers
│       └── deps.py     # Dependency injection
├── core/
│   ├── config.py       # Settings (pydantic)
│   └── security.py     # Auth utilities
├── models/             # SQLAlchemy / ODM models
├── schemas/            # Pydantic request/response schemas
├── services/           # Business logic
└── tests/`,
  'go': `cmd/
└── server/
    └── main.go         # Entry point

internal/
├── handler/            # HTTP handlers
├── service/            # Business logic
├── repository/         # Data access
├── model/              # Domain types
├── middleware/          # HTTP middleware
└── config/             # Configuration`,
  'ruby-rails': `app/
├── controllers/        # Thin controllers
├── models/             # Fat models
├── services/           # Service objects
├── views/              # Templates
├── serializers/        # JSON serializers
├── jobs/               # Background jobs
└── mailers/            # Email delivery

config/
├── routes.rb
└── database.yml

db/
└── migrate/            # Migrations (append-only)

spec/                   # RSpec tests`,
  'java-spring-boot': `src/main/java/com/example/
├── controller/         # REST controllers
├── service/            # Business logic (@Service)
├── repository/         # Data access (@Repository)
├── model/              # JPA entities
├── dto/                # Request/response DTOs
└── config/             # Spring configuration

src/main/resources/
├── application.yml
└── db/migration/       # Flyway migrations

src/test/java/com/example/
└── ...                 # Mirror of main structure`,
};

function getFileStructureTree(config: ProjectConfig): string {
  const b = config.backend;
  const fw = config.backendFramework;
  if (b === 'nodejs' && config.isMonorepo) return FILE_STRUCTURE_TREES['nodejs-monorepo'] ?? '';
  if (b === 'nodejs' && fw === 'nestjs') return FILE_STRUCTURE_TREES['nodejs-nestjs'] ?? '';
  if (b === 'nodejs') return FILE_STRUCTURE_TREES['nodejs'] ?? '';
  if (b === 'python' && fw === 'django') return FILE_STRUCTURE_TREES['python-django'] ?? '';
  if (b === 'python' && fw === 'fastapi') return FILE_STRUCTURE_TREES['python-fastapi'] ?? '';
  if (b === 'go') return FILE_STRUCTURE_TREES['go'] ?? '';
  if (b === 'ruby' && fw === 'rails') return FILE_STRUCTURE_TREES['ruby-rails'] ?? '';
  if (b === 'java' && fw === 'spring-boot') return FILE_STRUCTURE_TREES['java-spring-boot'] ?? '';
  return '';
}

// ---------------------------------------------------------------------------
// Section: File Structure
// ---------------------------------------------------------------------------

function sectionFileStructure(config: ProjectConfig): string {
  const tree = getFileStructureTree(config);
  if (!tree) return '';
  return `## FILE STRUCTURE\n\n\`\`\`\n${tree}\n\`\`\``;
}

// ---------------------------------------------------------------------------
// Section: API Standards
// ---------------------------------------------------------------------------

function sectionApiStandards(): string {
  return `## API STANDARDS

\`\`\`
GET    /api/resource              # Collection (supports ?filter, ?page, ?limit)
GET    /api/resource/:id          # Single resource
POST   /api/resource              # Create
PUT    /api/resource/:id          # Update
DELETE /api/resource/:id          # Delete
\`\`\``;
}

const COMMANDS_BY_STACK: Record<string, string[]> = {
  'nodejs-monorepo': [
    '# Backend',
    'cd backend',
    'npm run dev              # Start dev server',
    'npm run migrate          # Run migrations',
    'npm run lint             # Lint check',
    'npm test                 # Run tests',
    '',
    '# Frontend',
    'cd ui',
    'npm run dev              # Vite dev server',
    'npm run build            # Production build',
    'npm run lint             # Lint check',
    'npm test                 # Run tests',
  ],
  'nodejs': [
    'npm run dev              # Start dev server',
    'npm run build            # Build',
    'npm run lint             # Lint check',
    'npm test                 # Run tests',
  ],
  'python-django': [
    'python manage.py runserver          # Start dev server',
    'python manage.py migrate            # Run migrations',
    'python manage.py makemigrations     # Create migration',
    'pytest                              # Run tests',
    'mypy .                              # Type check',
    'ruff check .                        # Lint',
  ],
  'python-fastapi': [
    'uvicorn app.main:app --reload       # Start dev server',
    'alembic upgrade head                # Run migrations',
    'alembic revision --autogenerate     # Create migration',
    'pytest                              # Run tests',
    'mypy .                              # Type check',
    'ruff check .                        # Lint',
  ],
  'python': [
    'pytest                              # Run tests',
    'mypy .                              # Type check',
    'ruff check .                        # Lint',
  ],
  'go': [
    'go run cmd/server/main.go           # Start dev server',
    'go test ./...                       # Run tests',
    'go vet ./...                        # Vet check',
    'golangci-lint run                   # Lint',
    'go build ./...                      # Build',
  ],
  'ruby-rails': [
    'bin/rails server                    # Start dev server',
    'bin/rails db:migrate                # Run migrations',
    'bin/rails generate migration NAME   # Create migration',
    'bundle exec rspec                   # Run tests',
    'bundle exec rubocop                 # Lint',
  ],
  'java-gradle': [
    './gradlew bootRun                   # Start dev server',
    './gradlew test                      # Run tests',
    './gradlew build                     # Build',
    './gradlew check                     # All checks',
  ],
  'java-maven': [
    './mvnw spring-boot:run              # Start dev server',
    './mvnw test                         # Run tests',
    './mvnw compile                      # Compile',
    './mvnw checkstyle:check             # Style check',
  ],
};

function getCommonCommandsLines(config: ProjectConfig): string[] {
  const b = config.backend;
  const fw = config.backendFramework;
  if (b === 'nodejs' && config.isMonorepo) return COMMANDS_BY_STACK['nodejs-monorepo'] ?? [];
  if (b === 'nodejs') return COMMANDS_BY_STACK['nodejs'] ?? [];
  if (b === 'python' && fw === 'django') return COMMANDS_BY_STACK['python-django'] ?? [];
  if (b === 'python' && fw === 'fastapi') return COMMANDS_BY_STACK['python-fastapi'] ?? [];
  if (b === 'python') return COMMANDS_BY_STACK['python'] ?? [];
  if (b === 'go') return COMMANDS_BY_STACK['go'] ?? [];
  if (b === 'ruby' && fw === 'rails') return COMMANDS_BY_STACK['ruby-rails'] ?? [];
  if (b === 'java') return (config.javaBuildTool === 'gradle' ? COMMANDS_BY_STACK['java-gradle'] : COMMANDS_BY_STACK['java-maven']) ?? [];
  return [];
}

// ---------------------------------------------------------------------------
// Section: Common Commands
// ---------------------------------------------------------------------------

function sectionCommonCommands(config: ProjectConfig): string {
  const commands = getCommonCommandsLines(config);
  if (commands.length === 0) return '';
  return `## COMMON COMMANDS\n\n\`\`\`bash\n${commands.join('\n')}\n\`\`\``;
}

const NAMING_ROWS_BY_LANG: Record<string, string[]> = {
  typescript: [
    '| Files | kebab-case | `user-service.ts` |',
    '| React Components | PascalCase | `UserProfile.tsx` |',
    '| Functions/Variables | camelCase | `calculateGrowth()` |',
    '| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |',
  ],
  javascript: [
    '| Files | kebab-case | `user-service.ts` |',
    '| React Components | PascalCase | `UserProfile.tsx` |',
    '| Functions/Variables | camelCase | `calculateGrowth()` |',
    '| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |',
  ],
  python: [
    '| Files/Modules | snake_case | `user_service.py` |',
    '| Classes | PascalCase | `UserProfile` |',
    '| Functions/Variables | snake_case | `calculate_growth()` |',
    '| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |',
  ],
  go: [
    '| Files | snake_case | `user_service.go` |',
    '| Exported | PascalCase | `CalculateGrowth()` |',
    '| Unexported | camelCase | `internalHelper()` |',
    '| Constants | PascalCase or UPPER_SNAKE_CASE | `MaxRetryCount` |',
  ],
  ruby: [
    '| Files | snake_case | `user_service.rb` |',
    '| Classes/Modules | PascalCase | `UserProfile` |',
    '| Methods/Variables | snake_case | `calculate_growth` |',
    '| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |',
  ],
  java: [
    '| Files | PascalCase | `UserService.java` |',
    '| Classes | PascalCase | `UserProfile` |',
    '| Methods/Variables | camelCase | `calculateGrowth()` |',
    '| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |',
  ],
};

function getNamingRows(config: ProjectConfig): string[] {
  const header = ['| Context | Convention | Example |', '|---|---|---|'];
  const lang = config.languages.find(l => NAMING_ROWS_BY_LANG[l]);
  const langRows = lang ? NAMING_ROWS_BY_LANG[lang] : [];
  const dbRow = config.database === 'none' ? [] : ['| Database columns | snake_case | `created_at` |'];
  const cssRow = config.frontend === 'none' ? [] : ['| CSS classes | Tailwind utilities | `className="flex items-center"` |'];
  return [...header, ...langRows, ...dbRow, ...cssRow];
}

// ---------------------------------------------------------------------------
// Section: Naming Conventions
// ---------------------------------------------------------------------------

function sectionNamingConventions(config: ProjectConfig): string {
  const rows = getNamingRows(config);
  return `## NAMING CONVENTIONS\n\n${rows.join('\n')}`;
}

// ---------------------------------------------------------------------------
// Section: Environment Variables
// ---------------------------------------------------------------------------

const DB_ENV_VARS: Record<string, string[]> = {
  postgresql: ['DATABASE_URL=postgres://user:pass@localhost:5432/dbname'],
  mysql: ['DATABASE_URL=mysql://user:pass@localhost:3306/dbname'],
  mongodb: ['MONGODB_URI=mongodb://localhost:27017/dbname'],
  sqlite: ['DATABASE_PATH=./data/app.sqlite'],
};

function getBackendEnvVars(config: ProjectConfig): string[] {
  const b = config.backend;
  if (b === 'nodejs') return ['JWT_SECRET=your-secret-key', 'PORT=3000', 'NODE_ENV=development'];
  if (b === 'python') {
    const base = ['PYTHONPATH=.', 'SECRET_KEY=your-secret-key'];
    return config.backendFramework === 'django' ? [...base, 'DJANGO_SETTINGS_MODULE=config.settings'] : base;
  }
  if (b === 'go') return ['PORT=8080'];
  if (b === 'ruby') return ['RAILS_ENV=development', 'SECRET_KEY_BASE=your-secret-key'];
  if (b === 'java') return ['SPRING_PROFILES_ACTIVE=dev', 'SERVER_PORT=8080'];
  return [];
}

function getEnvVarsLines(config: ProjectConfig): string[] {
  const dbVars = (config.database === 'none' || !DB_ENV_VARS[config.database]) ? [] : DB_ENV_VARS[config.database];
  const backendVars = getBackendEnvVars(config);
  const frontVars = config.frontend === 'none' ? [] : ['', '# Frontend', 'VITE_API_URL=http://localhost:3000'];
  return [...dbVars, ...backendVars, ...frontVars];
}

function sectionEnvironmentVariables(config: ProjectConfig): string {
  const vars = getEnvVarsLines(config);
  if (vars.length > 0) {
    return `## ENVIRONMENT VARIABLES\n\n\`\`\`bash\n${vars.join('\n')}\n\`\`\``;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Section: MCP Context Usage
// ---------------------------------------------------------------------------

function sectionMcpUsage(): string {
  return `## MCP CONTEXT USAGE

When working with any function or class:

1. FIRST call get_symbol_context(symbolName) to see what you already know
2. After making observations, call add_observation(symbolName, "your insight")
3. Start sessions with get_project_summary() for orientation`;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export async function generateClaudeMd(config: ProjectConfig): Promise<void> {
  const sections = [
    sectionIdentity(config),
    sectionRoutingTable(),
    sectionDecisionRules(),
    sectionProjectRules(config),
    sectionForbiddenPatterns(config),
    sectionQualityGates(config),
    sectionFileStructure(config),
    sectionApiStandards(),
    sectionCommonCommands(config),
    sectionNamingConventions(config),
    sectionEnvironmentVariables(config),
  ];

  if (config.includeMcp) {
    sections.push(sectionMcpUsage());
  }

  const output = sections.filter(s => s.trim()).join('\n\n') + '\n';
  await writeFile(path.join(process.cwd(), 'CLAUDE.md'), output);
}
