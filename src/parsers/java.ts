import type { ParserDef } from './index.js';

export const javaParser: ParserDef = {
  language: 'java',
  extensions: ['.java'],
  patterns: [
    {
      regex: 'public\\s+class\\s+(\\w+)',
      type: 'class',
      nameGroup: 1,
      signaturePrefix: 'public class',
    },
    {
      regex: 'public\\s+interface\\s+(\\w+)',
      type: 'interface',
      nameGroup: 1,
      signaturePrefix: 'public interface',
    },
    {
      regex: 'public\\s+enum\\s+(\\w+)',
      type: 'enum',
      nameGroup: 1,
      signaturePrefix: 'public enum',
    },
    {
      regex: 'public\\s+record\\s+(\\w+)',
      type: 'class',
      nameGroup: 1,
      signaturePrefix: 'public record',
    },
    {
      regex: '(?:public|protected|private)\\s+(?:static\\s+)?\\w+\\s+(\\w+)\\s*\\(',
      type: 'function',
      nameGroup: 1,
      signaturePrefix: 'method',
    },
  ],
};
