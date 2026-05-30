import { z } from 'zod';

export const ReconciliationSchema = z.object({
  valid: z.boolean(),
  boceto_numbers: z.array(z.number()),
  spec_numbers: z.array(z.number()),
  orphaned_sketch_elements: z.array(z.number()),
  orphaned_spec_rules: z.array(z.number()),
  notes: z.string(),
});
