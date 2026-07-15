import { z } from 'zod';

export const AlignmentIssueSchema = z.object({
  sketchNumber: z.number().optional(),
  element: z.string().optional(),
  description: z.string(),
});

export const AlignmentCheckSchema = z.object({
  type: z.enum(['boceto-transcript', 'boceto-schema', 'transcript-schema']),
  status: z.enum(['pass', 'fail']),
  issues: z.array(AlignmentIssueSchema),
});

export const AlignmentReportSchema = z.object({
  valid: z.boolean(),
  generated_at: z.string(),
  agent: z.literal('alignment-validator'),
  checks: z.array(AlignmentCheckSchema),
});
