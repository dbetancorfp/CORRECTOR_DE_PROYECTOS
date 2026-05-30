import { z } from 'zod';

export const UISpecSchema = z.object({
  screens: z.array(z.object({
    id: z.string(),
    name: z.string(),
    route: z.string(),
    components: z.array(z.object({
      sketchNumber: z.number(),
      type: z.enum(['button', 'input', 'nav', 'list', 'card', 'modal', 'form', 'table']),
      props: z.record(z.unknown()),
      states: z.array(z.string()),
      interactions: z.array(z.object({
        event: z.string(),
        action: z.string(),
        linkedRequirement: z.string().optional(),
      })),
    })),
    dataNeeds: z.array(z.string()),
  })),
});
