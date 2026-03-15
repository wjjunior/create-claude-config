import type { ParserDef } from './index.js';

export const pythonParser: ParserDef = {
  language: 'python',
  extensions: ['.py'],
  patterns: [
    {
      regex: String.raw`^async\s+def\s+(\w+)\s*\(`,
      type: 'function',
      nameGroup: 1,
      signaturePrefix: 'async def',
    },
    {
      regex: String.raw`^def\s+(\w+)\s*\(`,
      type: 'function',
      nameGroup: 1,
      signaturePrefix: 'def',
    },
    {
      regex: String.raw`^class\s+(\w+)`,
      type: 'class',
      nameGroup: 1,
      signaturePrefix: 'class',
    },
  ],
};
