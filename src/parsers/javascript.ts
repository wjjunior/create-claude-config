import type { ParserDef } from './index.js';

export const javascriptParser: ParserDef = {
  language: 'javascript',
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  patterns: [
    {
      regex: String.raw`export\s+async\s+function\s+(\w+)\s*\(`,
      type: 'function',
      nameGroup: 1,
      signaturePrefix: 'async function',
    },
    {
      regex: String.raw`export\s+function\s+(\w+)\s*\(`,
      type: 'function',
      nameGroup: 1,
      signaturePrefix: 'function',
    },
    {
      regex: String.raw`export\s+class\s+(\w+)`,
      type: 'class',
      nameGroup: 1,
      signaturePrefix: 'class',
    },
    {
      regex: String.raw`export\s+interface\s+(\w+)`,
      type: 'interface',
      nameGroup: 1,
      signaturePrefix: 'interface',
    },
    {
      regex: String.raw`export\s+type\s+(\w+)`,
      type: 'type',
      nameGroup: 1,
      signaturePrefix: 'type',
    },
    {
      regex: String.raw`export\s+const\s+(\w+)`,
      type: 'module',
      nameGroup: 1,
      signaturePrefix: 'const',
    },
  ],
};
