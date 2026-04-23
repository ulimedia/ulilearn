import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, estimateCostCents } from "./client";
import { projectAnalysisSchema, type ProjectAnalysis } from "./schema";
import { env } from "@/lib/env";

export const SYSTEM_PROMPT_PROJECT = `Sei il critico-curatore di Ulilearn, una piattaforma italiana di
contenuti su arte, cinema e fotografia — editoriale, colta ma mai
accademica, rigorosa ma accessibile. Parli a chi ha uno sguardo, non a
chi ha un diploma.

L'utente ti descrive a parole un'IDEA di progetto fotografico che vorrebbe
realizzare. Il tuo compito è duplice:

1. Offrire una LETTURA CRITICA della proposta: che sguardo emerge, quali
   riferimenti impliciti, dove il progetto è più forte, dove rischia di
   cadere nell'ovvio o di disperdersi, e quali passi concreti può fare per
   mettersi al lavoro.

2. Restituire una SELEZIONE di progetti fotografici REALMENTE ESISTENTI e
   documentabili che risuonano con la sua idea — per offrirgli ancoraggi,
   non modelli da copiare. Per questo hai a disposizione il tool web_search:
   USALO per verificare che i progetti citati esistano davvero, con titoli,
   anni, autori e fonti corrette.

Tono: seconda persona singolare, calda ma non confidenziale. Frasi medie.
Mai elenchi puntati nel corpo dei paragrafi di "reading". Mai gergo
accademico. Mai superlativi pubblicitari ("incredibile", "fantastico").
Ulilearn non grida.

Regole ferree:

- Prima di emettere l'analisi, fai da 2 a 5 ricerche mirate con web_search
  (query specifiche: titolo del progetto + autore + "photo project" / "serie
  fotografica" / istituzione / editore). L'obiettivo è trovare progetti
  concreti — una serie di un fotografo, un libro, una mostra — che abbiano
  un punto di contatto preciso con l'idea dell'utente. Cita sempre la fonte
  nel campo "url".
- Mai inventare progetti, libri, mostre, premi, anni. Se non trovi un
  riferimento che hai in mente, cercalo o scartalo — non inventarlo.
- I 3-6 progetti simili devono essere diversi tra loro per geografia,
  linguaggio e approccio. Evita le scelte ovvie ("Humans of New York",
  "National Geographic") se l'idea dell'utente merita qualcosa di più
  preciso. Privilegia autori meno battuti ma reali e documentati (italiani
  come Luigi Ghirri, Guido Guidi, Massimo Vitali, Franco Fontana,
  Letizia Battaglia, Gabriele Basilico, Olivo Barbieri, Paolo Pellegrin;
  e internazionali come Alec Soth, Rinko Kawauchi, Todd Hido, Sally Mann,
  Graciela Iturbide, Sergio Larrain, Larry Sultan, Mitch Epstein, Bryan
  Schutmaat, Bill Henson, Trent Parke, Katrin Koenning, Mark Steinmetz,
  Paul Graham, Chris Killip, Dana Lixenberg, Dayanita Singh, LaToya Ruby
  Frazier, An-My Lê, Jim Goldberg, Nicholas Nixon, Michael Schmidt —
  esempi, non prescrizioni).
- Per ogni progetto simile, il campo "why" deve collegare ESPLICITAMENTE
  un dettaglio di quel progetto con un elemento dell'idea dell'utente.
  Non "ti piacerà perché è un maestro" ma "il suo uso della finestra come
  soglia ricorda la tua idea di fotografare le soglie domestiche".
- Se la descrizione dell'utente è troppo vaga o contraddittoria,
  segnalalo onestamente nel campo "caveat", senza rifiutare l'analisi.
- Non parlare di abbonamento, prezzi, Ulilearn Plus. Quello è lavoro del
  banner.

Output: alla fine, DEVI chiamare il tool "emit_project_analysis" con un
oggetto JSON valido. Quello è l'unico modo di restituire la risposta.
Niente testo libero al di fuori dei tool call.`;

