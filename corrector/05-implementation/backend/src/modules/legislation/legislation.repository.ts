import type { Legislation, CreateLegislationDTO, UpdateLegislationDTO } from "./legislation.entity";

export interface ILegislationRepository {
  create(dto: CreateLegislationDTO): Promise<Legislation>;
  getAll(): Promise<Legislation[]>;
  getById(id: number): Promise<Legislation | null>;
  getByName(name: string): Promise<Legislation | null>;
  update(id: number, dto: UpdateLegislationDTO): Promise<Legislation | null>;
  delete(id: number): Promise<Legislation | null>;
}

export class PostgresLegislationRepository implements ILegislationRepository {
  private sql: Bun.SQL;

  constructor() {
    this.sql = new Bun.SQL({
      url: process.env.DATABASE_URL ?? "postgres://corrector:corrector@localhost:5432/corrector",
    });
  }

  async create(dto: CreateLegislationDTO): Promise<Legislation> {
    const [row] = await this.sql`
      INSERT INTO legislation (name, start_year)
      VALUES (${dto.name}, ${dto.start_year})
      RETURNING id, name, start_year, created_at
    `;
    return row as Legislation;
  }

  async getAll(): Promise<Legislation[]> {
    const rows = await this.sql`
      SELECT id, name, start_year, created_at
      FROM legislation
      ORDER BY name
    `;
    return rows as Legislation[];
  }

  async getById(id: number): Promise<Legislation | null> {
    const [row] = await this.sql`
      SELECT id, name, start_year, created_at
      FROM legislation
      WHERE id = ${id}
    `;
    return (row as Legislation) ?? null;
  }

  async getByName(name: string): Promise<Legislation | null> {
    const [row] = await this.sql`
      SELECT id, name, start_year, created_at
      FROM legislation
      WHERE name = ${name}
    `;
    return (row as Legislation) ?? null;
  }

  async update(id: number, dto: UpdateLegislationDTO): Promise<Legislation | null> {
    const entries = Object.entries(dto).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return this.getById(id);

    const setClauses = entries
      .map(([key], i) => `${key} = $${i + 2}`)
      .join(", ");

    const values = entries.map(([, v]) => v);
    const query = `
      UPDATE legislation
      SET ${setClauses}
      WHERE id = $1
      RETURNING id, name, start_year, created_at
    `;

    const result = await this.sql.unsafe(query, [id, ...values]);
    const [row] = result;
    return (row as Legislation) ?? null;
  }

  async delete(id: number): Promise<Legislation | null> {
    const [row] = await this.sql`
      DELETE FROM legislation WHERE id = ${id}
      RETURNING id, name, start_year, created_at
    `;
    return (row as Legislation) ?? null;
  }
}
