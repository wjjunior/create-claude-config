import type { ProjectConfig } from '../types.js';
import { appendToFile } from '../utils/fs.js';
import path from 'node:path';

const GITIGNORE_ENTRIES = `
# Claude Code
.claude/settings.local.json
.claude/context.db
.claude/mcp-servers/*/node_modules/
.claude/mcp-servers/*/dist/

# Memory (local session data)
memory/
`;

export async function generateGitignore(_config: ProjectConfig): Promise<void> {
  const filePath = path.join(process.cwd(), '.gitignore');
  await appendToFile(filePath, GITIGNORE_ENTRIES);
}
