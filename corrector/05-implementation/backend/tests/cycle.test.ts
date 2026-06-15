import { describe, expect, it, beforeEach } from "bun:test";
import { CycleService } from "../src/modules/cycle/cycle.service";
import type { Cycle, CreateCycleDTO, UpdateCycleDTO } from "../src/modules/cycle/cycle.entity";
import type { ICycleRepository } from "../src/modules/cycle/cycle.repository";

function createMockRepo(legislationIds: number[] = [1, 2]): ICycleRepository {
  let store: Cycle[] = [];
  let nextId = 1;

  return {
    async create(dto: CreateCycleDTO): Promise<Cycle> {
      const now = new Date();
      const item: Cycle = { id: nextId++, ...dto, created_at: now };
      store.push(item);
      return item;
    },

    async getAll(): Promise<Cycle[]> {
      return [...store];
    },

    async getByLegislationId(legislationId: number): Promise<Cycle[]> {
      return store.filter(c => c.legislation_id === legislationId);
    },

    async getById(id: number): Promise<Cycle | null> {
      return store.find(c => c.id === id) ?? null;
    },

    async getByNameAndLegislation(name: string, legislationId: number): Promise<Cycle | null> {
      return store.find(c => c.name === name && c.legislation_id === legislationId) ?? null;
    },

    async update(id: number, dto: UpdateCycleDTO): Promise<Cycle | null> {
      const idx = store.findIndex(c => c.id === id);
      if (idx === -1) return null;
      const updated = { ...store[idx]!, ...dto };
      store[idx] = updated;
      return updated;
    },

    async delete(id: number): Promise<Cycle | null> {
      const idx = store.findIndex(c => c.id === id);
      if (idx === -1) return null;
      const [removed] = store.splice(idx, 1);
      return removed!;
    },

    async legislationExists(id: number): Promise<boolean> {
      return legislationIds.includes(id);
    },
  };
}

describe("CycleService", () => {
  let service: CycleService;
  let mockRepo: ICycleRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new CycleService(mockRepo);
  });

  describe("create", () => {
    it("creates a cycle with valid data", async () => {
      const result = await service.create({ name: "DAW", legislation_id: 1 });
      expect(result).not.toBeNull();
      expect(result!.name).toBe("DAW");
      expect(result!.legislation_id).toBe(1);
      expect(result!.id).toBeGreaterThan(0);
    });

    it("rejects empty name", async () => {
      expect(service.create({ name: "", legislation_id: 1 })).rejects.toThrow(
        "Cycle name must be between 1 and 120 characters",
      );
    });

    it("rejects name longer than 120 characters", async () => {
      expect(service.create({ name: "A".repeat(121), legislation_id: 1 })).rejects.toThrow(
        "Cycle name must be between 1 and 120 characters",
      );
    });

    it("rejects name that is only whitespace", async () => {
      expect(service.create({ name: "   ", legislation_id: 1 })).rejects.toThrow(
        "Cycle name must be between 1 and 120 characters",
      );
    });

    it("rejects non-integer legislation_id", async () => {
      expect(service.create({ name: "DAW", legislation_id: 1.5 })).rejects.toThrow(
        "legislation_id must be a positive integer",
      );
    });

    it("rejects legislation_id <= 0", async () => {
      expect(service.create({ name: "DAW", legislation_id: 0 })).rejects.toThrow(
        "legislation_id must be a positive integer",
      );
    });

    it("rejects legislation_id that does not exist", async () => {
      expect(service.create({ name: "DAW", legislation_id: 999 })).rejects.toThrow(
        "Legislation with id 999 does not exist",
      );
    });

    it("rejects duplicate name under same legislation", async () => {
      await service.create({ name: "DAW", legislation_id: 1 });
      expect(service.create({ name: "DAW", legislation_id: 1 })).rejects.toThrow(
        "Cycle 'DAW' already exists under legislation 1",
      );
    });

    it("allows same name under different legislation", async () => {
      await service.create({ name: "DAW", legislation_id: 1 });
      const result = await service.create({ name: "DAW", legislation_id: 2 });
      expect(result).not.toBeNull();
      expect(result!.name).toBe("DAW");
      expect(result!.legislation_id).toBe(2);
    });
  });

  describe("getAll", () => {
    it("returns empty array when no cycles", async () => {
      const result = await service.getAll();
      expect(result).toEqual([]);
    });

    it("returns all cycles", async () => {
      await service.create({ name: "DAW", legislation_id: 1 });
      await service.create({ name: "DAM", legislation_id: 1 });
      const result = await service.getAll();
      expect(result).toHaveLength(2);
    });
  });

  describe("getByLegislationId", () => {
    it("returns cycles filtered by legislation_id", async () => {
      await service.create({ name: "DAW", legislation_id: 1 });
      await service.create({ name: "DAM", legislation_id: 1 });
      await service.create({ name: "ASIR", legislation_id: 2 });
      const result = await service.getByLegislationId(1);
      expect(result).toHaveLength(2);
    });
  });

  describe("getById", () => {
    it("returns a cycle by id", async () => {
      const created = await service.create({ name: "DAW", legislation_id: 1 });
      const found = await service.getById(created!.id);
      expect(found).not.toBeNull();
      expect(found!.name).toBe("DAW");
    });

    it("returns null when not found", async () => {
      const result = await service.getById(999);
      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("updates name", async () => {
      const created = await service.create({ name: "DAW", legislation_id: 1 });
      const updated = await service.update(created!.id, { name: "DAW-v2" });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("DAW-v2");
    });

    it("updates legislation_id", async () => {
      const created = await service.create({ name: "DAW", legislation_id: 1 });
      const updated = await service.update(created!.id, { legislation_id: 2 });
      expect(updated).not.toBeNull();
      expect(updated!.legislation_id).toBe(2);
    });

    it("returns null when id does not exist", async () => {
      const result = await service.update(999, { name: "Nope" });
      expect(result).toBeNull();
    });

    it("rejects empty name on update", async () => {
      const created = await service.create({ name: "DAW", legislation_id: 1 });
      expect(service.update(created!.id, { name: "" })).rejects.toThrow(
        "Cycle name must be between 1 and 120 characters",
      );
    });

    it("rejects non-integer legislation_id on update", async () => {
      const created = await service.create({ name: "DAW", legislation_id: 1 });
      expect(service.update(created!.id, { legislation_id: 1.5 })).rejects.toThrow(
        "legislation_id must be a positive integer",
      );
    });

    it("rejects legislation_id that does not exist on update", async () => {
      const created = await service.create({ name: "DAW", legislation_id: 1 });
      expect(service.update(created!.id, { legislation_id: 999 })).rejects.toThrow(
        "Legislation with id 999 does not exist",
      );
    });

    it("rejects duplicate name on update", async () => {
      await service.create({ name: "DAW", legislation_id: 1 });
      const dam = await service.create({ name: "DAM", legislation_id: 1 });
      expect(service.update(dam!.id, { name: "DAW" })).rejects.toThrow(
        "Cycle 'DAW' already exists under legislation 1",
      );
    });
  });

  describe("delete", () => {
    it("removes a cycle and returns it", async () => {
      const created = await service.create({ name: "DAW", legislation_id: 1 });
      const removed = await service.delete(created!.id);
      expect(removed).not.toBeNull();
      expect(removed!.name).toBe("DAW");
      const all = await service.getAll();
      expect(all).toHaveLength(0);
    });

    it("returns null when id does not exist", async () => {
      const result = await service.delete(999);
      expect(result).toBeNull();
    });
  });
});
