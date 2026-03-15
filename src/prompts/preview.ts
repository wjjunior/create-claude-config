import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import type { ProjectConfig } from '../types.js';

function formatStack(config: ProjectConfig): string {
  const parts: string[] = [];

  if (config.backend !== 'none') {
    let be = config.backend === 'nodejs' ? 'Node.js' : config.backend.charAt(0).toUpperCase() + config.backend.slice(1);
    if (config.backendLanguage) be += ` (${config.backendLanguage})`;
    if (config.backendFramework) be += ` + ${config.backendFramework}`;
    parts.push(`Backend: ${be}`);
  }

  if (config.frontend !== 'none') {
    let fe = config.frontend.charAt(0).toUpperCase() + config.frontend.slice(1);
    if (config.frontendMeta) fe += ` + ${config.frontendMeta}`;
    parts.push(`Frontend: ${fe}`);
  }

  if (config.database !== 'none') {
    let db = config.database.charAt(0).toUpperCase() + config.database.slice(1);
    if (config.orm) db += ` + ${config.orm}`;
    parts.push(`Database: ${db}`);
  }

  parts.push(`Tests: ${config.testFramework}`);

  return parts.join('\n   ');
}

function countFiles(config: ProjectConfig): string {
  const hookCount = [config.hooks.startup, config.hooks.sessionEnd, config.hooks.promiseChecker].filter(Boolean).length;
  const lines: string[] = [
    '.claude/settings.json',
    ...(hookCount > 0 ? [`.claude/hooks/ (${hookCount} files)`] : []),
    '.claude/skills/ (4 files)',
    ...(config.includeMcp ? ['.claude/mcp-servers/context-server/ (5 files)'] : []),
    'CLAUDE.md',
    '.gitignore (append)',
  ];
  return lines.map((l, i) => `${i < lines.length - 1 ? '├──' : '└──'} ${l}`).join('\n   ');
}

export async function showPreview(config: ProjectConfig): Promise<boolean> {
  console.log(chalk.bold('\n📋 Configuration Summary:'));
  console.log(`   Project: ${chalk.cyan(config.projectName)}`);
  console.log(`   ${formatStack(config)}`);
  console.log(`   MCP Server: ${config.includeMcp ? chalk.green('Yes') : 'No'}`);

  const activeHooks = [
    config.hooks.startup && 'startup',
    config.hooks.sessionEnd && 'session-end',
    config.hooks.promiseChecker && 'check-promises',
  ].filter(Boolean);
  if (activeHooks.length > 0) {
    console.log(`   Hooks: ${activeHooks.join(', ')}`);
  }

  console.log(`\n   Files to generate:`);
  console.log(`   ${countFiles(config)}`);

  return confirm({ message: 'Proceed?', default: true });
}
