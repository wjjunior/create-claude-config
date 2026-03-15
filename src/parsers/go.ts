import type { ParserDef } from './index.js';

export const goParser: ParserDef = {
  language: 'go',
  extensions: ['.go'],
  patterns: [
    {
      regex: 'func\\s+\\(\\w+\\s+\\*?\\w+\\)\\s+([A-Z]\\w*)\\s*\\(',
      type: 'function',
      nameGroup: 1,
      signaturePrefix: 'method',
    },
    {
      regex: 'func\\s+([A-Z]\\w*)\\s*\\(',
      type: 'function',
      nameGroup: 1,
      signaturePrefix: 'func',
    },
    {
      regex: 'type\\s+([A-Z]\\w*)\\s+struct',
      type: 'class',
      nameGroup: 1,
      signaturePrefix: 'type struct',
    },
    {
      regex: 'type\\s+([A-Z]\\w*)\\s+interface',
      type: 'interface',
      nameGroup: 1,
      signaturePrefix: 'type interface',
    },
  ],
};
