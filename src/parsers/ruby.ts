import type { ParserDef } from './index.js';

export const rubyParser: ParserDef = {
  language: 'ruby',
  extensions: ['.rb'],
  patterns: [
    {
      regex: String.raw`\bdef\s+(\w+)`,
      type: 'function',
      nameGroup: 1,
      signaturePrefix: 'def',
    },
    {
      regex: String.raw`\bclass\s+([A-Z]\w*)`,
      type: 'class',
      nameGroup: 1,
      signaturePrefix: 'class',
    },
    {
      regex: String.raw`\bmodule\s+([A-Z]\w*)`,
      type: 'module',
      nameGroup: 1,
      signaturePrefix: 'module',
    },
  ],
};
