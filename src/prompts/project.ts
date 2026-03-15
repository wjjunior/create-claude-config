import { input } from '@inquirer/prompts';
import path from 'node:path';

export async function promptProject() {
  const defaultName = path.basename(process.cwd());

  const projectName = await input({
    message: 'Project name:',
    default: defaultName,
  });

  const description = await input({
    message: 'Brief project description:',
  });

  return { projectName, description };
}
