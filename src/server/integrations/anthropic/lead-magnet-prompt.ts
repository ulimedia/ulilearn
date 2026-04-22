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

REGOLE SULLA SELEZIONE DI AUTORI (critiche — qui si gioca la tua credibilità):

- Mai ripetere lo stesso autore tra "contemporanei" e "storici".
- I 4-6 autori devono essere DIVERSI tra loro per approccio, geografia e
  linguaggio. Se suggerisci 3 fotografi di strada americani, hai fallito.
- Evita le scelte ovvie e inflazionate — i "nomi da calendario" che chiunque
  abbia fatto un corso base conosce. In particolare diffida di:
  Henri Cartier-Bresson, Vivian Maier, Helmut Newton, Sebastião Salgado,
  Steve McCurry, Robert Capa, Ansel Adams come prime scelte generiche.
  Puoi citarli SOLO se c'è un collegamento molto puntuale con quello che
  vedi nelle foto (es. un gesto, una luce, un'ossessione tematica specifica).
- Privilegia autori meno battuti ma reali e documentati: Luigi Ghirri,
  Guido Guidi, Gabriele Basilico, Mario Giacomelli, Mimmo Jodice, Franco Fontana,
  Ugo Mulas, Letizia Battaglia, Paolo Pellegrin, Massimo Vitali, Olivo Barbieri,
  Marina Ballo Charmet; Sergio Larrain, Graciela Iturbide, Paz Errázuriz,
  Raghubir Singh, Pablo Ortiz Monasterio, Daido Moriyama, Masahisa Fukase,
  Shomei Tomatsu, Rinko Kawauchi, Hiroshi Sugimoto, Rinko Kawauchi,
  Todd Hido, Alec Soth, Stephen Shore, Joel Meyerowitz, Saul Leiter,
  Sally Mann, Nan Goldin, Larry Sultan, Mark Steinmetz, Bryan Schutmaat,
  Mitch Epstein, William Eggleston, Joel Sternfeld, Mark Cohen, Nicholas Nixon,
  Bernd e Hilla Becher, August Sander, Eugène Atget, Michael Schmidt,
  Dirk Braeckman, JH Engström, Anders Petersen, Jacob Aue Sobol,
  Trent Parke, Bill Henson, Narelle Autio, Max Pam, Katrin Koenning,
  Debi Cornwall, Lynne Cohen, Seydou Keïta, Malick Sidibé, Hélène Amouzou.
  Questa è una lista NON esaustiva — sentiti libero di citare altri nomi
  realmente esistenti e documentabili, purché non siano invenzioni.
- Per ogni autore, la motivazione (campo "why") deve collegare esplicitamente
  almeno UN dettaglio che hai osservato nelle foto. Non "ti piacerà perché è
  un maestro" ma "la tua ricorrenza del verde umido e dei campi vuoti mi
  ricorda il suo lavoro sugli argini di Po".
- Mai inventare date, premi, libri, numeri di follower.
- Mai parlare di abbonamento, prezzi, Ulilearn Plus. Quello è lavoro del banner.

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
  /**
   * Pre-downloaded images, same order as scraped.latestPosts.
   * Each entry is null when the download failed. If undefined, we download
   * them inside this function. Pass downloaded images to avoid duplicate
   * fetches when the caller needs the bytes for something else (e.g. upload
   * to Supabase Storage).
   */
  preloadedImages?: Array<FetchedImage | null>;
};

export type DownloadedImages = Array<FetchedImage | null>;

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
    ? await buildVisionUserContent(
        input.scraped!,
        input.instagramUrl,
        input.preloadedImages,
      )
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

  // Dedupe authors: if the same name appears in both contemporary and historical,
  // drop it from historical (keep the first occurrence).
  const seenNames = new Set<string>();
  const uniqueContemporary = parsed.data.contemporary.filter((a) => {
    const key = a.name.toLowerCase().trim();
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });
  const uniqueHistorical = parsed.data.historical.filter((a) => {
    const key = a.name.toLowerCase().trim();
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });
  const deduped = {
    ...parsed.data,
    contemporary: uniqueContemporary,
    historical: uniqueHistorical,
  };

  const tokensIn = response.usage.input_tokens;
  const tokensOut = response.usage.output_tokens;

  return {
    analysis: deduped,
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
  preloaded: DownloadedImages | undefined,
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
  intro.push(`Qui sotto ti mostro le ultime foto pubblicate.`);
  intro.push(
    `Osservale davvero (luce, palette, composizione, ricorrenze) e costruisci l'analisi.`,
  );

  const blocks: Anthropic.MessageParam["content"] = [
    { type: "text", text: intro.join("\n") },
  ];

  const downloaded =
    preloaded ?? (await downloadInstagramImages(scraped.latestPosts));

  let added = 0;
  downloaded.forEach((img, i) => {
    if (!img) return;
    blocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType,
        data: img.data,
      },
    });
    const caption = scraped.latestPosts[i]?.caption;
    if (caption) {
      const cap = caption.slice(0, 600).replace(/\n+/g, " ");
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

export type FetchedImage = {
  data: string; // base64
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  bytes: Buffer;
};

/**
 * Download Instagram post images server-side, in parallel. Returns an array
 * aligned with `posts` — each entry is null if the download failed.
 */
export async function downloadInstagramImages(
  posts: ScrapedInstagramProfile["latestPosts"],
): Promise<DownloadedImages> {
  return Promise.all(
    posts.map(async (post) => {
      try {
        return await fetchImageAsBase64(post.imageUrl);
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
}

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
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > 3_600_000) {
    throw new Error(`image too large (${buf.byteLength} bytes)`);
  }
  return { data: buf.toString("base64"), mediaType, bytes: buf };
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
