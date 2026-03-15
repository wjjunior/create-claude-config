import path from 'node:path';
import type { ProjectConfig } from '../types.js';
import { writeFile } from '../utils/fs.js';

// ---------------------------------------------------------------------------
// Section: Identity
// ---------------------------------------------------------------------------

function sectionIdentity(config: ProjectConfig): string {
  const stackParts: string[] = [];

  if (config.backend !== 'none') {
    const lang = config.backendLanguage === 'typescript' ? 'TypeScript' : config.backendLanguage === 'javascript' ? 'JavaScript' : '';
    const framework = config.backendFramework ? ` + ${config.backendFramework}` : '';
    const backendLabel = config.backend === 'nodejs' ? 'Node.js' : config.backend === 'python' ? 'Python' : config.backend === 'go' ? 'Go' : config.backend === 'ruby' ? 'Ruby' : config.backend === 'java' ? 'Java' : config.backend;
    stackParts.push(`**Backend**: ${backendLabel}${framework}${lang ? ` (${lang})` : ''}`);
  }

  if (config.frontend !== 'none') {
    const frontendLabel = config.frontend === 'react' ? 'React' : config.frontend === 'vue' ? 'Vue' : config.frontend === 'angular' ? 'Angular' : config.frontend === 'svelte' ? 'Svelte' : config.frontend;
    const meta = config.frontendMeta ? ` (${config.frontendMeta})` : '';
    stackParts.push(`**Frontend**: ${frontendLabel}${meta}`);
  }

  if (config.database !== 'none') {
    const dbLabel = config.database === 'postgresql' ? 'PostgreSQL' : config.database === 'mysql' ? 'MySQL' : config.database === 'mongodb' ? 'MongoDB' : config.database === 'sqlite' ? 'SQLite' : config.database;
    const ormLabel = config.orm ? ` + ${config.orm}` : '';
    stackParts.push(`**Database**: ${dbLabel}${ormLabel}`);
  }

  stackParts.push(`**Tests**: ${config.testFramework}`);

  const lines = [
    `# ${config.projectName} — Claude Code Configuration`,
    '',
    '## IDENTITY',
    '',
    `You are a **full-stack developer** working on **${config.projectName}**${config.description ? `, ${config.description}` : ''}.`,
    '',
    ...stackParts.map(s => `- ${s}`),
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

function sectionProjectRules(config: ProjectConfig): string {
  const rules: string[] = [];

  if (config.backend === 'nodejs' && config.backendFramework === 'express') {
    rules.push('**Service layer is mandatory** — ALL business logic lives in services/. Controllers handle HTTP only (parse request → call service → send response).');
    rules.push('**Use database transactions** for any operation touching multiple tables.');
    if (config.frontend !== 'none') {
      rules.push('**React Query for ALL server state** — Redux is ONLY for auth state and cross-component UI state. Never store API data in Redux.');
      rules.push('**Custom hooks for data fetching** — every `useQuery`/`useMutation` must be wrapped in a custom hook, never called inline in components.');
    }
  } else if (config.backend === 'nodejs' && config.backendFramework === 'nestjs') {
    rules.push('**Use dependency injection** — let NestJS manage service lifetimes. Never manually instantiate services.');
    rules.push('**Thin controllers** — controllers handle HTTP concerns only. All business logic belongs in services.');
    rules.push('**Services for business logic** — encapsulate domain logic in injectable service classes.');
  } else if (config.backend === 'python' && config.backendFramework === 'django') {
    rules.push('**Fat models, thin views** — business logic belongs in models and managers, not in views.');
    rules.push('**Use Django ORM managers** — encapsulate common queries in custom managers.');
    rules.push('**Signals for side effects** — use Django signals for cross-cutting concerns, not inline logic in views.');
  } else if (config.backend === 'python' && config.backendFramework === 'fastapi') {
    rules.push('**Pydantic models for validation** — all request/response schemas use Pydantic models.');
    rules.push('**Dependency injection** — use FastAPI `Depends()` for shared logic (auth, DB sessions, etc.).');
    rules.push('**Async by default** — use `async def` for route handlers and service methods.');
  } else if (config.backend === 'go') {
    rules.push('**Accept interfaces, return structs** — depend on behavior, not concrete types.');
    rules.push('**Error wrapping with %w** — always wrap errors with `fmt.Errorf("context: %w", err)` for stack traces.');
    rules.push('**Context propagation** — pass `context.Context` as the first parameter to all functions that do I/O.');
  } else if (config.backend === 'ruby' && config.backendFramework === 'rails') {
    rules.push('**Convention over configuration** — follow Rails conventions for naming, file placement, and routing.');
    rules.push('**Concerns for shared behavior** — extract shared model/controller logic into concerns.');
    rules.push('**Service objects for complex logic** — operations involving multiple models belong in app/services/.');
  } else if (config.backend === 'java' && config.backendFramework === 'spring-boot') {
    rules.push('**Constructor injection** — always use constructor injection, never field injection with `@Autowired`.');
    rules.push('**@Transactional on service layer** — annotate service methods, not controllers or repositories.');
    rules.push('**DTOs for API boundaries** — never expose JPA entities directly in API responses.');
  }

  // Universal rules
  rules.push('**Error responses follow a standard format** — consistent error shape across all endpoints.');
  rules.push('**All API data formatting and calculations must be pure functions** — never inline complex logic in handlers/components.');

  if (config.database !== 'none') {
    rules.push('**Never modify existing migration files** — always create a new migration.');
  }

  const numbered = rules.map((r, i) => `${i + 1}. ${r}`).join('\n');
  return `## PROJECT RULES\n\n${numbered}`;
}

// ---------------------------------------------------------------------------
// Section: Forbidden Patterns
// ---------------------------------------------------------------------------

function sectionForbiddenPatterns(config: ProjectConfig): string {
  const patterns: string[] = [];

  // Language-specific
  if (config.languages.includes('typescript')) {
    patterns.push('NEVER use `any` type in TypeScript without a comment explaining why it\'s unavoidable');
    patterns.push('NEVER skip running tests after a code change');
  } else if (config.languages.includes('javascript')) {
    patterns.push('NEVER use `var` — always use `const` or `let`');
    patterns.push('NEVER skip running tests after a code change');
  }

  if (config.languages.includes('python')) {
    patterns.push('NEVER use `type: ignore` without a comment explaining why');
    patterns.push('NEVER use mutable default arguments in function signatures');
  }

  if (config.languages.includes('go')) {
    patterns.push('NEVER ignore errors with `_` — always handle or explicitly document why');
    patterns.push('NEVER use `panic` for control flow — return errors instead');
  }

  if (config.languages.includes('ruby')) {
    patterns.push('NEVER use `rescue Exception` — rescue `StandardError` or more specific classes');
    patterns.push('NEVER skip validations with `save(validate: false)` unless explicitly justified');
  }

  if (config.languages.includes('java')) {
    patterns.push('NEVER catch `Exception` generically — catch specific exception types');
    patterns.push('NEVER use field injection (`@Autowired` on fields) — use constructor injection');
  }

  // Universal
  patterns.push('NEVER log sensitive data (passwords, tokens, API keys)');
  patterns.push('NEVER hardcode secrets — always use environment variables');

  const bullets = patterns.map(p => `- ${p}`).join('\n');
  return `## FORBIDDEN PATTERNS\n\n${bullets}`;
}

// ---------------------------------------------------------------------------
// Section: Quality Gates
// ---------------------------------------------------------------------------

function sectionQualityGates(config: ProjectConfig): string {
  const checks: string[] = [];

  if (config.backend === 'nodejs' && config.isMonorepo) {
    if (config.backendLanguage === 'typescript') {
      checks.push('`cd backend && npx tsc --noEmit` — zero type errors');
    }
    checks.push('`cd backend && npm test` — all tests pass');
    checks.push('`cd backend && npm run lint` — zero lint errors');
    if (config.frontend !== 'none') {
      checks.push('`cd ui && npx tsc --noEmit` — zero type errors');
      checks.push('`cd ui && npm test` — all tests pass');
      checks.push('`cd ui && npm run lint` — zero lint errors');
      checks.push('`cd ui && npm run build` — build succeeds');
    }
  } else if (config.backend === 'nodejs') {
    if (config.backendLanguage === 'typescript') {
      checks.push('`npx tsc --noEmit` — zero type errors');
    }
    checks.push('`npm test` — all tests pass');
    checks.push('`npm run lint` — zero lint errors');
    if (config.frontend !== 'none') {
      checks.push('`npm run build` — build succeeds');
    }
  } else if (config.backend === 'python') {
    checks.push('`pytest` — all tests pass');
    checks.push('`mypy .` — zero type errors');
    checks.push('`ruff check .` — zero lint errors');
  } else if (config.backend === 'go') {
    checks.push('`go test ./...` — all tests pass');
    checks.push('`go vet ./...` — zero vet warnings');
    checks.push('`golangci-lint run` — zero lint errors');
  } else if (config.backend === 'ruby') {
    checks.push('`bundle exec rspec` — all tests pass');
    checks.push('`bundle exec rubocop` — zero lint errors');
  } else if (config.backend === 'java') {
    if (config.javaBuildTool === 'gradle') {
      checks.push('`./gradlew build` — compilation succeeds');
      checks.push('`./gradlew test` — all tests pass');
      checks.push('`./gradlew check` — all checks pass');
    } else {
      checks.push('`./mvnw compile` — compilation succeeds');
      checks.push('`./mvnw test` — all tests pass');
      checks.push('`./mvnw checkstyle:check` — zero style violations');
    }
  }

  if (checks.length === 0) return '';

  const items = checks.map(c => `- [ ] ${c}`).join('\n');
  return `## QUALITY GATES\n\nBefore marking ANY task complete:\n\n${items}`;
}

// ---------------------------------------------------------------------------
// Section: File Structure
// ---------------------------------------------------------------------------

function sectionFileStructure(config: ProjectConfig): string {
  let tree = '';

  if (config.backend === 'nodejs' && config.isMonorepo) {
    tree = `/
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
│       └── utils/          # Pure helper functions`;
  } else if (config.backend === 'nodejs' && config.backendFramework === 'nestjs') {
    tree = `src/
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
└── config/`;
  } else if (config.backend === 'nodejs') {
    tree = `src/
├── controllers/        # Thin HTTP handlers
├── services/           # ALL business logic
├── models/             # ORM models
├── migrations/         # DB migrations (append-only)
├── middleware/          # Auth, validation
├── routes/             # Route definitions
├── utils/              # Shared helpers
└── config/             # Environment config`;
  } else if (config.backend === 'python' && config.backendFramework === 'django') {
    tree = `project/
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
    └── test_views.py`;
  } else if (config.backend === 'python' && config.backendFramework === 'fastapi') {
    tree = `app/
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
└── tests/`;
  } else if (config.backend === 'go') {
    tree = `cmd/
└── server/
    └── main.go         # Entry point

internal/
├── handler/            # HTTP handlers
├── service/            # Business logic
├── repository/         # Data access
├── model/              # Domain types
├── middleware/          # HTTP middleware
└── config/             # Configuration`;
  } else if (config.backend === 'ruby' && config.backendFramework === 'rails') {
    tree = `app/
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

spec/                   # RSpec tests`;
  } else if (config.backend === 'java' && config.backendFramework === 'spring-boot') {
    tree = `src/main/java/com/example/
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
└── ...                 # Mirror of main structure`;
  }

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

// ---------------------------------------------------------------------------
// Section: Common Commands
// ---------------------------------------------------------------------------

function sectionCommonCommands(config: ProjectConfig): string {
  const commands: string[] = [];

  if (config.backend === 'nodejs' && config.isMonorepo) {
    commands.push(
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
    );
  } else if (config.backend === 'nodejs') {
    commands.push(
      'npm run dev              # Start dev server',
      'npm run build            # Build',
      'npm run lint             # Lint check',
      'npm test                 # Run tests',
    );
  } else if (config.backend === 'python' && config.backendFramework === 'django') {
    commands.push(
      'python manage.py runserver          # Start dev server',
      'python manage.py migrate            # Run migrations',
      'python manage.py makemigrations     # Create migration',
      'pytest                              # Run tests',
      'mypy .                              # Type check',
      'ruff check .                        # Lint',
    );
  } else if (config.backend === 'python' && config.backendFramework === 'fastapi') {
    commands.push(
      'uvicorn app.main:app --reload       # Start dev server',
      'alembic upgrade head                # Run migrations',
      'alembic revision --autogenerate     # Create migration',
      'pytest                              # Run tests',
      'mypy .                              # Type check',
      'ruff check .                        # Lint',
    );
  } else if (config.backend === 'python') {
    commands.push(
      'pytest                              # Run tests',
      'mypy .                              # Type check',
      'ruff check .                        # Lint',
    );
  } else if (config.backend === 'go') {
    commands.push(
      'go run cmd/server/main.go           # Start dev server',
      'go test ./...                       # Run tests',
      'go vet ./...                        # Vet check',
      'golangci-lint run                   # Lint',
      'go build ./...                      # Build',
    );
  } else if (config.backend === 'ruby' && config.backendFramework === 'rails') {
    commands.push(
      'bin/rails server                    # Start dev server',
      'bin/rails db:migrate                # Run migrations',
      'bin/rails generate migration NAME   # Create migration',
      'bundle exec rspec                   # Run tests',
      'bundle exec rubocop                 # Lint',
    );
  } else if (config.backend === 'java') {
    if (config.javaBuildTool === 'gradle') {
      commands.push(
        './gradlew bootRun                   # Start dev server',
        './gradlew test                      # Run tests',
        './gradlew build                     # Build',
        './gradlew check                     # All checks',
      );
    } else {
      commands.push(
        './mvnw spring-boot:run              # Start dev server',
        './mvnw test                         # Run tests',
        './mvnw compile                      # Compile',
        './mvnw checkstyle:check             # Style check',
      );
    }
  }

  if (commands.length === 0) return '';

  return `## COMMON COMMANDS\n\n\`\`\`bash\n${commands.join('\n')}\n\`\`\``;
}

// ---------------------------------------------------------------------------
// Section: Naming Conventions
// ---------------------------------------------------------------------------

function sectionNamingConventions(config: ProjectConfig): string {
  const rows: string[] = [
    '| Context | Convention | Example |',
    '|---|---|---|',
  ];

  if (config.languages.includes('typescript') || config.languages.includes('javascript')) {
    rows.push('| Files | kebab-case | `user-service.ts` |');
    rows.push('| React Components | PascalCase | `UserProfile.tsx` |');
    rows.push('| Functions/Variables | camelCase | `calculateGrowth()` |');
    rows.push('| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |');
  } else if (config.languages.includes('python')) {
    rows.push('| Files/Modules | snake_case | `user_service.py` |');
    rows.push('| Classes | PascalCase | `UserProfile` |');
    rows.push('| Functions/Variables | snake_case | `calculate_growth()` |');
    rows.push('| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |');
  } else if (config.languages.includes('go')) {
    rows.push('| Files | snake_case | `user_service.go` |');
    rows.push('| Exported | PascalCase | `CalculateGrowth()` |');
    rows.push('| Unexported | camelCase | `internalHelper()` |');
    rows.push('| Constants | PascalCase or UPPER_SNAKE_CASE | `MaxRetryCount` |');
  } else if (config.languages.includes('ruby')) {
    rows.push('| Files | snake_case | `user_service.rb` |');
    rows.push('| Classes/Modules | PascalCase | `UserProfile` |');
    rows.push('| Methods/Variables | snake_case | `calculate_growth` |');
    rows.push('| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |');
  } else if (config.languages.includes('java')) {
    rows.push('| Files | PascalCase | `UserService.java` |');
    rows.push('| Classes | PascalCase | `UserProfile` |');
    rows.push('| Methods/Variables | camelCase | `calculateGrowth()` |');
    rows.push('| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |');
  }

  if (config.database !== 'none') {
    rows.push('| Database columns | snake_case | `created_at` |');
  }

  if (config.frontend !== 'none') {
    rows.push('| CSS classes | Tailwind utilities | `className="flex items-center"` |');
  }

  return `## NAMING CONVENTIONS\n\n${rows.join('\n')}`;
}

// ---------------------------------------------------------------------------
// Section: Environment Variables
// ---------------------------------------------------------------------------

function sectionEnvironmentVariables(config: ProjectConfig): string {
  const vars: string[] = [];

  if (config.database === 'postgresql') {
    vars.push('DATABASE_URL=postgres://user:pass@localhost:5432/dbname');
  } else if (config.database === 'mysql') {
    vars.push('DATABASE_URL=mysql://user:pass@localhost:3306/dbname');
  } else if (config.database === 'mongodb') {
    vars.push('MONGODB_URI=mongodb://localhost:27017/dbname');
  } else if (config.database === 'sqlite') {
    vars.push('DATABASE_PATH=./data/app.sqlite');
  }

  if (config.backend === 'nodejs') {
    vars.push('JWT_SECRET=your-secret-key');
    vars.push('PORT=3000');
    vars.push('NODE_ENV=development');
  } else if (config.backend === 'python') {
    vars.push('PYTHONPATH=.');
    vars.push('SECRET_KEY=your-secret-key');
    if (config.backendFramework === 'django') {
      vars.push('DJANGO_SETTINGS_MODULE=config.settings');
    }
  } else if (config.backend === 'go') {
    vars.push('PORT=8080');
  } else if (config.backend === 'ruby') {
    vars.push('RAILS_ENV=development');
    vars.push('SECRET_KEY_BASE=your-secret-key');
  } else if (config.backend === 'java') {
    vars.push('SPRING_PROFILES_ACTIVE=dev');
    vars.push('SERVER_PORT=8080');
  }

  if (config.frontend !== 'none') {
    vars.push('');
    vars.push('# Frontend');
    vars.push('VITE_API_URL=http://localhost:3000');
  }

  if (vars.length === 0) return '';

  return `## ENVIRONMENT VARIABLES\n\n\`\`\`bash\n${vars.join('\n')}\n\`\`\``;
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
