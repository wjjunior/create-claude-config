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

function deriveSourceDirs(config: Pick<ProjectConfig, 'backend' | 'frontend'>, isMonorepo: boolean): string[] {
  const dirs: string[] = [];

  if (config.backend !== 'none') {
    if (isMonorepo) {
      const cwd = process.cwd();
      if (fs.existsSync(path.join(cwd, 'backend'))) dirs.push('backend');
      else if (fs.existsSync(path.join(cwd, 'server'))) dirs.push('server');
      else if (fs.existsSync(path.join(cwd, 'api'))) dirs.push('api');
    } else if (config.backend === 'java') {
      dirs.push('src/main/java');
    } else if (config.backend === 'ruby') {
      dirs.push('app', 'lib');
    } else {
      dirs.push('src');
    }
  }

  if (config.frontend !== 'none') {
    if (isMonorepo) {
      const cwd = process.cwd();
      if (fs.existsSync(path.join(cwd, 'ui/src'))) dirs.push('ui/src');
      else if (fs.existsSync(path.join(cwd, 'client/src'))) dirs.push('client/src');
      else if (fs.existsSync(path.join(cwd, 'frontend/src'))) dirs.push('frontend/src');
    } else if (config.backend === 'none') {
      dirs.push('src');
    }
  }

  return dirs.length > 0 ? dirs : ['.'];
}
