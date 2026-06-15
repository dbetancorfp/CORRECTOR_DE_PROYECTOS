import type { Cycle, CreateCycleDTO, UpdateCycleDTO } from "./cycle.entity";

export interface ICycleRepository {
  create(dto: CreateCycleDTO): Promise<Cycle>;
  getAll(): Promise<Cycle[]>;
  getByLegislationId(legislationId: number): Promise<Cycle[]>;
  getById(id: number): Promise<Cycle | null>;
  getByNameAndLegislation(name: string, legislationId: number): Promise<Cycle | null>;
  update(id: number, dto: UpdateCycleDTO): Promise<Cycle | null>;
  delete(id: number): Promise<Cycle | null>;
  legislationExists(id: number): Promise<boolean>;
}

export class PostgresCycleRepository implements ICycleRepository {
  private sql: Bun.SQL;

  constructor() {
    this.sql = new Bun.SQL({
      url: process.env.DATABASE_URL ?? "postgres://corrector:corrector@localhost:5432/corrector",
    });
  }

  async create(dto: CreateCycleDTO): Promise<Cycle> {
    const [row] = await this.sql`
      INSERT INTO cycle (name, legislation_id)
      VALUES (${dto.name}, ${dto.legislation_id})
      RETURNING id, name, legislation_id, created_at
    `;
    return row as Cycle;
  }

  async getAll(): Promise<Cycle[]> {
    const rows = await this.sql`
      SELECT id, name, legislation_id, created_at
      FROM cycle
      ORDER BY name
    `;
    return rows as Cycle[];
  }

  async getByLegislationId(legislationId: number): Promise<Cycle[]> {
    const rows = await this.sql`
      SELECT id, name, legislation_id, created_at
      FROM cycle
      WHERE legislation_id = ${legislationId}
      ORDER BY name
    `;
    return rows as Cycle[];
  }

  async getById(id: number): Promise<Cycle | null> {
    const [row] = await this.sql`
      SELECT id, name, legislation_id, created_at
      FROM cycle
      WHERE id = ${id}
    `;
    return (row as Cycle) ?? null;
  }

  async getByNameAndLegislation(name: string, legislationId: number): Promise<Cycle | null> {
    const [row] = await this.sql`
      SELECT id, name, legislation_id, created_at
      FROM cycle
      WHERE name = ${name} AND legislation_id = ${legislationId}
    `;
    return (row as Cycle) ?? null;
  }

  async update(id: number, dto: UpdateCycleDTO): Promise<Cycle | null> {
    const entries = Object.entries(dto).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return this.getById(id);

    const setClauses = entries
      .map(([_key], i) => `${_key} = $${i + 2}`)
      .join(", ");

    const values = entries.map(([, v]) => v);
    const query = `
      UPDATE cycle
      SET ${setClauses}
      WHERE id = $1
      RETURNING id, name, legislation_id, created_at
    `;

    const result = await this.sql.unsafe(query, [id, ...values]);
    const [row] = result;
    return (row as Cycle) ?? null;
  }

  async delete(id: number): Promise<Cycle | null> {
    const [row] = await this.sql`
      DELETE FROM cycle WHERE id = ${id}
      RETURNING id, name, legislation_id, created_at
    `;
    return (row as Cycle) ?? null;
  }

  async legislationExists(id: number): Promise<boolean> {
    const [row] = await this.sql`
      SELECT 1 FROM legislation WHERE id = ${id}
    `;
    return row !== undefined;
  }
}
