import type { ProjectConfig } from '../types.js';
import { promptProject } from './project.js';
import { promptBackend, promptFrontend, promptDatabase } from './stack.js';
import { promptOrm, promptTestFramework, promptMcp, promptHooks } from './features.js';
import { showPreview } from './preview.js';
import { deriveConfig } from '../utils/derive.js';

export async function runWizard(): Promise<ProjectConfig> {
  const project = await promptProject();
  const backend = await promptBackend();
  const frontend = await promptFrontend();
  const db = await promptDatabase();
  const orm = await promptOrm(backend.backend, db.database);
  const test = await promptTestFramework(backend.backend, frontend.frontend);
  const mcp = await promptMcp();
  const hooks = await promptHooks();

  const config = deriveConfig({
    ...project,
    ...backend,
    ...frontend,
    ...db,
    ...orm,
    ...test,
    ...mcp,
    ...hooks,
  });

  const proceed = await showPreview(config);
  if (!proceed) {
    console.log('Cancelled.');
    process.exit(0);
  }

  return config;
}
