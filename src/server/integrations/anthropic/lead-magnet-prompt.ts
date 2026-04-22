import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, estimateCostCents } from "./client";
import { leadAnalysisSchema, type LeadAnalysis } from "./schema";
import { env } from "@/lib/env";
import type { ScrapedInstagramProfile } from "@/server/integrations/apify/client";

export const SYSTEM_PROMPT_BLIND = `Sei il critico-curatore di Ulilearn, una piattaforma italiana di
contenuti su arte, cinema e fotografia — editoriale, colta ma mai
accademica, rigorosa ma accessibile. Parli a chi ha uno sguardo, non a
chi ha un diploma.

Il tuo compito: dato l'handle Instagram di una persona, restituire
un'ANALISI del suo possibile sguardo estetico e una SELEZIONE di autori —
contemporanei e storici — che potrebbero risuonare con lei. Non vedi le
sue foto: sii onesto su questo limite, trasformandolo in un gesto
curatoriale. Lavori per suggestioni, non per induzione.

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
  produci un'analisi onesta nel campo "caveat".

Output: chiama l'unico tool disponibile, "emit_analysis", passando un
oggetto JSON valido. Niente testo libero.`;

export const SYSTEM_PROMPT_VISION = `Sei il critico-curatore di Ulilearn, una piattaforma italiana di
contenuti su arte, cinema e fotografia — editoriale, colta ma mai
accademica, rigorosa ma accessibile. Parli a chi ha uno sguardo, non a
chi ha un diploma.

Ti vengono mostrate le ULTIME FOTO pubblicate da una persona su Instagram,
insieme a bio e caption. Il tuo compito: analizzare davvero quelle immagini —
palette, composizione, luce, temi ricorrenti, registro emotivo — e costruire
un'ANALISI del suo sguardo + una SELEZIONE di autori (contemporanei e storici)
che potrebbero risuonare con lei.

Non sei un algoritmo. Sei un curatore che guarda. Cita dettagli SPECIFICI che
vedi nelle foto (una luce, un'inquadratura, una ripetizione, una palette) per
sostenere le tue osservazioni. Senza questi dettagli, il testo diventa generico
e l'utente perde fiducia.

Tono: seconda persona singolare, calda ma non confidenziale. Frasi medie.
Mai elenchi puntati nel corpo dell'analisi. Mai gergo accademico. Mai
superlativi pubblicitari ("incredibile", "fantastico"). Ulilearn non grida.

Vincoli ferrei:
- Usa SOLO autori realmente esistenti e verificabili (Sergio Larrain, Luigi
  Ghirri, Sally Mann, Todd Hido, Rinko Kawauchi, Alec Soth, Guido Guidi,
  Nan Goldin, Stephen Shore, Saul Leiter, Vivian Maier, Henri Cartier-Bresson,
  Graciela Iturbide, Bernd & Hilla Becher, Raghubir Singh, Masahisa Fukase,
  Gabriele Basilico, Mario Giacomelli, ecc.). Mai inventare persone.
- Per ogni autore, motiva il matching con 1-2 frasi SPECIFICHE che colleghino
  l'autore a qualcosa che hai visto nelle foto. Evita "ti piacerà perché è bravo".
- Non parlare di abbonamento, prezzi, Ulilearn Plus. Quello è lavoro del banner.
- Mai inventare numeri di follower, premi, mostre.
- Se le foto sono poche, selfie/lifestyle, screenshot o non fotografiche, nel
  campo "caveat" dichiara il limite e lavora comunque per suggestione.

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
          "Opzionale: nota onesta se il materiale visto è povero o ambiguo.",
      },
    },
    required: ["schemaVersion", "headline", "intro", "contemporary", "historical", "closing"],
  },
} as const;

export type AnalyzeInput = {
  email: string;
  instagramUrl: string;
  instagramHandle: string | null;
  /** Populated if scraping succeeded; null when private/blind fallback. */
  scraped?: ScrapedInstagramProfile | null;
};

export type AnalyzeResult = {
  analysis: LeadAnalysis;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  /** True if the call used image content blocks (Claude Vision). */
  usedVision: boolean;
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
  const model = env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  const useVision =
    !!input.scraped && input.scraped.latestPosts.length > 0;

  const systemPrompt = useVision ? SYSTEM_PROMPT_VISION : SYSTEM_PROMPT_BLIND;
  const userContent = useVision
    ? await buildVisionUserContent(input.scraped!, input.instagramUrl)
    : [{ type: "text" as const, text: buildBlindUserMessage(input) }];

  let response;
  try {
    response = await getAnthropicClient().messages.create({
      model,
      max_tokens: 2500,
      temperature: 0.85,
      system: systemPrompt,
      tools: [TOOL_DEFINITION],
      tool_choice: { type: "tool", name: TOOL_DEFINITION.name },
      messages: [{ role: "user", content: userContent }],
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
    usedVision: useVision,
  };
}

function buildBlindUserMessage(input: AnalyzeInput): string {
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

async function buildVisionUserContent(
  scraped: ScrapedInstagramProfile,
  instagramUrl: string,
): Promise<Anthropic.MessageParam["content"]> {
  const intro: string[] = [
    `Profilo Instagram da analizzare:`,
    ``,
    `- Handle: @${scraped.handle}`,
    `- URL: ${instagramUrl}`,
  ];
  if (scraped.fullName) intro.push(`- Nome: ${scraped.fullName}`);
  if (scraped.biography) intro.push(`- Bio: ${scraped.biography.replace(/\n/g, " ")}`);
  if (scraped.postsCount) intro.push(`- Post totali: ${scraped.postsCount}`);
  if (scraped.followersCount) intro.push(`- Follower: ${scraped.followersCount}`);
  intro.push(``);
  intro.push(
    `Qui sotto ti mostro le ultime foto pubblicate.`,
  );
  intro.push(
    `Osservale davvero (luce, palette, composizione, ricorrenze) e costruisci l'analisi.`,
  );

  const blocks: Anthropic.MessageParam["content"] = [
    { type: "text", text: intro.join("\n") },
  ];

  // Fetch each image server-side and pass as base64. Anthropic rejects
  // `source.type: "url"` for Instagram CDN URLs because of robots.txt.
  // We parallelize the downloads and drop any image that fails.
  const downloads = await Promise.all(
    scraped.latestPosts.map(async (post) => {
      try {
        const img = await fetchImageAsBase64(post.imageUrl);
        return { post, img };
      } catch (e) {
        console.warn(
          `[leadMagnet] image fetch failed for ${post.imageUrl}: ${
            e instanceof Error ? e.message : "unknown"
          }`,
        );
        return null;
      }
    }),
  );

  let added = 0;
  downloads.forEach((entry, i) => {
    if (!entry) return;
    blocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: entry.img.mediaType,
        data: entry.img.data,
      },
    });
    if (entry.post.caption) {
      const cap = entry.post.caption.slice(0, 600).replace(/\n+/g, " ");
      blocks.push({
        type: "text",
        text: `Caption foto ${i + 1}: ${cap}`,
      });
    }
    added += 1;
  });

  blocks.push({
    type: "text",
    text:
      added > 0
        ? "Ora produci l'analisi rispettando i vincoli del system prompt."
        : "Non sono riuscito a scaricare le foto. Produci l'analisi più onesta possibile, dichiarando il limite nel campo caveat.",
  });

  return blocks;
}

type FetchedImage = {
  data: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
};

async function fetchImageAsBase64(url: string): Promise<FetchedImage> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      accept: "image/webp,image/jpeg,image/png,image/*,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  let mediaType: FetchedImage["mediaType"] = "image/jpeg";
  if (contentType.includes("png")) mediaType = "image/png";
  else if (contentType.includes("webp")) mediaType = "image/webp";
  else if (contentType.includes("gif")) mediaType = "image/gif";
  const buf = await res.arrayBuffer();
  // Cap to ~4MB per image (Anthropic limit is 5MB per image, and base64
  // expands by ~33%; keeping raw bytes under 3.5MB is a safe proxy).
  if (buf.byteLength > 3_600_000) {
    throw new Error(`image too large (${buf.byteLength} bytes)`);
  }
  const data = Buffer.from(buf).toString("base64");
  return { data, mediaType };
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
