import { createApp } from "./app";
import { PostgresLegislationRepository } from "./modules/legislation/legislation.repository";
import { PostgresCycleRepository } from "./modules/cycle/cycle.repository";

async function seedLegislation(repo: PostgresLegislationRepository): Promise<void> {
  const seeds = [
    { name: "LOE", start_year: 1990 },
    { name: "LOMLOE", start_year: 2020 },
  ];

  for (const s of seeds) {
    try {
      const existing = await repo.getByName(s.name);
      if (!existing) {
        await repo.create(s);
        console.log(`Seeded legislation: ${s.name}`);
      }
    } catch (err) {
      console.error(`Failed to seed ${s.name}:`, err);
    }
  }
}

async function seedCycles(repo: PostgresCycleRepository): Promise<void> {
  const legislationRepo = new PostgresLegislationRepository();
  const legislations = await legislationRepo.getAll();
  const legislationMap = new Map(legislations.map(l => [l.name, l.id]));

  const seeds: Array<{ name: string; legislationName: string }> = [
    { name: "DAW", legislationName: "LOE" },
    { name: "DAM", legislationName: "LOE" },
    { name: "ASIR", legislationName: "LOE" },
  ];

  for (const s of seeds) {
    const legislationId = legislationMap.get(s.legislationName);
    if (!legislationId) {
      console.error(`Cannot seed cycle ${s.name}: legislation '${s.legislationName}' not found`);
      continue;
    }

    try {
      const existing = await repo.getByNameAndLegislation(s.name, legislationId);
      if (!existing) {
        await repo.create({ name: s.name, legislation_id: legislationId });
        console.log(`Seeded cycle: ${s.name} (${s.legislationName})`);
      }
    } catch (err) {
      console.error(`Failed to seed cycle ${s.name}:`, err);
    }
  }
}

const legislationRepo = new PostgresLegislationRepository();
const cycleRepo = new PostgresCycleRepository();
const app = createApp({ legislationRepo, cycleRepo });

await seedLegislation(legislationRepo);
await seedCycles(cycleRepo);

const port = parseInt(process.env.PORT ?? "3000", 10);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
