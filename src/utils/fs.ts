import fs from 'node:fs';
import path from 'node:path';
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';

export async function ensureDir(dir: string): Promise<void> {
  fs.mkdirSync(dir, { recursive: true });
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

export async function appendToFile(filePath: string, content: string): Promise<void> {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf-8');
    if (existing.includes(content.trim())) return;
    fs.appendFileSync(filePath, '\n' + content, 'utf-8');
  } else {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

export async function checkExistingConfig(): Promise<boolean> {
  const cwd = process.cwd();
  const claudeDir = path.join(cwd, '.claude');
  const claudeMd = path.join(cwd, 'CLAUDE.md');

  const conflicts: string[] = [];
  if (fs.existsSync(claudeDir)) conflicts.push('.claude/');
  if (fs.existsSync(claudeMd)) conflicts.push('CLAUDE.md');

  if (conflicts.length === 0) return true;

  console.log(chalk.yellow(`\n⚠️  Existing files found: ${conflicts.join(', ')}`));

  if (fs.existsSync(claudeMd)) {
    const backup = await confirm({
      message: 'Back up existing CLAUDE.md to CLAUDE.md.bak?',
      default: true,
    });
    if (backup) {
      fs.copyFileSync(claudeMd, path.join(cwd, 'CLAUDE.md.bak'));
      console.log(chalk.dim('  Backed up CLAUDE.md → CLAUDE.md.bak'));
    }
  }

  return confirm({
    message: 'Overwrite existing configuration?',
    default: false,
  });
}
