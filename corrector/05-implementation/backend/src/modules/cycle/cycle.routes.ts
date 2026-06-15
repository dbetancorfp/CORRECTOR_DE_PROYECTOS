import { Router } from "express";
import { CycleService } from "./cycle.service";
import { CycleController } from "./cycle.controller";
import type { ICycleRepository } from "./cycle.repository";

export function createCycleRouter(repo: ICycleRepository): Router {
  const service = new CycleService(repo);
  const controller = new CycleController(service);
  const router = Router();

  router.post("/", (req, res) => controller.create(req, res));
  router.get("/", (req, res) => controller.getAll(req, res));
  router.get("/:id", (req, res) => controller.getById(req, res));
  router.put("/:id", (req, res) => controller.update(req, res));
  router.delete("/:id", (req, res) => controller.delete(req, res));

  return router;
}
