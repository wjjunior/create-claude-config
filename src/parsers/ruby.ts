import type { ParserDef } from './index.js';

export const rubyParser: ParserDef = {
  language: 'ruby',
  extensions: ['.rb'],
  patterns: [
    {
      regex: '\\bdef\\s+(\\w+)',
      type: 'function',
      nameGroup: 1,
      signaturePrefix: 'def',
    },
    {
      regex: '\\bclass\\s+([A-Z]\\w*)',
      type: 'class',
      nameGroup: 1,
      signaturePrefix: 'class',
    },
    {
      regex: '\\bmodule\\s+([A-Z]\\w*)',
      type: 'module',
      nameGroup: 1,
      signaturePrefix: 'module',
    },
  ],
};
