import path from 'node:path';
import { execSync } from 'node:child_process';
import type { ProjectConfig } from '../types.js';
import { getParserDefs, type ParserDef } from '../parsers/index.js';
import { writeFile } from '../utils/fs.js';

function generatePackageJson(config: ProjectConfig): string {
  const indexScript = `node dist/index-project.js ${config.sourceDirs.join(' ')}`;
  const pkg = {
    name: 'context-server',
    version: '1.0.0',
    type: 'module',
    scripts: {
      build: 'tsc',
      index: indexScript,
    },
    dependencies: {
      '@modelcontextprotocol/sdk': '^1.27.1',
      'better-sqlite3': '^12.8.0',
    },
    devDependencies: {
      '@types/better-sqlite3': '^7.6.13',
      '@types/node': '^25.5.0',
      'ts-node': '^10.9.2',
      'typescript': '^5.9.3',
    },
  };
  return JSON.stringify(pkg, null, 2) + '\n';
}

function generateTsconfig(): string {
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'Node16',
      moduleResolution: 'Node16',
      lib: ['ES2022'],
      strict: true,
      esModuleInterop: true,
      outDir: './dist',
      rootDir: './',
      resolveJsonModule: true,
      skipLibCheck: true,
    },
    include: ['.'],
    exclude: ['node_modules', 'dist'],
  };
  return JSON.stringify(tsconfig, null, 2) + '\n';
}

function generateIndexTs(): string {
  return `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Database from "better-sqlite3";
import { z } from "zod";
import * as path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "../../../..");
const dbPath = path.join(projectRoot, ".claude/context.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(\`
  CREATE TABLE IF NOT EXISTS symbols (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    line_number INTEGER NOT NULL,
    signature TEXT,
    UNIQUE(name, file_path, line_number)
  );

  CREATE TABLE IF NOT EXISTS observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol_name TEXT NOT NULL,
    observation TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(symbol_name, observation)
  );

  CREATE TABLE IF NOT EXISTS dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_symbol TEXT NOT NULL,
    target_symbol TEXT NOT NULL,
    dep_type TEXT DEFAULT 'uses',
    UNIQUE(source_symbol, target_symbol, dep_type)
  );

  CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
  CREATE INDEX IF NOT EXISTS idx_observations_symbol ON observations(symbol_name);
  CREATE INDEX IF NOT EXISTS idx_deps_source ON dependencies(source_symbol);
  CREATE INDEX IF NOT EXISTS idx_deps_target ON dependencies(target_symbol);
\`);

const server = new McpServer({
  name: "context-server",
  version: "1.0.0",
});

server.tool(
  "get_symbol_context",
  "Get context for a symbol including its definition, dependencies, and observations",
  {
    symbolName: z.string().describe("The symbol name to look up"),
  },
  async ({ symbolName }) => {
    const symbols = db
      .prepare("SELECT * FROM symbols WHERE name = ? OR name LIKE ?")
      .all(symbolName, \`%\${symbolName}%\`) as Array<{
        name: string; type: string; file_path: string; line_number: number; signature: string | null;
      }>;

    const observations = db
      .prepare("SELECT * FROM observations WHERE symbol_name = ?")
      .all(symbolName) as Array<{
        symbol_name: string; observation: string; created_at: string;
      }>;

    const outgoing = db
      .prepare("SELECT * FROM dependencies WHERE source_symbol = ?")
      .all(symbolName) as Array<{
        source_symbol: string; target_symbol: string; dep_type: string;
      }>;

    const incoming = db
      .prepare("SELECT * FROM dependencies WHERE target_symbol = ?")
      .all(symbolName) as Array<{
        source_symbol: string; target_symbol: string; dep_type: string;
      }>;

    if (symbols.length === 0 && observations.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: \`No context found for symbol: \${symbolName}\`,
          },
        ],
      };
    }

    const lines: string[] = [];
    if (symbols.length > 0) {
      lines.push("## Definitions");
      for (const s of symbols) {
        lines.push(\`- **\${s.type}** \\\`\${s.name}\\\` in \\\`\${s.file_path}\\\`:\${s.line_number}\${s.signature ? \` — \\\`\${s.signature}\\\`\` : ""}\`);
      }
    }

    if (observations.length > 0) {
      lines.push("\\n## Observations");
      for (const o of observations) {
        lines.push(\`- \${o.observation} (\${o.created_at})\`);
      }
    }

    if (outgoing.length > 0) {
      lines.push("\\n## Uses (outgoing)");
      for (const d of outgoing) {
        lines.push(\`- \${d.dep_type} → \${d.target_symbol}\`);
      }
    }

    if (incoming.length > 0) {
      lines.push("\\n## Used by (incoming)");
      for (const d of incoming) {
        lines.push(\`- \${d.source_symbol} → \${d.dep_type}\`);
      }
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\\n") }],
    };
  }
);

server.tool(
  "add_observation",
  "Record an observation about a symbol for future reference",
  {
    symbolName: z.string().describe("The symbol name to annotate"),
    observation: z.string().describe("The insight or observation to record"),
  },
  async ({ symbolName, observation }) => {
    db.prepare(
      "INSERT OR IGNORE INTO observations (symbol_name, observation) VALUES (?, ?)"
    ).run(symbolName, observation);

    return {
      content: [
        {
          type: "text" as const,
          text: \`Recorded observation for \${symbolName}: \${observation}\`,
        },
      ],
    };
  }
);

server.tool(
  "get_project_summary",
  "Get a summary of the indexed project including stats and recent observations",
  {},
  async () => {
    const symbolCount = (
      db.prepare("SELECT COUNT(*) as count FROM symbols").get() as { count: number }
    ).count;
    const fileCount = (
      db.prepare("SELECT COUNT(DISTINCT file_path) as count FROM symbols").get() as { count: number }
    ).count;
    const obsCount = (
      db.prepare("SELECT COUNT(*) as count FROM observations").get() as { count: number }
    ).count;

    const typeCounts = db
      .prepare("SELECT type, COUNT(*) as count FROM symbols GROUP BY type ORDER BY count DESC")
      .all() as Array<{ type: string; count: number }>;

    const recentObs = db
      .prepare("SELECT * FROM observations ORDER BY created_at DESC LIMIT 10")
      .all() as Array<{ symbol_name: string; observation: string; created_at: string }>;

    const lines: string[] = [
      "## Project Index Summary",
      \`- **\${symbolCount}** symbols across **\${fileCount}** files\`,
      \`- **\${obsCount}** observations recorded\`,
      "",
      "### Symbol types",
    ];

    for (const tc of typeCounts) {
      lines.push(\`- \${tc.type}: \${tc.count}\`);
    }

    if (recentObs.length > 0) {
      lines.push("", "### Recent observations");
      for (const o of recentObs) {
        lines.push(\`- **\${o.symbol_name}**: \${o.observation} (\${o.created_at})\`);
      }
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\\n") }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
`;
}

