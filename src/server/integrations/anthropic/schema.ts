import { z } from "zod";

const authorSuggestion = z.object({
  name: z.string().min(2).max(80),
  years: z.string().max(30).optional(),
  why: z.string().min(40).max(400),
});

export const leadAnalysisSchema = z.object({
  schemaVersion: z.literal(1),
  headline: z.string().min(10).max(160),
  intro: z.array(z.string().min(80).max(1200)).min(2).max(4),
  contemporary: z.array(authorSuggestion).min(2).max(3),
  historical: z.array(authorSuggestion).min(2).max(3),
  closing: z.string().min(50).max(800),
  caveat: z.string().max(400).optional(),
});

export type LeadAnalysis = z.infer<typeof leadAnalysisSchema>;
