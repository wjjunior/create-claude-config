import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { buildPrompt } from './prompt.js';
import { checkExistingConfig } from '../utils/fs.js';
import { generateUniversalFiles } from './universal.js';

const TIMEOUT_MS = 5 * 60 * 1000;
const SIGKILL_GRACE_MS = 5000;

export class CancelledError extends Error {
  constructor() { super('Cancelled'); }
}

export async function runAutoConfig(): Promise<void> {
  const proceed = await checkExistingConfig();
  if (!proceed) {
    throw new CancelledError();
  }

  // Step 1: Generate universal files ourselves (hooks, universal skills, gitignore, memory)
  console.log(chalk.dim('  Setting up universal files...'));
  await generateUniversalFiles();

  // Step 2: Use Claude Code only for project-specific files
  const prompt = buildPrompt();
  console.log(chalk.cyan('\n  Analyzing project with Claude Code...\n'));
  await spawnClaude(prompt);

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
