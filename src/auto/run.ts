import { spawn } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import { buildPrompt } from './prompt.js';
import { checkExistingConfig } from '../utils/fs.js';
import { generateUniversalFiles } from './universal.js';
import { generateMcpServer } from '../generators/mcp-server.js';
import { readManifest, writeManifest, isNewerVersion, getPackageVersion } from './manifest.js';
import type { ProjectConfig } from '../types.js';

const TIMEOUT_MS = 5 * 60 * 1000;
const SIGKILL_GRACE_MS = 5000;

export class CancelledError extends Error {
  constructor() { super('Cancelled'); }
}

function buildMcpConfig(): ProjectConfig {
  return {
    projectName: '',
    description: '',
    backend: 'nodejs',
    frontend: 'none',
    database: 'none',
    testFramework: '',
    includeMcp: true,
    hooks: { startup: true, sessionEnd: true, promiseChecker: true },
    isMonorepo: false,
    languages: ['typescript', 'javascript', 'python', 'go', 'ruby', 'java'],
    sourceDirs: ['.'],
  };
}

export async function runAutoConfig(): Promise<void> {
  const manifest = readManifest();

  // Re-run: manifest exists
  if (manifest) {
    return handleRerun(manifest);
  }

  // First run
  return handleFirstRun();
}

async function handleFirstRun(): Promise<void> {
  const proceed = await checkExistingConfig();
  if (!proceed) throw new CancelledError();

  const includeMcp = await confirm({
    message: 'Include MCP context server? (symbol indexing for codebase navigation)',
    default: true,
  });

  console.log(chalk.dim('\n  Setting up universal files...'));
  await generateUniversalFiles();

  if (includeMcp) {
    console.log(chalk.dim('  Setting up MCP context server...'));
    await generateMcpServer(buildMcpConfig());
  }

  const prompt = buildPrompt(includeMcp);
  console.log(chalk.cyan('\n  Analyzing project with Claude Code...\n'));
  await spawnClaude(prompt);

  writeManifest(includeMcp);
  listGeneratedFiles();
}

async function handleRerun(manifest: { version: string; mcpEnabled: boolean }): Promise<void> {
  const currentVersion = getPackageVersion();
  const needsUpdate = isNewerVersion(manifest.version);

  if (needsUpdate) {
    console.log(chalk.cyan(`  Updating from v${manifest.version} to v${currentVersion}\n`));
  } else {
    console.log(chalk.dim(`  Config is up to date (v${manifest.version}).`));
    const reanalyze = await confirm({
      message: 'Re-analyze project and regenerate project-specific files?',
      default: false,
    });
    if (!reanalyze) {
      console.log(chalk.dim('  Nothing to do.'));
      return;
    }
  }

  // Always update universal files on re-run (handles version upgrades)
  console.log(chalk.dim('  Updating universal files...'));
  await generateUniversalFiles();

  // MCP: keep existing state or ask if not present
  let includeMcp = manifest.mcpEnabled;
  const mcpExists = existsSync(join(process.cwd(), '.claude', 'mcp-servers', 'context-server'));

  if (!mcpExists && !includeMcp) {
    includeMcp = await confirm({
      message: 'Include MCP context server? (symbol indexing for codebase navigation)',
      default: true,
    });
  }

  if (includeMcp && !mcpExists) {
    console.log(chalk.dim('  Setting up MCP context server...'));
    await generateMcpServer(buildMcpConfig());
  }

  // Regenerate project-specific files
  const prompt = buildPrompt(includeMcp);
  console.log(chalk.cyan('\n  Re-analyzing project with Claude Code...\n'));
  await spawnClaude(prompt);

  writeManifest(includeMcp);
  listGeneratedFiles();
}

function spawnClaude(prompt: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', [
      '-p', '-',
      '--allowedTools', 'Read,Write,Bash(ls:*),Bash(cat:*),Bash(find:*),Bash(head:*),Bash(chmod:*),Bash(mkdir:*),Bash(npm install:*),Bash(npm run:*),Bash(node:*)',
      '--max-turns', '50',
      '--output-format', 'text',
    ], {
      cwd: process.cwd(),
      stdio: ['pipe', 'inherit', 'inherit'],
    });

    child.stdin.write(prompt);
    child.stdin.end();

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), SIGKILL_GRACE_MS);
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

  if (existsSync(join(cwd, '.claude'))) walk(join(cwd, '.claude'), '.claude');
  if (existsSync(join(cwd, 'CLAUDE.md'))) files.push('CLAUDE.md');
  if (existsSync(join(cwd, 'memory'))) walk(join(cwd, 'memory'), 'memory');

  if (files.length > 0) {
    console.log(chalk.bold('\nGenerated files:'));
    for (const f of files) {
      console.log(chalk.dim(`  ${f}`));
    }
  }
}
