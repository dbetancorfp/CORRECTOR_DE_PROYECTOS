import type { Request, Response } from "express";
import { LegislationService } from "./legislation.service";

export class LegislationController {
  constructor(private readonly service: LegislationService) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, start_year } = req.body;

      if (typeof name !== "string" || typeof start_year !== "number") {
        res.status(400).json({ error: "name (string) and start_year (number) are required" });
        return;
      }

      const legislation = await this.service.create({ name, start_year });
      res.status(201).json(legislation);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      const status = message.includes("already exists") ? 409
        : message.includes("must be") || message.includes("between") ? 400
        : 500;
      res.status(status).json({ error: message });
    }
  }

  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const legislations = await this.service.getAll();
      res.json(legislations);
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

      const legislation = await this.service.getById(id);
      if (!legislation) {
        res.status(404).json({ error: "Legislation not found" });
        return;
      }

      res.json(legislation);
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

      const { name, start_year } = req.body;
      if (name !== undefined && typeof name !== "string") {
        res.status(400).json({ error: "name must be a string" });
        return;
      }
      if (start_year !== undefined && typeof start_year !== "number") {
        res.status(400).json({ error: "start_year must be a number" });
        return;
      }

      const legislation = await this.service.update(id, { name, start_year });
      if (!legislation) {
        res.status(404).json({ error: "Legislation not found" });
        return;
      }

      res.json(legislation);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      const status = message.includes("already exists") ? 409
        : message.includes("must be") || message.includes("between") ? 400
        : 500;
      res.status(status).json({ error: message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id ?? "", 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "id must be a number" });
        return;
      }

      const legislation = await this.service.delete(id);
      if (!legislation) {
        res.status(404).json({ error: "Legislation not found" });
        return;
      }

      res.status(204).send();
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
