import { select, confirm, checkbox, input } from '@inquirer/prompts';

export async function promptOrm(backend: string, database: string) {
  if (database === 'none') return { orm: undefined };

  const isSql = ['postgresql', 'mysql', 'sqlite'].includes(database);

  if (backend === 'nodejs' && isSql) {
    const orm = await select({
      message: 'ORM:',
      choices: [
        { name: 'Sequelize', value: 'sequelize' },
        { name: 'Prisma', value: 'prisma' },
        { name: 'TypeORM', value: 'typeorm' },
        { name: 'Drizzle', value: 'drizzle' },
        { name: 'None', value: 'none' },
      ],
    });
    return { orm: orm === 'none' ? undefined : orm };
  }

  if (backend === 'nodejs' && database === 'mongodb') {
    const orm = await select({
      message: 'ODM:',
      choices: [
        { name: 'Mongoose', value: 'mongoose' },
        { name: 'None', value: 'none' },
      ],
    });
    return { orm: orm === 'none' ? undefined : orm };
  }

  if (backend === 'java' && isSql) {
    const orm = await select({
      message: 'ORM:',
      choices: [
        { name: 'Hibernate/JPA', value: 'hibernate' },
        { name: 'jOOQ', value: 'jooq' },
        { name: 'None', value: 'none' },
      ],
    });
    return { orm: orm === 'none' ? undefined : orm };
  }

  return { orm: undefined };
}

function suggestTestFramework(backend: string, frontend: string): string {
  const backendSuggestions: Record<string, string> = {
    nodejs: 'Jest',
    python: 'pytest',
    go: 'go test',
    ruby: 'RSpec',
    java: 'JUnit 5',
  };

  const frontendSuggestions: Record<string, string> = {
    react: 'Vitest',
    vue: 'Vitest',
    angular: 'Jest',
    svelte: 'Vitest',
  };

  const parts: string[] = [];
  if (backend !== 'none' && backendSuggestions[backend]) {
    parts.push(`${backendSuggestions[backend]} (backend)`);
  }
  if (frontend !== 'none' && frontendSuggestions[frontend]) {
    parts.push(`${frontendSuggestions[frontend]} (frontend)`);
  }

  return parts.join(', ') || 'Jest';
}

export async function promptTestFramework(backend: string, frontend: string) {
  const suggestion = suggestTestFramework(backend, frontend);

  const useDefault = await confirm({
    message: `Test framework: ${suggestion} — use this?`,
    default: true,
  });

  if (useDefault) return { testFramework: suggestion };

  const testFramework = await input({
    message: 'Test framework:',
    default: suggestion,
  });

  return { testFramework };
}

export async function promptMcp() {
  const includeMcp = await confirm({
    message: 'Include MCP context server? (symbol indexing for codebase navigation)',
    default: true,
  });

  return { includeMcp };
}

export async function promptHooks() {
  const hookChoices = await checkbox({
    message: 'Which hooks to enable? (startup.sh always included)',
    choices: [
      { name: 'Session journal (auto-create daily journal)', value: 'sessionEnd', checked: true },
      { name: 'Promise checker (enforce memory discipline)', value: 'promiseChecker', checked: true },
    ],
  });

  const anyHookSelected = hookChoices.length > 0;

  return {
    hooks: {
      startup: anyHookSelected,
      sessionEnd: hookChoices.includes('sessionEnd'),
      promiseChecker: hookChoices.includes('promiseChecker'),
    },
  };
}
