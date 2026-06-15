import { describe, expect, it, beforeEach } from "bun:test";
import { LegislationService } from "../src/modules/legislation/legislation.service";
import type { Legislation, CreateLegislationDTO, UpdateLegislationDTO } from "../src/modules/legislation/legislation.entity";
import type { ILegislationRepository } from "../src/modules/legislation/legislation.repository";

function createMockRepo(): ILegislationRepository {
  let store: Legislation[] = [];
  let nextId = 1;

  return {
    async create(dto: CreateLegislationDTO): Promise<Legislation> {
      const now = new Date();
      const item: Legislation = { id: nextId++, ...dto, created_at: now };
      store.push(item);
      return item;
    },

    async getAll(): Promise<Legislation[]> {
      return [...store];
    },

    async getById(id: number): Promise<Legislation | null> {
      return store.find(l => l.id === id) ?? null;
    },

    async getByName(name: string): Promise<Legislation | null> {
      return store.find(l => l.name === name) ?? null;
    },

    async update(id: number, dto: UpdateLegislationDTO): Promise<Legislation | null> {
      const idx = store.findIndex(l => l.id === id);
      if (idx === -1) return null;
      const updated = { ...store[idx]!, ...dto };
      store[idx] = updated;
      return updated;
    },

    async delete(id: number): Promise<Legislation | null> {
      const idx = store.findIndex(l => l.id === id);
      if (idx === -1) return null;
      const [removed] = store.splice(idx, 1);
      return removed!;
    },
  };
}

describe("LegislationService", () => {
  let service: LegislationService;
  let mockRepo: ILegislationRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new LegislationService(mockRepo);
  });

  describe("create", () => {
    it("inserts and returns a legislation with valid data", async () => {
      const result = await service.create({ name: "LOMLOE", start_year: 2020 });
      expect(result).not.toBeNull();
      expect(result!.name).toBe("LOMLOE");
      expect(result!.start_year).toBe(2020);
      expect(result!.id).toBeGreaterThan(0);
    });

    it("rejects empty name", async () => {
      expect(service.create({ name: "", start_year: 2020 })).rejects.toThrow("Name must be between 1 and 20 characters");
    });

    it("rejects name longer than 20 characters", async () => {
      expect(service.create({ name: "A".repeat(21), start_year: 2020 })).rejects.toThrow("Name must be between 1 and 20 characters");
    });

    it("rejects name that is only whitespace", async () => {
      expect(service.create({ name: "   ", start_year: 2020 })).rejects.toThrow("Name must be between 1 and 20 characters");
    });

    it("rejects start_year <= 1900", async () => {
      expect(service.create({ name: "LOE", start_year: 1900 })).rejects.toThrow("Start year must be greater than 1900");
    });

    it("rejects negative start_year", async () => {
      expect(service.create({ name: "LOE", start_year: -1 })).rejects.toThrow("Start year must be greater than 1900");
    });

    it("rejects duplicate name", async () => {
      await service.create({ name: "LOMLOE", start_year: 2020 });
      expect(service.create({ name: "LOMLOE", start_year: 2021 })).rejects.toThrow("Legislation with name 'LOMLOE' already exists");
    });
  });

  describe("getAll", () => {
    it("returns an empty array when no legislations exist", async () => {
      const result = await service.getAll();
      expect(result).toEqual([]);
    });

    it("returns all legislations", async () => {
      await service.create({ name: "LOE", start_year: 1990 });
      await service.create({ name: "LOMLOE", start_year: 2020 });
      const result = await service.getAll();
      expect(result).toHaveLength(2);
    });
  });

  describe("getById", () => {
    it("returns a legislation by id", async () => {
      const created = await service.create({ name: "LOMLOE", start_year: 2020 });
      const found = await service.getById(created!.id);
      expect(found).not.toBeNull();
      expect(found!.name).toBe("LOMLOE");
    });

    it("returns null when id does not exist", async () => {
      const result = await service.getById(999);
      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("updates name", async () => {
      const created = await service.create({ name: "LOMLOE", start_year: 2020 });
      const updated = await service.update(created!.id, { name: "LOMLOE-2" });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("LOMLOE-2");
      expect(updated!.start_year).toBe(2020);
    });

    it("updates start_year", async () => {
      const created = await service.create({ name: "LOMLOE", start_year: 2020 });
      const updated = await service.update(created!.id, { start_year: 2021 });
      expect(updated).not.toBeNull();
      expect(updated!.start_year).toBe(2021);
    });

    it("returns null when id does not exist", async () => {
      const result = await service.update(999, { name: "Nope" });
      expect(result).toBeNull();
    });

    it("rejects empty name on update", async () => {
      const created = await service.create({ name: "LOMLOE", start_year: 2020 });
      expect(service.update(created!.id, { name: "" })).rejects.toThrow("Name must be between 1 and 20 characters");
    });

    it("rejects name longer than 20 characters on update", async () => {
      const created = await service.create({ name: "LOMLOE", start_year: 2020 });
      expect(service.update(created!.id, { name: "A".repeat(21) })).rejects.toThrow("Name must be between 1 and 20 characters");
    });

    it("rejects start_year <= 1900 on update", async () => {
      const created = await service.create({ name: "LOMLOE", start_year: 2020 });
      expect(service.update(created!.id, { start_year: 1800 })).rejects.toThrow("Start year must be greater than 1900");
    });

    it("rejects duplicate name on update", async () => {
      await service.create({ name: "LOE", start_year: 1990 });
      const lomloe = await service.create({ name: "LOMLOE", start_year: 2020 });
      expect(service.update(lomloe!.id, { name: "LOE" })).rejects.toThrow("Legislation with name 'LOE' already exists");
    });
  });

  describe("delete", () => {
    it("removes a legislation and returns it", async () => {
      const created = await service.create({ name: "LOMLOE", start_year: 2020 });
      const removed = await service.delete(created!.id);
      expect(removed).not.toBeNull();
      expect(removed!.name).toBe("LOMLOE");
      const all = await service.getAll();
      expect(all).toHaveLength(0);
    });

    it("returns null when id does not exist", async () => {
      const result = await service.delete(999);
      expect(result).toBeNull();
    });
  });
});
