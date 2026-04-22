import { getAnthropicClient, estimateCostCents } from "./client";
import { leadAnalysisSchema, type LeadAnalysis } from "./schema";
import { env } from "@/lib/env";

export const SYSTEM_PROMPT = `Sei il critico-curatore di Ulilearn, una piattaforma italiana di
contenuti su arte, cinema e fotografia — editoriale, colta ma mai
accademica, rigorosa ma accessibile. Parli a chi ha uno sguardo, non a
chi ha un diploma.

Il tuo compito: dato l'handle Instagram di una persona (e, se disponibile,
una bio), restituire un'ANALISI del suo possibile sguardo estetico e una
SELEZIONE di autori — contemporanei e storici — che potrebbero risuonare
con lei. Non vedi le sue foto: sii onesto su questo limite, trasformandolo
in un gesto curatoriale. Lavori per suggestioni, non per induzione.

Tono: seconda persona singolare, calda ma non confidenziale. Frasi medie.
Mai elenchi puntati nel corpo dell'analisi. Mai gergo accademico. Mai
superlativi pubblicitari ("incredibile", "fantastico"). Ulilearn non grida.

Vincoli ferrei:
- Usa SOLO autori realmente esistenti e verificabili (Sergio Larrain, Luigi
  Ghirri, Sally Mann, Todd Hido, Rinko Kawauchi, Alec Soth, Guido Guidi,
  Nan Goldin, Stephen Shore, Saul Leiter, Vivian Maier, Henri Cartier-Bresson,
  Graciela Iturbide, Bernd & Hilla Becher, Raghubir Singh, Masahisa Fukase,
  Gabriele Basilico, Mario Giacomelli, ecc.). Mai inventare persone.
- Per ogni autore, motiva il matching con 1-2 frasi SPECIFICHE, non generiche.
  Evita "ti piacerà perché è bravo" o "è un maestro".
- Non parlare di abbonamento, prezzi, Ulilearn Plus. Quello è lavoro del banner.
- Mai inventare numeri di follower, premi, mostre.
- Se l'handle è vuoto, numerico puro, o chiaramente non-fotografico,
  produci un'analisi onesta nel campo "caveat" che apre domande invece di
  forzare una lettura. Suggerisci comunque autori (sarà una curatela ampia).

Output: chiama l'unico tool disponibile, "emit_analysis", passando un
oggetto JSON valido. Niente testo libero.`;

const TOOL_DEFINITION = {
  name: "emit_analysis",
  description:
    "Emetti l'analisi curatoriale in formato strutturato. Questo è l'unico modo di rispondere.",
  input_schema: {
    type: "object" as const,
    properties: {
      schemaVersion: { type: "integer", const: 1 },
      headline: {
        type: "string",
        description:
          "Titolo evocativo di una riga (10-160 char). Non descrittivo: suggestivo.",
      },
      intro: {
        type: "array",
        description: "2-4 paragrafi (80-1200 char ciascuno) di analisi estetica.",
        items: { type: "string" },
        minItems: 2,
        maxItems: 4,
      },
      contemporary: {
        type: "array",
        description: "2-3 autori contemporanei.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            years: {
              type: "string",
              description: "Periodo di attività o anno di nascita, es. '1965–'",
            },
            why: {
              type: "string",
              description: "40-400 char. Motivazione specifica del matching.",
            },
          },
          required: ["name", "why"],
        },
        minItems: 2,
        maxItems: 3,
      },
      historical: {
        type: "array",
        description: "2-3 autori storici (novecento o prima).",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            years: { type: "string" },
            why: { type: "string" },
          },
          required: ["name", "why"],
        },
        minItems: 2,
        maxItems: 3,
      },
      closing: {
        type: "string",
        description:
          "Un paragrafo finale (50-800 char): una direzione, un invito allo sguardo.",
      },
      caveat: {
        type: "string",
        description:
          "Opzionale: nota onesta se l'handle fornito è ambiguo o poco leggibile.",
      },
    },
    required: ["schemaVersion", "headline", "intro", "contemporary", "historical", "closing"],
  },
} as const;

export type AnalyzeInput = {
  email: string;
  instagramUrl: string;
  instagramHandle: string | null;
};

export type AnalyzeResult = {
  analysis: LeadAnalysis;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
};

export class LeadAnalysisError extends Error {
  code: "invalid_output" | "api_error" | "timeout";
  constructor(code: LeadAnalysisError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export async function analyzeInstagramProfile(
  input: AnalyzeInput,
): Promise<AnalyzeResult> {
  const userMessage = buildUserMessage(input);
  const model = env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  let response;
  try {
    response = await getAnthropicClient().messages.create({
      model,
      max_tokens: 2500,
      temperature: 0.85,
      system: SYSTEM_PROMPT,
      tools: [TOOL_DEFINITION],
      tool_choice: { type: "tool", name: TOOL_DEFINITION.name },
      messages: [{ role: "user", content: userMessage }],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new LeadAnalysisError("api_error", msg);
  }

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new LeadAnalysisError("invalid_output", "No tool_use block in response");
  }

  const parsed = leadAnalysisSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new LeadAnalysisError(
      "invalid_output",
      "Schema validation failed: " + JSON.stringify(parsed.error.flatten()),
    );
  }

  const tokensIn = response.usage.input_tokens;
  const tokensOut = response.usage.output_tokens;

  return {
    analysis: parsed.data,
    model,
    tokensIn,
    tokensOut,
    costCents: estimateCostCents(tokensIn, tokensOut),
  };
}

function buildUserMessage(input: AnalyzeInput): string {
  const handle = input.instagramHandle ?? "(non estratto)";
  return [
    `Ecco i dati inviati dall'utente:`,
    ``,
    `- URL profilo Instagram: ${input.instagramUrl}`,
    `- Handle estratto: ${handle}`,
    ``,
    `Produci l'analisi rispettando i vincoli del system prompt.`,
    `Ricorda: non vedi le foto, lavori per suggestione.`,
  ].join("\n");
}

/**
 * Normalize an Instagram URL into a handle. Returns null if the URL
 * doesn't look like an Instagram profile.
 */
export function extractInstagramHandle(url: string): string | null {
  const trimmed = url.trim();
  const match = trimmed.match(
    /^https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})\/?(?:\?.*)?$/,
  );
  return match ? match[1] ?? null : null;
}
