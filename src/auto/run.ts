import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import chalk from 'chalk';
import { buildPrompt } from './prompt.js';
import { checkExistingConfig } from '../utils/fs.js';

const TIMEOUT_MS = 5 * 60 * 1000;

export async function runAutoConfig(): Promise<void> {
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
    const child = spawn('bash', [
      '-c',
      `claude -p "$(cat '${promptFile}')" --allowedTools "Write,Bash(ls:*),Bash(cat:*),Bash(find:*),Bash(head:*),Bash(chmod:*),Bash(mkdir:*),Bash(npm:*),Bash(node:*)" --max-turns 30 --output-format text`,
    ], {
      cwd: process.cwd(),
      stdio: 'inherit',
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

  const claudeDir = join(cwd, '.claude');
  try {
    statSync(claudeDir);
    walk(claudeDir, '.claude');
  } catch {}

  try {
    statSync(join(cwd, 'CLAUDE.md'));
    files.push('CLAUDE.md');
  } catch {}

  if (files.length > 0) {
    console.log(chalk.bold('\nGenerated files:'));
    for (const f of files) {
      console.log(chalk.dim(`  ${f}`));
    }
  }
}
