import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACTS_DIR = join(ROOT, 'corrector/03-generated-artifacts');

export function saveArtifact(filename, content) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const path = join(ARTIFACTS_DIR, filename);
  const json = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  writeFileSync(path, json, 'utf8');
  return path;
}
