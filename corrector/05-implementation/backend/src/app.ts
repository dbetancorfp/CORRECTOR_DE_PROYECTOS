import express from "express";
import { createLegislationRouter } from "./modules/legislation/legislation.routes";
import { createCycleRouter } from "./modules/cycle/cycle.routes";
import { errorHandler } from "./middleware/error-handler";
import type { ILegislationRepository } from "./modules/legislation/legislation.repository";
import type { ICycleRepository } from "./modules/cycle/cycle.repository";

export interface AppRepos {
  legislationRepo: ILegislationRepository;
  cycleRepo: ICycleRepository;
}

export function createApp(repos: AppRepos): express.Application {
  const app = express();

  app.use(express.json());
  app.use("/api/legislation", createLegislationRouter(repos.legislationRepo));
  app.use("/api/cycle", createCycleRouter(repos.cycleRepo));
  app.use(errorHandler);

  return app;
}
