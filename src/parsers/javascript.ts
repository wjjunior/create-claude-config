import type { ParserDef } from './index.js';

export const javascriptParser: ParserDef = {
  language: 'javascript',
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  patterns: [
    {
      regex: 'export\\s+async\\s+function\\s+(\\w+)\\s*\\(',
      type: 'function',
      nameGroup: 1,
      signaturePrefix: 'async function',
    },
    {
      regex: 'export\\s+function\\s+(\\w+)\\s*\\(',
      type: 'function',
      nameGroup: 1,
      signaturePrefix: 'function',
    },
    {
      regex: 'export\\s+class\\s+(\\w+)',
      type: 'class',
      nameGroup: 1,
      signaturePrefix: 'class',
    },
    {
      regex: 'export\\s+interface\\s+(\\w+)',
      type: 'interface',
      nameGroup: 1,
      signaturePrefix: 'interface',
    },
    {
      regex: 'export\\s+type\\s+(\\w+)',
      type: 'type',
      nameGroup: 1,
      signaturePrefix: 'type',
    },
    {
      regex: 'export\\s+const\\s+(\\w+)',
      type: 'module',
      nameGroup: 1,
      signaturePrefix: 'const',
    },
  ],
};
