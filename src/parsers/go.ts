import type { ParserDef } from './index.js';

export const goParser: ParserDef = {
  language: 'go',
  extensions: ['.go'],
  patterns: [
    {
      regex: String.raw`func\s+\(\w+\s+\*?\w+\)\s+([A-Z]\w*)\s*\(`,
      type: 'function',
      nameGroup: 1,
      signaturePrefix: 'method',
    },
    {
      regex: String.raw`func\s+([A-Z]\w*)\s*\(`,
      type: 'function',
      nameGroup: 1,
      signaturePrefix: 'func',
    },
    {
      regex: String.raw`type\s+([A-Z]\w*)\s+struct`,
      type: 'class',
      nameGroup: 1,
      signaturePrefix: 'type struct',
    },
    {
      regex: String.raw`type\s+([A-Z]\w*)\s+interface`,
      type: 'interface',
      nameGroup: 1,
      signaturePrefix: 'type interface',
    },
  ],
};
