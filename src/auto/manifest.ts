import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MANIFEST_PATH = '.claude/.setup-manifest.json';
const PACKAGE_VERSION = '0.2.0';

export interface Manifest {
  version: string;
  generatedAt: string;
  mcpEnabled: boolean;
}

export function getManifestPath(): string {
  return join(process.cwd(), MANIFEST_PATH);
}

export function getPackageVersion(): string {
  return PACKAGE_VERSION;
}

export function readManifest(): Manifest | null {
  const manifestPath = getManifestPath();
  if (!existsSync(manifestPath)) return null;

  try {
    const raw = readFileSync(manifestPath, 'utf-8');
    return JSON.parse(raw) as Manifest;
  } catch {
    return null;
  }
}

export function writeManifest(mcpEnabled: boolean): void {
  const manifest: Manifest = {
    version: PACKAGE_VERSION,
    generatedAt: new Date().toISOString(),
    mcpEnabled,
  };

  writeFileSync(getManifestPath(), JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
}

export function isNewerVersion(installed: string): boolean {
  const current = PACKAGE_VERSION.split('.').map(Number);
  const prev = installed.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if ((current[i] ?? 0) > (prev[i] ?? 0)) return true;
    if ((current[i] ?? 0) < (prev[i] ?? 0)) return false;
  }
  return false;
}
