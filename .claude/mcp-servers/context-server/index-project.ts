import Database from "better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "../../../..");
const dbPath = path.join(projectRoot, ".claude/context.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
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
`);

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

const parsers: ParserDef[] = [
  {
    "language": "javascript",
    "extensions": [
      ".js",
      ".jsx",
      ".ts",
      ".tsx"
    ],
    "patterns": [
      {
        "regex": "export\\s+async\\s+function\\s+(\\w+)\\s*\\(",
        "type": "function",
        "nameGroup": 1,
        "signaturePrefix": "async function"
      },
      {
        "regex": "export\\s+function\\s+(\\w+)\\s*\\(",
        "type": "function",
        "nameGroup": 1,
        "signaturePrefix": "function"
      },
      {
        "regex": "export\\s+class\\s+(\\w+)",
        "type": "class",
        "nameGroup": 1,
        "signaturePrefix": "class"
      },
      {
        "regex": "export\\s+interface\\s+(\\w+)",
        "type": "interface",
        "nameGroup": 1,
        "signaturePrefix": "interface"
      },
      {
        "regex": "export\\s+type\\s+(\\w+)",
        "type": "type",
        "nameGroup": 1,
        "signaturePrefix": "type"
      },
      {
        "regex": "export\\s+const\\s+(\\w+)",
        "type": "module",
        "nameGroup": 1,
        "signaturePrefix": "const"
      }
    ]
  }
];

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
  const lines = content.split("\n");
  const foundSymbols: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of parser.patterns) {
      const match = line.match(new RegExp(pattern.regex));
      if (match && match[pattern.nameGroup]) {
        const name = match[pattern.nameGroup];
        const signature = `${pattern.signaturePrefix} ${name}`;
        insertSymbol.run(name, pattern.type, relativePath, i + 1, signature);
        foundSymbols.push(name);
      }
    }
  }

  // Simple dependency detection: look for import/require references to known symbols
  for (const symbol of foundSymbols) {
    for (const line of lines) {
      if (line.includes("import") && line.includes(symbol) && !line.includes(`function ${symbol}`) && !line.includes(`class ${symbol}`)) {
        const importMatch = line.match(/from\s+['"]([^'"]+)['"]/);
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

console.log(`Indexing project at: ${projectRoot}`);
console.log(`Source directories: ${sourceDirs.join(", ")}`);

const insertMany = db.transaction(() => {
  for (const dir of sourceDirs) {
    const fullDir = path.join(projectRoot, dir);
    if (!fs.existsSync(fullDir)) {
      console.warn(`Warning: directory not found: ${fullDir}`);
      continue;
    }
    const files = walkDir(fullDir);
    console.log(`  ${dir}: ${files.length} files found`);
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

console.log(`\nIndexing complete:`);
console.log(`  ${symbolCount} symbols across ${fileCount} files`);
console.log(`  ${obsCount} observations preserved`);

db.close();
