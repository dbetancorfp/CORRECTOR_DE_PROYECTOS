// GATE HUMANO — reconcile boceto sketchNumbers vs functional-spec elementSpecs
// Produces corrector/03-generated-artifacts/reconciliation.json
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { ReconciliationSchema } from '../../lib/schemas/reconciliation.schema.js';

const ROOT = resolve(import.meta.dir, '../..');

export async function run(args) {
  const featureId = parseFeatureId(args);

  const boceto = JSON.parse(
    readFileSync(`${ROOT}/corrector/01-boceto/boceto-metadata.json`, 'utf8'),
  );
  const fspec = JSON.parse(
    readFileSync(`${ROOT}/corrector/03-generated-artifacts/functional-spec.json`, 'utf8'),
  );

  const boecetoNumbers = boceto.screens
    .flatMap(s => s.sketchNumbers)
    .sort((a, b) => a - b);

  const specNumbers = fspec.elementSpecs
    .map(e => e.sketchNumber)
    .sort((a, b) => a - b);

  const boecetoSet = new Set(boecetoNumbers);
  const specSet    = new Set(specNumbers);

  const orphanedSketchElements = boecetoNumbers.filter(n => !specSet.has(n));
  const orphanedSpecRules      = specNumbers.filter(n => !boecetoSet.has(n));
  const valid = orphanedSketchElements.length === 0 && orphanedSpecRules.length === 0;

  const notes = valid
    ? `All ${boecetoNumbers.length} boceto elements matched to functional-spec entries. No orphans.`
    : [
        orphanedSketchElements.length > 0
          ? `Boceto elements missing from spec: ${orphanedSketchElements.join(', ')}`
          : null,
        orphanedSpecRules.length > 0
          ? `Spec entries missing from boceto: ${orphanedSpecRules.join(', ')}`
          : null,
      ].filter(Boolean).join(' | ');

  const report = ReconciliationSchema.parse({
    valid,
    boceto_numbers: boecetoNumbers,
    spec_numbers:   specNumbers,
    orphaned_sketch_elements: orphanedSketchElements,
    orphaned_spec_rules:      orphanedSpecRules,
    notes,
  });

  const outPath = `${ROOT}/corrector/03-generated-artifacts/reconciliation.json`;
  writeFileSync(outPath, JSON.stringify({ feature_id: featureId, ...report }, null, 2));

  console.log(`\n${ valid ? '✅ GATE HUMANO — PASS' : '❌ GATE HUMANO — FAIL' }`);
  console.log(`   boceto numbers : ${boecetoNumbers.length}`);
  console.log(`   spec numbers   : ${specNumbers.length}`);
  if (orphanedSketchElements.length > 0)
    console.log(`   ⚠ orphaned boceto : ${orphanedSketchElements.join(', ')}`);
  if (orphanedSpecRules.length > 0)
    console.log(`   ⚠ orphaned spec   : ${orphanedSpecRules.join(', ')}`);
  console.log(`   ${notes}`);
  console.log(`   → ${outPath}\n`);

  if (!valid) process.exit(1);
}

function parseFeatureId(args) {
  const idx = args.indexOf('--feature-id');
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return 'corrector-v1';
}
