// Génère tous les niveaux de la campagne et vérifie leurs invariants. Usage : npm run validate-levels
// Audit Detective — créé par Gauthier Doumont.
import { CAMPAIGN_SPECS } from '../src/content/levels/campaign';
import { level001 } from '../src/content/levels/level-001';
import { generateCase } from '../src/engine/generate';
import { validateCase, validateLevel } from '../src/engine/validate';

const errors: string[] = [...validateLevel(level001)];
console.log(`Niveau  1 · ${level001.title} · ${level001.client.name}`);

for (const spec of CAMPAIGN_SPECS) {
  const generated = generateCase(spec);
  const { level } = generated;
  errors.push(...validateLevel(level), ...validateCase(generated));
  const again = JSON.stringify(generateCase(spec).level);
  if (again !== JSON.stringify(level)) errors.push(`${level.id} : non déterministe (même graine, cas différent)`);
  console.log(
    `Niveau ${String(level.number).padStart(2)} · ${level.title} · ${level.client.name} · difficulté ${level.difficulty}` +
      ` · budget ${level.budgetHours} h (optimal ${level.optimalHours} h) · ${level.anomalies.map((a) => a.title).join(' ; ')}`,
  );
}

if (errors.length > 0) {
  console.error(`\n${errors.length} erreur(s) :`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`\nOK : ${CAMPAIGN_SPECS.length + 1} niveaux valides.`);
