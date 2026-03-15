import fs from 'node:fs';
import path from 'node:path';
import type { ProjectConfig } from '../types.js';

export function deriveConfig(partial: Omit<ProjectConfig, 'isMonorepo' | 'languages' | 'sourceDirs'>): ProjectConfig {
  const isMonorepo = detectMonorepo();
  const languages = deriveLanguages(partial);
  const sourceDirs = deriveSourceDirs(partial, isMonorepo);

  return { ...partial, isMonorepo, languages, sourceDirs };
}

function detectMonorepo(): boolean {
  const cwd = process.cwd();
  const backendDirs = ['backend', 'server', 'api'];
  const frontendDirs = ['ui', 'client', 'frontend', 'web'];

  const hasBackend = backendDirs.some(d => fs.existsSync(path.join(cwd, d)));
  const hasFrontend = frontendDirs.some(d => fs.existsSync(path.join(cwd, d)));

  return hasBackend && hasFrontend;
}

function deriveLanguages(config: Pick<ProjectConfig, 'backend' | 'backendLanguage' | 'frontend'>): string[] {
  const langs: string[] = [];

  if (config.backend === 'nodejs') {
    langs.push(config.backendLanguage === 'typescript' ? 'typescript' : 'javascript');
  } else if (config.backend === 'python') langs.push('python');
  else if (config.backend === 'go') langs.push('go');
  else if (config.backend === 'ruby') langs.push('ruby');
  else if (config.backend === 'java') langs.push('java');

  if (config.frontend !== 'none') {
    if (!langs.includes('typescript')) langs.push('typescript');
  }

  return langs;
}

const BACKEND_MONOREPO_NAMES = ['backend', 'server', 'api'] as const;
const FRONTEND_MONOREPO_PATHS = ['ui/src', 'client/src', 'frontend/src'] as const;

function getBackendSourceDirs(config: Pick<ProjectConfig, 'backend' | 'frontend'>, isMonorepo: boolean): string[] {
  if (config.backend === 'none') return [];
  if (isMonorepo) {
    const cwd = process.cwd();
    const found = BACKEND_MONOREPO_NAMES.find(d => fs.existsSync(path.join(cwd, d)));
    return found ? [found] : [];
  }
  if (config.backend === 'java') return ['src/main/java'];
  if (config.backend === 'ruby') return ['app', 'lib'];
  return ['src'];
}

function getFrontendSourceDirs(config: Pick<ProjectConfig, 'backend' | 'frontend'>, isMonorepo: boolean): string[] {
  if (config.frontend === 'none') return [];
  if (isMonorepo) {
    const cwd = process.cwd();
    const found = FRONTEND_MONOREPO_PATHS.find(d => fs.existsSync(path.join(cwd, d)));
    return found ? [found] : [];
  }
  return config.backend === 'none' ? ['src'] : [];
}

function deriveSourceDirs(config: Pick<ProjectConfig, 'backend' | 'frontend'>, isMonorepo: boolean): string[] {
  const dirs = [...getBackendSourceDirs(config, isMonorepo), ...getFrontendSourceDirs(config, isMonorepo)];
  return dirs.length > 0 ? dirs : ['.'];
}
