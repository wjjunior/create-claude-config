import path from 'node:path';
import type { ProjectConfig } from '../types.js';
import { writeFile } from '../utils/fs.js';

interface SettingsJson {
  permissions: {
    allow: string[];
    deny: string[];
  };
  hooks?: Record<string, Array<{ hooks: Array<{ type: string; command: string }>; matcher?: string }>>;
  mcpServers?: Record<string, { command: string; args: string[] }>;
}

const ALWAYS_PERMISSIONS = [
  'Bash(git log:*)',
  'Bash(git diff:*)',
  'Bash(git status:*)',
  'Bash(git stash:*)',
  'Bash(ls:*)',
  'Bash(cat:*)',
  'Bash(grep:*)',
  'Bash(echo:*)',
  'Bash(find:*)',
];

const STACK_PERMISSIONS: Record<string, string[]> = {
  nodejs: [
    'Bash(npm:*)',
    'Bash(npx:*)',
    'Bash(node:*)',
  ],
  python: [
    'Bash(python:*)',
    'Bash(pip:*)',
    'Bash(pytest:*)',
    'Bash(mypy:*)',
    'Bash(ruff:*)',
  ],
  go: [
    'Bash(go:*)',
    'Bash(make:*)',
  ],
  ruby: [
    'Bash(ruby:*)',
    'Bash(bundle:*)',
    'Bash(rails:*)',
    'Bash(rake:*)',
  ],
  'java-maven': [
    'Bash(./mvnw:*)',
    'Bash(mvn:*)',
    'Bash(java:*)',
  ],
  'java-gradle': [
    'Bash(./gradlew:*)',
    'Bash(gradle:*)',
    'Bash(java:*)',
  ],
};

const DB_PERMISSIONS: Record<string, string[]> = {
  postgresql: ['Bash(psql:*)'],
  mysql: ['Bash(mysql:*)'],
  mongodb: ['Bash(mongosh:*)'],
};

function buildPermissions(config: ProjectConfig): string[] {
  const perms = [...ALWAYS_PERMISSIONS];

  // Backend stack
  if (config.backend === 'java') {
    const tool = config.javaBuildTool ?? 'maven';
    const key = `java-${tool}`;
    perms.push(...(STACK_PERMISSIONS[key] ?? []));
  } else if (config.backend !== 'none') {
    perms.push(...(STACK_PERMISSIONS[config.backend] ?? []));
  }

  // Frontend always needs node tooling
  if (config.frontend !== 'none' && config.backend !== 'nodejs') {
    perms.push(...STACK_PERMISSIONS.nodejs);
  }

  // Database
  if (config.database !== 'none' && config.database !== 'sqlite') {
    perms.push(...(DB_PERMISSIONS[config.database] ?? []));
  }

  // Deduplicate
  return [...new Set(perms)];
}

function buildHooks(config: ProjectConfig): SettingsJson['hooks'] | undefined {
  const { hooks } = config;
  if (!hooks.startup && !hooks.sessionEnd && !hooks.promiseChecker) {
    return undefined;
  }

  const result: NonNullable<SettingsJson['hooks']> = {};

  if (hooks.startup) {
    result.SessionStart = [
      { hooks: [{ type: 'command', command: 'bash .claude/hooks/startup.sh' }] },
    ];
  }

  if (hooks.sessionEnd) {
    result.SessionEnd = [
      { hooks: [{ type: 'command', command: 'bash .claude/hooks/session-end.sh' }] },
    ];
  }

  if (hooks.promiseChecker) {
    result.Stop = [
      {
        matcher: '',
        hooks: [{ type: 'command', command: 'bash .claude/hooks/check-promises.sh ${CLAUDE_TRANSCRIPT}' }],
      },
    ];
  }

  return result;
}

function buildMcpServers(config: ProjectConfig): SettingsJson['mcpServers'] | undefined {
  if (!config.includeMcp) return undefined;

  return {
    context: {
      command: 'bash',
      args: [
        '-c',
        'cd .claude/mcp-servers/context-server && npm install --silent 2>/dev/null && npm run build --silent 2>/dev/null && node dist/index.js',
      ],
    },
  };
}

export async function generateSettings(config: ProjectConfig): Promise<void> {
  const settings: SettingsJson = {
    permissions: {
      allow: buildPermissions(config),
      deny: [],
    },
  };

  const hooks = buildHooks(config);
  if (hooks) {
    settings.hooks = hooks;
  }

  const mcpServers = buildMcpServers(config);
  if (mcpServers) {
    settings.mcpServers = mcpServers;
  }

  const filePath = path.join(process.cwd(), '.claude', 'settings.json');
  await writeFile(filePath, JSON.stringify(settings, null, 2) + '\n');
}
