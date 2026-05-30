import { z } from 'zod';

export const ElementMappingSchema = z.array(z.object({
  sketchNumber: z.number(),
  domSelector: z.string(),
  componentClass: z.string(),
  screen: z.string(),
}));
