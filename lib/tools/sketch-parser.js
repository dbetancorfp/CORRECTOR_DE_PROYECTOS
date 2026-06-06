import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const BOCETO_ROOT = join(ROOT, 'corrector/01-boceto');
const PROTOTYPE_DIR = join(BOCETO_ROOT, 'html-source-prototype');

export function loadBoceto(featureId) {
  const metadata = JSON.parse(readFileSync(join(BOCETO_ROOT, 'boceto-metadata.json'), 'utf8'));
  if (metadata.featureId !== featureId) {
    throw new Error(`Feature ID mismatch: metadata="${metadata.featureId}" requested="${featureId}"`);
  }
  return metadata;
}

export function loadBoceteElements() {
  return readFileSync(join(PROTOTYPE_DIR, 'boceto-elements.md'), 'utf8');
}

export function loadScreenHtml(filename) {
  const path = join(PROTOTYPE_DIR, filename);
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

export function filterElementRows(boceteElementsMd, sketchNumbers) {
  return boceteElementsMd
    .split('\n')
    .filter(line => {
      const match = line.match(/^\| (\d+) \|/);
      return match && sketchNumbers.includes(Number(match[1]));
    })
    .join('\n');
}
