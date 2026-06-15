import type { Request, Response } from "express";
import { CycleService } from "./cycle.service";

function errorStatus(message: string): number {
  if (message.includes("already exists")) return 409;
  if (message.includes("must be") || message.includes("between") || message.includes("does not exist")) return 400;
  return 500;
}

export class CycleController {
  constructor(private readonly service: CycleService) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, legislation_id } = req.body;

      if (typeof name !== "string" || typeof legislation_id !== "number") {
        res.status(400).json({ error: "name (string) and legislation_id (number) are required" });
        return;
      }

      const cycle = await this.service.create({ name, legislation_id });
      res.status(201).json(cycle);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(errorStatus(message)).json({ error: message });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const legislationIdParam = req.query.legislation_id;
      if (legislationIdParam !== undefined) {
        const legislationId = parseInt(legislationIdParam as string, 10);
        if (isNaN(legislationId)) {
          res.status(400).json({ error: "legislation_id must be a number" });
          return;
        }
        const cycles = await this.service.getByLegislationId(legislationId);
        res.json(cycles);
        return;
      }

      const cycles = await this.service.getAll();
      res.json(cycles);
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id ?? "", 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "id must be a number" });
        return;
      }

      const cycle = await this.service.getById(id);
      if (!cycle) {
        res.status(404).json({ error: "Cycle not found" });
        return;
      }

      res.json(cycle);
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id ?? "", 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "id must be a number" });
        return;
      }

      const { name, legislation_id } = req.body;
      if (name !== undefined && typeof name !== "string") {
        res.status(400).json({ error: "name must be a string" });
        return;
      }
      if (legislation_id !== undefined && typeof legislation_id !== "number") {
        res.status(400).json({ error: "legislation_id must be a number" });
        return;
      }

      const cycle = await this.service.update(id, { name, legislation_id });
      if (!cycle) {
        res.status(404).json({ error: "Cycle not found" });
        return;
      }

      res.json(cycle);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(errorStatus(message)).json({ error: message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id ?? "", 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "id must be a number" });
        return;
      }

      const cycle = await this.service.delete(id);
      if (!cycle) {
        res.status(404).json({ error: "Cycle not found" });
        return;
      }

      res.status(204).send();
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
