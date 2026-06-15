import { Router } from "express";
import { LegislationService } from "./legislation.service";
import { LegislationController } from "./legislation.controller";
import type { ILegislationRepository } from "./legislation.repository";

export function createLegislationRouter(repo: ILegislationRepository): Router {
  const service = new LegislationService(repo);
  const controller = new LegislationController(service);
  const router = Router();

  router.post("/", (req, res) => controller.create(req, res));
  router.get("/", (req, res) => controller.getAll(req, res));
  router.get("/:id", (req, res) => controller.getById(req, res));
  router.put("/:id", (req, res) => controller.update(req, res));
  router.delete("/:id", (req, res) => controller.delete(req, res));

  return router;
}
