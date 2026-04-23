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
- Branch lavoro Claude: `claude/analyze-prd-app-structure-rmHC9`
- **Production branch su Vercel: `main`**
- Workflow: committa su feature branch → merge --no-ff in main → push main
- Vercel redeploya automaticamente da main
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

### Lead Magnet "Scopri autori"
- `/scopri-autori` landing pubblica
- Modello `Lead` separato (non `users`) + trigger auto-link su signup
- Apify scraping profilo IG → download immagini → Claude Vision → analisi
  strutturata in JSON validata con zod
- Foto caricate su bucket `lead-images` di Supabase (URL permanenti)
- Dopo submit: crea auth.users passwordless + magic link → redirect a
  `/io/analisi/[id]` già loggato
- Limite **1 analisi/mese per email**
- Sidebar `/io` con voce "Analizza" come prima voce
- `/io/profilo` ha form "Imposta password" (user_metadata.password_set)

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
- Cron Vercel `/api/cron/publish-scheduled` ogni 10 min
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
5. **Auth callback** gestisce PKCE (?code=) e implicit flow
   (#access_token=...). `@supabase/ssr` **non auto-parsa** l'hash — chiamiamo
   `setSession` esplicitamente in `src/app/auth/callback/page.tsx`
6. **Claude image input** deve essere base64 (Instagram robots.txt blocca
   URL fetch lato Anthropic). Scarichiamo lato nostro con UA browser

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
- Anthropic credito caricato
- Apify token configurato su Vercel
- Turnstile **disattivato** (env mancante → verifyTurnstile ritorna true
  con warning)
- Confirm email Supabase **disattivato** per ora
- Bucket Supabase: `covers`, `avatars`, `authors`, `lead-images`
- User admin: `hello@alessandropiazza.it` (da creare manualmente via
  Supabase UI + SQL — istruzioni nel chat storico)

## Workflow raccomandato per prossimi blocchi

1. Leggi questo file
2. Leggi il PRD se servono dettagli di business
3. Usa AskUserQuestion (max 3-4 domande) per chiarire ambiguità prima di
   scrivere codice
4. Lavora sul branch `claude/analyze-prd-app-structure-rmHC9`
5. Build locale verde prima di commit
6. Commit con Conventional Commits + merge --no-ff su main + push main
7. Ricorda all'utente di applicare eventuali SQL migrations manualmente
8. Per feature che richiedono nuove env vars, elenca cosa aggiungere
   su Vercel prima del redeploy
