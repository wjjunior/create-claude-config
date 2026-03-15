import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Database from "better-sqlite3";
import { z } from "zod";
import * as path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "../../../..");
const dbPath = path.join(projectRoot, ".claude/context.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

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
      .all(symbolName, `%${symbolName}%`) as Array<{
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
            text: `No context found for symbol: ${symbolName}`,
          },
        ],
      };
    }

    const lines: string[] = [];
    if (symbols.length > 0) {
      lines.push("## Definitions");
      for (const s of symbols) {
        lines.push(`- **${s.type}** \`${s.name}\` in \`${s.file_path}\`:${s.line_number}${s.signature ? ` — \`${s.signature}\`` : ""}`);
      }
    }

    if (observations.length > 0) {
      lines.push("\n## Observations");
      for (const o of observations) {
        lines.push(`- ${o.observation} (${o.created_at})`);
      }
    }

    if (outgoing.length > 0) {
      lines.push("\n## Uses (outgoing)");
      for (const d of outgoing) {
        lines.push(`- ${d.dep_type} → ${d.target_symbol}`);
      }
    }

    if (incoming.length > 0) {
      lines.push("\n## Used by (incoming)");
      for (const d of incoming) {
        lines.push(`- ${d.source_symbol} → ${d.dep_type}`);
      }
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
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
          text: `Recorded observation for ${symbolName}: ${observation}`,
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
      `- **${symbolCount}** symbols across **${fileCount}** files`,
      `- **${obsCount}** observations recorded`,
      "",
      "### Symbol types",
    ];

    for (const tc of typeCounts) {
      lines.push(`- ${tc.type}: ${tc.count}`);
    }

    if (recentObs.length > 0) {
      lines.push("", "### Recent observations");
      for (const o of recentObs) {
        lines.push(`- **${o.symbol_name}**: ${o.observation} (${o.created_at})`);
      }
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
