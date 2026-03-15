import fs from 'node:fs';
import ejs from 'ejs';

export function renderTemplate(templateUrl: URL, data: Record<string, unknown>): string {
  const raw = fs.readFileSync(templateUrl, 'utf-8');
  if (templateUrl.pathname.endsWith('.ejs')) {
    return ejs.render(raw, data);
  }
  return raw;
}
