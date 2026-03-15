import type { ProjectConfig } from '../types.js';
import { checkExistingConfig } from '../utils/fs.js';
import { generateSettings } from './settings.js';
import { generateHooks } from './hooks.js';
import { generateSkills } from './skills.js';
import { generateClaudeMd } from './claude-md.js';
import { generateGitignore } from './gitignore.js';
import { generateMcpServer } from './mcp-server.js';

export async function generate(config: ProjectConfig): Promise<void> {
  const proceed = await checkExistingConfig();
  if (!proceed) {
    console.log('Cancelled.');
    process.exit(0);
  }

  await generateSettings(config);
  await generateHooks(config);
  await generateSkills(config);
  await generateClaudeMd(config);
  await generateGitignore(config);

  if (config.includeMcp) {
    await generateMcpServer(config);
  }
}