function generateIndexProject(_config: ProjectConfig, parsers: ParserDef[]): string {
  // Build parser patterns as embedded JSON
  const parsersJson = JSON.stringify(
    parsers.map((p) => ({
      language: p.language,
      extensions: p.extensions,
      patterns: p.patterns.map((pat) => ({
        regex: pat.regex,
        type: pat.type,
        nameGroup: pat.nameGroup,
        signaturePrefix: pat.signaturePrefix,
      })),
    })),
    null,
    2,
  );

  return `import Database from "better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "../../../..");
const dbPath = path.join(projectRoot, ".claude/context.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

// Create tables
db.exec(\`
  CREATE TABLE IF NOT EXISTS symbols (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    line_number INTEGER NOT NULL,
    signature TEXT,
    UNIQUE(name, file_path, line_number)
  );

  CREATE TABLE IF NOT EXISTS observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol_name TEXT NOT NULL,
    observation TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(symbol_name, observation)
  );

  CREATE TABLE IF NOT EXISTS dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_symbol TEXT NOT NULL,
    target_symbol TEXT NOT NULL,
    dep_type TEXT DEFAULT 'uses',
    UNIQUE(source_symbol, target_symbol, dep_type)
  );

  CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
  CREATE INDEX IF NOT EXISTS idx_observations_symbol ON observations(symbol_name);
  CREATE INDEX IF NOT EXISTS idx_deps_source ON dependencies(source_symbol);
  CREATE INDEX IF NOT EXISTS idx_deps_target ON dependencies(target_symbol);
\`);

// Backup observations before re-index
const savedObservations = db
  .prepare("SELECT symbol_name, observation, created_at FROM observations")
  .all() as Array<{ symbol_name: string; observation: string; created_at: string }>;

// Clear symbols and dependencies for fresh index
db.exec("DELETE FROM symbols");
db.exec("DELETE FROM dependencies");

// Parser definitions (embedded at generation time)
interface ParserPattern {
  regex: string;
  type: string;
  nameGroup: number;
  signaturePrefix: string;
}

interface ParserDef {
  language: string;
  extensions: string[];
  patterns: ParserPattern[];
}

const parsers: ParserDef[] = ${parsersJson};

// Build extension map
const extToParser = new Map<string, ParserDef>();
for (const parser of parsers) {
  for (const ext of parser.extensions) {
    extToParser.set(ext, parser);
  }
}

const insertSymbol = db.prepare(
  "INSERT OR IGNORE INTO symbols (name, type, file_path, line_number, signature) VALUES (?, ?, ?, ?, ?)"
);

const insertDep = db.prepare(
  "INSERT OR IGNORE INTO dependencies (source_symbol, target_symbol, dep_type) VALUES (?, ?, ?)"
);

const IGNORED_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "__pycache__",
  "venv", ".venv", "vendor", "target", ".claude",
]);

function walkDir(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseFile(filePath: string): void {
  const ext = path.extname(filePath);
  const parser = extToParser.get(ext);
  if (!parser) return;

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return;
  }

  const relativePath = path.relative(projectRoot, filePath);
  const lines = content.split("\\n");
  const foundSymbols: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of parser.patterns) {
      const match = line.match(new RegExp(pattern.regex));
      if (match && match[pattern.nameGroup]) {
        const name = match[pattern.nameGroup];
        const signature = \`\${pattern.signaturePrefix} \${name}\`;
        insertSymbol.run(name, pattern.type, relativePath, i + 1, signature);
        foundSymbols.push(name);
      }
    }
  }

  // Simple dependency detection: look for import/require references to known symbols
  for (const symbol of foundSymbols) {
    for (const line of lines) {
      if (line.includes("import") && line.includes(symbol) && !line.includes(\`function \${symbol}\`) && !line.includes(\`class \${symbol}\`)) {
        const importMatch = line.match(/from\\s+['"]([^'"]+)['"]/);
        if (importMatch) {
          insertDep.run(symbol, importMatch[1], "imports");
        }
      }
    }
  }
}

// Get source directories from CLI args or use defaults
const sourceDirs = process.argv.slice(2);
if (sourceDirs.length === 0) {
  console.error("Usage: node dist/index-project.js <dir1> [dir2] ...");
  process.exit(1);
}

console.log(\`Indexing project at: \${projectRoot}\`);
console.log(\`Source directories: \${sourceDirs.join(", ")}\`);

const insertMany = db.transaction(() => {
  for (const dir of sourceDirs) {
    const fullDir = path.join(projectRoot, dir);
    if (!fs.existsSync(fullDir)) {
      console.warn(\`Warning: directory not found: \${fullDir}\`);
      continue;
    }
    const files = walkDir(fullDir);
    console.log(\`  \${dir}: \${files.length} files found\`);
    for (const file of files) {
      parseFile(file);
    }
  }
});

insertMany();

// Restore observations
const restoreObs = db.prepare(
  "INSERT OR IGNORE INTO observations (symbol_name, observation, created_at) VALUES (?, ?, ?)"
);
const restoreMany = db.transaction(() => {
  for (const obs of savedObservations) {
    restoreObs.run(obs.symbol_name, obs.observation, obs.created_at);
  }
});
restoreMany();

const symbolCount = (
  db.prepare("SELECT COUNT(*) as count FROM symbols").get() as { count: number }
).count;
const fileCount = (
  db.prepare("SELECT COUNT(DISTINCT file_path) as count FROM symbols").get() as { count: number }
).count;
const obsCount = (
  db.prepare("SELECT COUNT(*) as count FROM observations").get() as { count: number }
).count;

console.log(\`\\nIndexing complete:\`);
console.log(\`  \${symbolCount} symbols across \${fileCount} files\`);
console.log(\`  \${obsCount} observations preserved\`);

db.close();
`;
}

export async function generateMcpServer(config: ProjectConfig): Promise<void> {
  if (!config.includeMcp) return;

  const serverDir = path.join(process.cwd(), '.claude', 'mcp-servers', 'context-server');
  const parsers = getParserDefs(config.languages);

  // Write all files
  await writeFile(path.join(serverDir, 'package.json'), generatePackageJson(config));
  await writeFile(path.join(serverDir, 'tsconfig.json'), generateTsconfig());
  await writeFile(path.join(serverDir, 'index.ts'), generateIndexTs());
  await writeFile(path.join(serverDir, 'index-project.ts'), generateIndexProject(config, parsers));

  // Install dependencies
  try {
    execSync('npm install --silent', { cwd: serverDir, stdio: 'pipe' });
  } catch {
    console.log(
      '⚠️  npm install failed. Run manually: cd .claude/mcp-servers/context-server && npm install',
    );
  }
}
