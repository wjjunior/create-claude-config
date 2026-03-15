import type { ParserDef } from './index.js';

export const javaParser: ParserDef = {
  language: 'java',
  extensions: ['.java'],
  patterns: [
    {
      regex: String.raw`public\s+class\s+(\w+)`,
      type: 'class',
      nameGroup: 1,
      signaturePrefix: 'public class',
    },
    {
      regex: String.raw`public\s+interface\s+(\w+)`,
      type: 'interface',
      nameGroup: 1,
      signaturePrefix: 'public interface',
    },
    {
      regex: String.raw`public\s+enum\s+(\w+)`,
      type: 'enum',
      nameGroup: 1,
      signaturePrefix: 'public enum',
    },
    {
      regex: String.raw`public\s+record\s+(\w+)`,
      type: 'class',
      nameGroup: 1,
      signaturePrefix: 'public record',
    },
    {
      regex: String.raw`(?:public|protected|private)\s+(?:static\s+)?\w+\s+(\w+)\s*\(`,
      type: 'function',
      nameGroup: 1,
      signaturePrefix: 'method',
    },
  ],
};