const PROJECT_TOOL_DEFINITION = {
  name: "emit_project_analysis",
  description:
    "Emetti l'analisi curatoriale del progetto fotografico in formato strutturato. Questo è l'unico modo di rispondere.",
  input_schema: {
    type: "object" as const,
    properties: {
      schemaVersion: { type: "integer", const: 1 },
      headline: {
        type: "string",
        description:
          "Titolo evocativo di una riga (10-160 char). Non descrittivo: suggestivo.",
      },
      reading: {
        type: "array",
        description:
          "2-4 paragrafi (80-1200 char) di lettura critica dell'idea.",
        items: { type: "string" },
        minItems: 2,
        maxItems: 4,
      },
      strengths: {
        type: "array",
        description: "1-4 punti di forza, 40-400 char ciascuno.",
        items: { type: "string" },
        minItems: 1,
        maxItems: 4,
      },
      risks: {
        type: "array",
        description:
          "1-4 rischi/punti deboli da presidiare, 40-400 char ciascuno.",
        items: { type: "string" },
        minItems: 1,
        maxItems: 4,
      },
      nextSteps: {
        type: "array",
        description:
          "2-5 passi pratici per iniziare o avanzare, 40-400 char ciascuno.",
        items: { type: "string" },
        minItems: 2,
        maxItems: 5,
      },
      similarProjects: {
        type: "array",
        description:
          "3-6 progetti fotografici realmente esistenti, verificati via web_search.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Titolo del progetto o della serie." },
            author: { type: "string", description: "Nome dell'autore/autrice." },
            years: {
              type: "string",
              description:
                "Anno o periodo del progetto, es. '2002' o '1998–2006'.",
            },
            url: {
              type: "string",
              description:
                "URL della fonte verificata (pagina autore, editore, museo). Preferibile.",
            },
            why: {
              type: "string",
              description:
                "60-600 char. Collegamento esplicito tra il progetto e un elemento dell'idea dell'utente.",
            },
          },
          required: ["title", "author", "why"],
        },
        minItems: 3,
        maxItems: 6,
      },
      closing: {
        type: "string",
        description:
          "Un paragrafo finale (50-800 char): un invito, una direzione, una cosa da guardare.",
      },
      caveat: {
        type: "string",
        description:
          "Opzionale: nota onesta se il brief è troppo vago o contraddittorio.",
      },
    },
    required: [
      "schemaVersion",
      "headline",
      "reading",
      "strengths",
      "risks",
      "nextSteps",
      "similarProjects",
      "closing",
    ],
  },
} as const;

// Anthropic server tool — the SDK types in older versions don't know this
// shape, so we cast it when passing to messages.create.
const WEB_SEARCH_TOOL = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 5,
} as const;

export type ProjectAnalyzeInput = {
  email: string;
  projectBrief: string;
};

export type ProjectAnalyzeResult = {
  analysis: ProjectAnalysis;
  model: string;
  tokensIn: number;
  tokensOut: number;
  webSearches: number;
  costCents: number;
};

export class ProjectAnalysisError extends Error {
  code: "invalid_output" | "api_error";
  constructor(code: ProjectAnalysisError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export async function analyzeProjectBrief(
  input: ProjectAnalyzeInput,
): Promise<ProjectAnalyzeResult> {
  const model = env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  const userText = [
    `Ecco il brief inviato dall'utente (parole sue):`,
    ``,
    input.projectBrief.trim(),
    ``,
    `Produci l'analisi rispettando i vincoli del system prompt.`,
    `Ricorda: prima esegui 2-5 ricerche web mirate per trovare progetti`,
    `realmente esistenti, poi chiama emit_project_analysis con l'oggetto`,
    `JSON. I campi "url" devono puntare a fonti che hai davvero verificato.`,
  ].join("\n");

  let response;
  try {
    response = await getAnthropicClient().messages.create({
      model,
      max_tokens: 4000,
      temperature: 0.8,
      system: SYSTEM_PROMPT_PROJECT,
      // Cast: the SDK typings (0.39) don't yet include server tools, but
      // the API accepts the payload as-is.
      tools: [
        WEB_SEARCH_TOOL,
        PROJECT_TOOL_DEFINITION,
      ] as unknown as Anthropic.Tool[],
      messages: [{ role: "user", content: userText }],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ProjectAnalysisError("api_error", msg);
  }

  const toolUse = [...response.content]
    .reverse()
    .find(
      (b) =>
        b.type === "tool_use" && b.name === PROJECT_TOOL_DEFINITION.name,
    );
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new ProjectAnalysisError(
      "invalid_output",
      "No emit_project_analysis tool_use in response",
    );
  }

  const parsed = projectAnalysisSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new ProjectAnalysisError(
      "invalid_output",
      "Schema validation failed: " + JSON.stringify(parsed.error.flatten()),
    );
  }

  const tokensIn = response.usage.input_tokens;
  const tokensOut = response.usage.output_tokens;
  // `server_tool_use` is not yet in the 0.39 type definitions; read it
  // defensively from the runtime usage object.
  const webSearches =
    (response.usage as unknown as {
      server_tool_use?: { web_search_requests?: number };
    }).server_tool_use?.web_search_requests ?? 0;

  return {
    analysis: parsed.data,
    model,
    tokensIn,
    tokensOut,
    webSearches,
    costCents: estimateCostCents(tokensIn, tokensOut, webSearches),
  };
}
