import { javascriptParser } from './javascript.js';
import { pythonParser } from './python.js';
import { goParser } from './go.js';
import { rubyParser } from './ruby.js';
import { javaParser } from './java.js';

export interface ParserPattern {
  regex: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'module' | 'enum';
  nameGroup: number;
  signaturePrefix: string;
}

export interface ParserDef {
  language: string;
  extensions: string[];
  patterns: ParserPattern[];
}

const ALL_PARSERS: Record<string, ParserDef> = {
  javascript: javascriptParser,
  typescript: javascriptParser,
  python: pythonParser,
  go: goParser,
  ruby: rubyParser,
  java: javaParser,
};

export function getParserDefs(languages: string[]): ParserDef[] {
  const seen = new Set<string>();
  const result: ParserDef[] = [];

  for (const lang of languages) {
    const parser = ALL_PARSERS[lang];
    if (parser && !seen.has(parser.language)) {
      seen.add(parser.language);
      result.push(parser);
    }
  }

  return result;
}
