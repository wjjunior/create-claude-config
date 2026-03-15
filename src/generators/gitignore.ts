import type { ProjectConfig } from '../types.js';
import { appendToFile } from '../utils/fs.js';
import path from 'node:path';

const GITIGNORE_ENTRIES = `
# Claude Code (local/generated — do not commit)
.claude/settings.local.json
.claude/.setup-manifest.json
.claude/context.db
.claude/mcp-servers/*/node_modules/
.claude/mcp-servers/*/dist/
.claude/mcp-servers/*/package-lock.json

# Memory (local session data — do not commit)
memory/
`;

export async function generateGitignore(_config: ProjectConfig): Promise<void> {
  const filePath = path.join(process.cwd(), '.gitignore');
  await appendToFile(filePath, GITIGNORE_ENTRIES);
}
