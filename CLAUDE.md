# Ulilearn — project memory

Piattaforma di formazione avanzata in fotografia contemporanea. Sostituisce
la soluzione attuale su Kajabi. Documento di memoria per future sessioni
Claude Code: leggilo per intero prima di fare modifiche.

## Stack

- **Next.js 14** App Router, TypeScript strict, Tailwind + design tokens
  Ulilearn (Oswald/Open Sans, ink #111/paper #FAF9F7/accent #FCF30B)
- **Supabase** (Postgres + Auth + Storage) hosted
- **Prisma** ORM (client lazy, singleton in `src/server/db/client.ts`)
- **tRPC** v11 + TanStack Query (provider in `src/lib/trpc/provider.tsx`)
- **Stripe** (non ancora integrato a runtime — Blocco 3/4)
- **Anthropic Claude** Sonnet 4.6 per lead magnet (client lazy)
- **Apify** per scraping Instagram lead magnet
- **Cloudflare Turnstile** anti-bot (opzionale, disattivabile)
- **Upstash Redis** rate limiting
- **Resend** + React Email transazionali
- **Vercel** hosting (cron configurato in `vercel.json`)
- **Sonner** toast, **@dnd-kit** drag&drop, **@uiw/react-md-editor** markdown

## Repo

- GitHub: `ulimedia/ulilearn`
- Branch lavoro Claude: ogni sessione ne usa uno nuovo (tipo
  `claude/<slug>`). Il PRD e questa memoria stanno su `main`.
- **Production branch su Vercel: `main`**
- Workflow: committa su feature branch → apri PR su GitHub → merge su `main`
  (il merge è un'azione di produzione: conferma sempre con l'utente)
- Vercel redeploya automaticamente da `main`
- URL live: `https://ulilearn.vercel.app`
- PRD originale: `PRD_Ulilearn_App.md` su main (fonte di verità per feature)

## Cosa è stato fatto (ordine cronologico)

### Blocco 0 — Scaffolding (Sprint 1 del PRD)
- Struttura Next.js completa, route groups `(marketing) (catalog) (auth)`
- Supabase auth + RLS + storage buckets (covers, avatars, authors)
- Prisma schema iniziale (15 modelli del PRD §5)
- tRPC setup con 3 livelli di procedure (public/protected/admin)
- Zod env validation in `src/lib/env.ts`
- Route protection middleware su `/io /watch /checkout /admin`
- Callback auth che gestisce sia PKCE che implicit flow

### Lead Magnet #1 "Scopri autori" (Instagram)
- `/scopri-autori` landing pubblica
- Modello `Lead` separato (non `users`) + trigger auto-link su signup
- Apify scraping profilo IG → download immagini → Claude Vision → analisi
  strutturata in JSON validata con zod (`leadAnalysisSchema`)
- Foto caricate su bucket `lead-images` di Supabase (URL permanenti)
- Dopo submit: crea auth.users passwordless + magic link → redirect a
  `/io/analisi/[id]` già loggato
- Limite **1 analisi/mese per email, per lead magnet** (indipendenti)
- Sidebar `/io` con voce "Analizza" come prima voce
- `/io/profilo` ha form "Imposta password" (user_metadata.password_set)

### Lead Magnet #2 "Analizza progetto" (brief testuale)
- `/analizza-progetto` landing pubblica (stesso pattern di `/scopri-autori`)
- Input: descrizione testuale libera 120-4000 char dell'idea di progetto
- Nessuno scraping, nessun upload: solo testo
- Claude Sonnet 4.6 con tool nativo **`web_search`** di Anthropic per
  verificare i progetti/autori simili citati (max 5 ricerche per analisi,
  ~1¢ ciascuna, sommate al costo token in `estimateCostCents`)
- Output `projectAnalysisSchema`: headline, reading[], strengths[],
  risks[], nextSteps[], similarProjects[] (con url fonte), closing, caveat
- Stessi rate limiter e anti-abuse del primo magnet ma con prefix Redis
  separati (`rl:lead:project:*`) — limiti indipendenti
- `LeadSource` enum Prisma promuove `Lead.source` da string a enum typed
  (`lead_magnet_ig` | `lead_magnet_project`); `instagram_url` rilassato a
  nullable; nuova colonna `project_brief text`
- `/io/analisi/[id]` è polimorfico: sceglie `AnalysisView` (IG) vs
  `ProjectAnalysisView` (progetto) in base a `lead.source`
- Admin `/admin/lead-magnet` ha tab filter `?source=` + colonna Tipo
- Migration: `supabase/migrations/0007_lead_source_enum.sql` (idempotente:
  usa `DO $$ BEGIN … EXCEPTION WHEN duplicate_object` e guardie su
  `information_schema.columns` per le `alter column`, così è ri-eseguibile
  senza errori)
- **Nota su fatturazione Anthropic col web_search**: ogni invocazione del
  tool viene contata come un turno separato nella dashboard Anthropic,
  quindi una sola analisi progetto può generare 3-5 righe con lo stesso
  Request ID. L'input cresce a ogni turno perché il modello rielabora il
  contesto + i risultati precedenti; solo l'ultimo turno contiene
  l'output completo (≈2-3k token). Costo tipico per analisi progetto:
  $0.30-0.50 (vs $0.15-0.20 per un'IG senza search). `max_uses` è
  configurato a 5 in `project-analysis-prompt.ts` — abbassalo a 3 se
  vuoi tagliare i costi del ~30%.

### Split landing pubbliche ↔ analisi in-app
- I due lead magnet hanno ora **due audience separate** con due flussi:
  - **Pubblico (traffico esterno)**: `/scopri-autori` e `/analizza-progetto`
    stanno nel route group `src/app/(landing)/` con layout minimale (solo
    logo + "Ho già un account", niente Header/Footer). URL invariati —
    i route group di Next.js non impattano sui path, campagne esterne
    sicure. Flusso completo con email + Turnstile + `createPasswordlessUser`
    + magic link.
  - **In-app (utente loggato)**: `/io/analizza` hub + `/io/analizza/profilo`
    + `/io/analizza/progetto`. Form snelli senza email né Turnstile né
    magic link. Due nuove procedure `protectedProcedure`
    (`leadMagnet.analyzeAuthed`, `leadMagnet.analyzeProjectAuthed`) che
    riusano gli stessi helper Claude + `checkMonthlyLimit`, ma settano
    `convertedUserId` + `convertedAt` direttamente alla creazione del lead.
- Il bottone "Nuova analisi" in `/io/analisi` punta ora a `/io/analizza/*`.
  **Regola**: i link pubblici `/scopri-autori` e `/analizza-progetto`
  sono solo per chi NON ha ancora un account — per gli utenti loggati
  verrebbero rifiutati con `[email_exists]` dal backend.

### Auth: implicit flow per il browser client
- `createSupabaseBrowserClient` in `src/lib/supabase/client.ts` è
  configurato con `{ auth: { flowType: "implicit" } }`.
- Motivo: il default PKCE di `@supabase/ssr` mette un cookie
  `code_verifier` nel browser al click di "Ricevi magic link" e lo
  esige al click sul link dall'email. Se l'utente apriva la mail da
  cellulare/altro browser → `"PKCE code verifier not found in storage"`.
- Con implicit flow i token tornano nel fragment URL
  (`#access_token=...&refresh_token=...`). La callback
  `src/app/auth/callback/page.tsx` già lo gestisce (chiama `setSession`
  a mano perché `@supabase/ssr` non auto-parsa l'hash).
- Il lead magnet usa `admin.generateLink` che è sempre stato implicit;
  adesso login e lead magnet si comportano uguale.
- Trade-off: implicit espone i token nel fragment URL, che però
  **non** arriva al server (client-only). Se in futuro aggiungiamo
  OAuth Google valuteremo se tornare a PKCE solo per quel flow.

### Blocco 1 — Content CMS
- Schema esteso: `ContentType` ora ha 5 valori (+masterclass, +workshop);
  `ContentFormat` (on_demand/live_online/live_hybrid/live_in_person);
  `PurchaseStatus`
- `ContentItem` con campi: format, liveStart/End/RegistrationDeadline,
  timezone, location, isPurchasable, standalonePriceCents,
  subscriberPriceCentsOverride, maxSeats, seatsTaken, scheduledPublishAt
- `Plan.subscriberDiscountPercent` (default 20)
- `ContentPurchase` modello pronto (verrà popolato al Blocco 4)
- Admin CRUD completo `/admin/contenuti` e `/admin/autori`:
  ContentForm tabbed (Generale/Media/Prezzi/Evento/Pubblicazione),
  ModulesEditor + LessonsEditor con dnd-kit, CoverUploader con signed URL
- Migration SQL **splittata in 2** (`0005_content_types.sql` prima,
  `0006_content_cms.sql` dopo) perché Postgres non permette `ALTER TYPE
  ADD VALUE` e uso nella stessa transazione

### Blocco 2 — Catalogo pubblico
- `/catalogo` hero + 6 righe by type
- `/lecture /corsi /documentari /masterclass /workshop` (componente
  condiviso `TypeListingPage`)
- `/[tipo]/[slug]` dettaglio ricco: cover, badge, CTA dinamica (Acquista
  vs Diventa Plus vs Guarda vs Iscriviti), markdown description,
  outline moduli per corsi, tag, 4 correlati
- `/autori` + `/autori/[slug]` con bio + contenuti
- `/ricerca` con ILIKE + search box client
- `/sitemap.xml` dinamica, `/robots.txt`, OG metadata per contenuto
- Route `/api/cron/publish-scheduled` **presente nel codice ma senza
  cron schedule attivo** (vedi sezione "Limiti Vercel Hobby" sotto)
- ISR `revalidate=600` sulle pagine catalogo

### Infrastruttura ausiliaria
- Logout buttons in `Header`, `/io` sidebar, `/admin` sidebar
- Script `scripts/make-admin.ts` (non eseguibile dal sandbox — proxy
  blocca HTTPS verso Supabase)

## Cosa resta da fare

### Blocco 3 — Abbonamento Plus
- CRUD piani in `/admin/piani` con sync Stripe Products/Prices
- Pagina `/abbonati` dinamica dal DB
- Stripe Checkout Session mode=subscription
- Webhook `/api/webhooks/stripe` con idempotenza via `stripe_events`:
  `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`,
  `customer.subscription.*`
- Stripe Customer Portal dal `/io/abbonamento`
- Coupon CRUD `/admin/coupon` con sync Stripe
- Email transazionali (benvenuto/ricevuta/rinnovo/fail/revocato) —
  template base in `src/emails/` da creare
- Gating `requireSubscription` attivato sui contenuti on-demand

### Blocco 4 — Acquisti one-shot (masterclass/workshop)
- Stripe Checkout mode=payment
- Pre-check `seats_taken < max_seats` + lock transazionale nel webhook
- Sconto abbonato auto-applicato (`subscriberDiscountPercent` + override)
- Popolare `ContentPurchase` nel webhook
- Admin `/admin/contenuti/[id]/iscritti` + CSV export
- Email conferma + `.ics` per workshop
- Rimborsi via `charge.refunded` (decrementa seatsTaken)

### Blocco 5 — Player Vimeo + gating
- `/watch/[id]` e `/watch/[course]/[lesson]`
- API `/api/content/[id]/stream` che verifica sub OR purchase OR free
- VimeoPlayer wrapper `@vimeo/player`
- Progress tracking throttled 10s su `/api/progress`
- Continue watching in `/io`
- Saved items `/io/salvati`
- Auto-fetch `durationSeconds` da Vimeo API nell'admin

### Polish trasversale
- Fatturazione elettronica italiana (PRD §13, v1.1) — Fatture in Cloud
- Migrazione utenti Kajabi (PRD §7) — script in `scripts/`
- Analytics dashboard admin (MRR/ARR/churn/LTV)
- CRM admin users view (PRD §6.8)

## Decisioni architetturali importanti

1. **`leads` separata da `users`** — i lead del lead magnet non inquinano
   auth.users. Linking bidirezionale: `leads.convertedUserId` ↔
   `users.originLeadId` popolato dal trigger `handle_new_auth_user`.
2. **Bundle abbonamento vs acquisto singolo**:
   - `lecture/corso/documentario` → inclusi in Plus (gating via subscription)
   - `masterclass/workshop` → acquistabili singolarmente (+sconto abbonati)
3. **Pricing**: un solo `subscriberDiscountPercent` globale su `Plan` +
   `subscriberPriceCentsOverride` opzionale per casi speciali
4. **Client tRPC lazy**: `getAnthropicClient()`, `getResendClient()`, e
   `getSupabaseAdmin()` instanziati on-demand — build non fallisce senza key
5. **Auth callback + flowType implicit**: il browser client usa
   `{ auth: { flowType: "implicit" } }` così magic link e OAuth tornano
   con token nel hash URL invece che `?code=` PKCE. Motivo: PKCE pretende
   un cookie code_verifier nello stesso browser che ha richiesto il link
   → si rompe se l'utente apre l'email su un altro device. La callback
   `src/app/auth/callback/page.tsx` gestisce anche il caso PKCE per
   retrocompatibilità (via `exchangeCodeForSession`). `@supabase/ssr`
   **non auto-parsa** l'hash — chiamiamo `setSession` esplicitamente.
6. **Claude image input** deve essere base64 (Instagram robots.txt blocca
   URL fetch lato Anthropic). Scarichiamo lato nostro con UA browser
7. **Separazione landing pubblica ↔ azione in-app** per i lead magnet:
   le landing (`/scopri-autori`, `/analizza-progetto`) vivono nel
   route group `(landing)` senza Header/Footer e sono il punto d'ingresso
   per visitatori non loggati. Gli utenti autenticati fanno nuove analisi
   da `/io/analizza/*` con tRPC `protectedProcedure` → nessuna email,
   nessun Turnstile, nessun magic link.

## Convenzioni

- Import sempre da `@/...` (alias `src/*`)
- Codice in `src/server/` MAI importato da file `"use client"` o componenti
  client-side (`@/lib/slug.ts` è client-safe, `src/server/content/slug.ts`
  è server-only)
- Zod schemas condivisi router/form in `src/server/content/schemas.ts`
- URL assoluti sempre via `env.NEXT_PUBLIC_APP_URL`, mai hardcoded
- Prisma: `snake_case` in DB (`@map`), `camelCase` in TS
- Toast via `sonner` importato da `@/components/ui/toast`
- Commit messages: Conventional Commits (`feat(scope):`, `fix:`, `chore:`)
- **Mai** usare `git push --no-verify` o bypassare hook

## Env vars

Server: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_ANNUAL`,
`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_MAX_COST_CENTS_PER_WEEK`,
`TURNSTILE_SECRET_KEY` (opz.), `APIFY_TOKEN`, `APIFY_IG_ACTOR`,
`APIFY_IG_MAX_IMAGES`, `RESEND_API_KEY`, `EMAIL_FROM`,
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
`LEAD_MAGNET_*`, `CRON_SECRET`.

Client: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` (opz.), `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`.

Vedi `.env.example` per lista completa. Su Vercel sono impostate tutte le
critiche tranne Stripe (ancora dummy) e quelle che arriveranno nei blocchi
successivi.

## Comandi utili

```bash
pnpm dev              # dev server locale (3000)
pnpm build            # build prod (il sandbox non raggiunge DB → sitemap richiede force-dynamic)
pnpm prisma generate  # dopo modifica schema
pnpm typecheck
pnpm lint
```

## Note ambiente Claude Code sandbox

- **NON** può raggiungere `*.supabase.co` HTTPS (`host_not_allowed`) né
  `*.pooler.supabase.com` TCP (firewall). Quindi:
  - Migrations DB vanno eseguite dall'utente via Supabase SQL Editor
  - Lo script `scripts/make-admin.ts` non gira qui
- Il build funziona perché tutte le pagine che toccano DB sono
  `force-dynamic` o usano `cookies()` (auto-dynamic)

## Setup operativo dell'utente (cose fatte)

- Supabase progetto: `sfuukiuaqltqmsqixkbh.supabase.co`, region EU Frankfurt
- **Un solo database Supabase per tutti gli ambienti Vercel** (le env
  `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, ecc. sono
  settate come "All Environments" — stesso valore per Production, Preview
  e Development). Conseguenza: ogni SQL migration va applicata **una
  volta sola** via Supabase SQL Editor e vale per tutti.
- Anthropic credito caricato
- Apify token configurato su Vercel
- Turnstile **disattivato** (env mancante → verifyTurnstile ritorna true
  con warning)
- Confirm email Supabase **disattivato** per ora
- Bucket Supabase: `covers`, `avatars`, `authors`, `lead-images`
- User admin: `hello@alessandropiazza.it` (da creare manualmente via
  Supabase UI + SQL — istruzioni nel chat storico)

## Limiti del piano Vercel Hobby (gotcha importanti)

- **Cron minimo: daily**. Schedules sub-giornaliere (`*/10 * * * *` ecc.)
  fanno **fallire ogni deploy** (preview + prod) con l'errore "Hobby
  accounts are limited to daily cron jobs". Di conseguenza `vercel.json`
  oggi NON contiene il blocco `crons`. Se in futuro servirà lo scheduled
  publishing: scegliere un `0 2 * * *` (giornaliero) oppure upgrade a Pro.
- **Deployment Protection = Standard** attiva → tutti i preview URL
  richiedono login Vercel. I test end-to-end dal preview funzionano solo
  se sei loggato nell'account Vercel che ha creato il progetto.
- **Magic link Supabase ignora l'URL del preview**: `generateMagicLinkUrl`
  costruisce il callback usando `env.NEXT_PUBLIC_APP_URL`, che è settato
  come "All Environments" = `https://ulilearn.vercel.app` (produzione).
  Conseguenza pratica: quando un utente riempie un form lead magnet sul
  preview di un branch, il magic link lo reindirizza **a produzione**,
  non al preview. Feature che attraversano il flow del magic link
  possono essere collaudate davvero solo **dopo il merge su `main`**.
  Per testare un preview senza merge, o duplica `NEXT_PUBLIC_APP_URL`
  per-environment (Preview = URL del preview), oppure accetta che il
  form funzioni ma il redirect finale vada in prod.
- **Cron secret**: se si riattiva un cron, ricordare `CRON_SECRET` env
  (la route già controlla `Authorization: Bearer $CRON_SECRET`).

## Workflow raccomandato per prossimi blocchi

1. Leggi questo file per intero (è la memoria — non perdere tempo a
   chiedere cose già scritte qui)
2. Leggi il PRD se servono dettagli di business
3. Usa AskUserQuestion (max 3-4 domande) per chiarire ambiguità prima di
   scrivere codice — l'utente **non è tecnico**, spiega in italiano
   semplice ogni azione che implica DB / deploy / prod
4. Lavora sul branch di sessione (ogni sessione ne ha uno assegnato dal
   wrapper). Mai committare direttamente su `main`.
5. `pnpm typecheck` + `pnpm lint` verdi prima di commit
6. Conventional Commits (`feat(scope):`, `fix:`, `chore:`)
7. Apri PR su GitHub e conferma col pollice dell'utente prima di mergiare
8. **Sempre ricorda all'utente le SQL migrations da applicare manualmente**
   (singolo DB: una sola esecuzione via Supabase SQL Editor). Scrivi
   migrations idempotenti: `CREATE TYPE` + exception, `IF NOT EXISTS`
   per column/index, `DO $$ BEGIN … END $$` con guardie su
   `information_schema` per `ALTER COLUMN` non ripetibili.
9. Per nuove env vars, elenca nella PR description cosa aggiungere su
   Vercel (e avverti l'utente che sono "All Environments" di default
   se non specifica diversamente)
10. Per feature che passano dal magic link Supabase, considera il gotcha
    su `NEXT_PUBLIC_APP_URL` (vedi "Limiti Vercel Hobby" sopra): il test
    vero richiede il merge su `main`
