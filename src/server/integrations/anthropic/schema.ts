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

// ============================================================================
// Project-brief lead magnet: user describes a photographic project idea,
// Claude (with web search) returns a critical reading + similar real projects.
// ============================================================================

const similarProject = z.object({
  title: z.string().min(2).max(160),
  author: z.string().min(2).max(120),
  years: z.string().max(40).optional(),
  url: z.string().url().max(500).optional(),
  why: z.string().min(60).max(600),
});

export const projectAnalysisSchema = z.object({
  schemaVersion: z.literal(1),
  headline: z.string().min(10).max(160),
  reading: z.array(z.string().min(80).max(1200)).min(2).max(4),
  strengths: z.array(z.string().min(40).max(400)).min(1).max(4),
  risks: z.array(z.string().min(40).max(400)).min(1).max(4),
  nextSteps: z.array(z.string().min(40).max(400)).min(2).max(5),
  similarProjects: z.array(similarProject).min(3).max(6),
  closing: z.string().min(50).max(800),
  caveat: z.string().max(400).optional(),
});

export type ProjectAnalysis = z.infer<typeof projectAnalysisSchema>;
