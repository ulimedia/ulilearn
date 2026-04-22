# PRD — Ulilearn App

**Versione:** 1.0 (MVP)
**Data:** 22 aprile 2026
**Autore:** Alessandro Piazza
**Codice progetto:** ulilearn-app
**Stato:** Draft — pronto per sviluppo

---

## 0. Come leggere questo documento

Questo PRD è scritto per essere consumato da Claude Code in sessioni di sviluppo iterativo. Ogni feature ha:
- **Descrizione** (cosa fa)
- **User stories** (per chi, perché)
- **Requisiti funzionali** (cosa deve fare esattamente)
- **Note tecniche** (come implementarlo sullo stack scelto)
- **Definition of Done**

I capitoli marcati **[MVP]** sono nel scope della prima release. I capitoli **[v2]** / **[v3]** sono nella roadmap e NON vanno implementati nell'MVP.

---

## 1. Executive Summary

**Ulilearn** è una piattaforma digitale di formazione avanzata in fotografia contemporanea e linguaggi visivi. Attualmente vive su due pezzi disconnessi: sito vetrina WordPress (`ulilearn.academy`) e piattaforma di delivery su Kajabi (`ulilearn.com`).

**Obiettivo del progetto:** sostituire Kajabi con una piattaforma proprietaria che replichi in modo focalizzato il modello Netflix: catalogo di contenuti video (lecture, corsi, documentari) accessibili tramite un singolo abbonamento annuale **Ulilearn Plus**.

**Strategia di dominio:**
- **MVP / fase 1:** la nuova app vive su `app.ulilearn.academy` (sottodominio del vetrina). `ulilearn.com` resta occupato da Kajabi durante la fase di migrazione.
- **Post-dismissione Kajabi (v2+):** valutazione passaggio dominio primario a `app.ulilearn.com`. L'app deve essere scritta in modo dominio-agnostico (nessun hardcoding di URL) per permettere la migrazione senza rework.

**Perché build custom invece di un altro SaaS:**
1. Controllo sull'esperienza (Kajabi è un template generico, Ulilearn è un progetto editoriale curato)
2. Costi marginali più bassi al crescere del volume
3. Libertà di evolvere in direzioni non previste dai SaaS (es. pagine autore curate, editoriali, ecc.)
4. Dati utente e comportamenti di consumo di proprietà

**Cosa NON è in scope (esplicitamente escluso):**
- Podcast
- Programma affiliate
- Branded mobile app (l'app web mobile-responsive basta per l'MVP)
- Community / forum / messaggistica
- Gamification, certificati, quiz, esami
- Marketplace di corsi di terzi

---

## 2. Vision & Obiettivi

### 2.1 Vision
Ulilearn è uno **spazio editoriale e formativo**, non un catalogo video. La piattaforma deve comunicare cura, lentezza, profondità. Il prodotto digitale riflette il brand: colto ma non accademico, curato, misurato, essenziale.

### 2.2 Obiettivi misurabili (12 mesi post-lancio)
- **Migrazione pulita:** 100% degli abbonati Kajabi attivi al go-live portati su `app.ulilearn.academy` senza interruzione di accesso
- **Churn annuale** ≤ 25% (benchmark platform di nicchia)
- **Activation:** ≥ 70% dei nuovi abbonati visualizza almeno 1 contenuto nei primi 7 giorni
- **LTV/CAC** > 3
- **Time-to-publish** di un nuovo contenuto (upload Vimeo → pubblico) < 15 minuti dal pannello admin

### 2.3 Non-obiettivi
- Non competere con MasterClass sui volumi
- Non replicare feature di Kajabi che non servono al modello editoriale (affiliate, podcast, ecc.)
- Non costruire un LMS completo (progress tracking base OK, ma niente assessment)

---

## 3. Target & Personas

### 3.1 Persona 1 — "Francesca, la fotografa emergente"
- 28 anni, ha un portfolio iniziale, cerca confronto con autori veri
- Consuma contenuti la sera, su laptop; saltuariamente su smartphone in viaggio
- **Bisogno:** percorsi strutturati, non tutorial rapidi; vuole capire come pensa un autore, non solo come usare una macchina
- **Pain attuale su Kajabi:** interfaccia generica, poca curatela, difficile orientarsi tra lecture e corsi

### 3.2 Persona 2 — "Marco, il visual artist consolidato"
- 45 anni, lavora con editoria/festival, cerca approfondimenti teorici e documentari
- Consuma poco ma sceglie contenuti specifici
- **Bisogno:** qualità autoriale, capacità di trovare velocemente un contenuto specifico, possibilità di scaricare / accedere da più device

### 3.3 Persona 3 — "La studentessa di fotografia"
- 22 anni, budget limitato, è entrata con coupon studenti
- **Bisogno:** chiarezza su cosa include l'abbonamento, rinnovi prevedibili, possibilità di pausa

### 3.4 Persona 4 (interna) — "Alessandro, admin / redattore"
- Tu. Deve poter caricare contenuti, gestire utenti, monitorare metriche senza attriti
- **Bisogno:** pannello admin veloce, pochi click, niente setup tecnico per ogni nuovo contenuto

---

## 4. Architettura & Stack

### 4.1 Architettura ad alto livello

```
                    +------------------------+
                    |    ulilearn.academy    |
                    |   (WordPress vetrina)  |
                    |   Landing, info, CTA   |
                    +----------+-------------+
                               |
                               v (link "Accedi" / "Abbonati")
                    +------------------------+
                    |  app.ulilearn.academy  |
                    |   Next.js 14 (Vercel)  |
                    +----------+-------------+
                               |
         +--------+------------+------------+--------+
         v        v                         v        v
    Supabase  Stripe                     Vimeo    Resend
     (DB,    (billing,                  (video   (email
      auth,  webhooks,                  hosting  trans.)
     storage) subscription)              + API)
                               
                     + PayPal (provider secondario)
                     + Plausible / Umami (analytics frontend)
```

### 4.2 Stack tecnico

**Frontend & API**
- **Next.js 14** (App Router) — SSR dove serve SEO, CSR per area autenticata
- **TypeScript** — tipizzazione end-to-end
- **Tailwind CSS** — con design tokens Ulilearn (vedi §10)
- **shadcn/ui** per componenti base (personalizzati su brand)
- **React Query / TanStack Query** per stato server nell'area utente

**Backend / Data**
- **Supabase** (Postgres gestito + Auth + Storage + Row Level Security + Realtime)
  - Auth: email+password + Magic Link + OAuth Google (opzionale in MVP)
  - RLS per isolamento dati utente
- **Prisma** come ORM tra Next.js e Postgres (opzionale; in alternativa client Supabase diretto)
- **tRPC** o Route Handlers Next.js per le API interne

**Billing & Pagamenti**
- **Stripe** — provider primario (subscription, coupon, customer portal, webhooks)
- **PayPal** — provider secondario (solo one-shot annuale; niente subscription ricorrente PayPal nell'MVP se complica)
- **Stripe Tax** disattivato in MVP (fattura elettronica → v2, vedi §13)

**Video**
- **Vimeo Pro/Business** — hosting, trascodifica, player embed con domain whitelisting su `app.ulilearn.academy` (+ `app.ulilearn.com` da aggiungere in fase di migrazione dominio v2)
- Nessun CDN custom per i video nell'MVP

**Email**
- **Resend** per email transazionali (API-first, ottimo per Next.js) — alternativa: Postmark
- **Template HTML** progettati coerenti col brand (vedi §10)
- **[v2]** Loops.so o Customer.io per marketing automation

**Analytics**
- **Plausible** o **Umami** (privacy-friendly, senza cookie banner) per il traffico
- **Custom events** propri (serviti da tabelle Postgres) per metriche prodotto (vedi §9)

**Infrastruttura**
- **Vercel** (deploy + preview branches)
- **Supabase** (managed)
- **Cloudflare** DNS + (opzionale) proxy per `app.ulilearn.academy`
- **Sentry** per error tracking
- **GitHub** per repo; CI/CD via Vercel

### 4.3 Relazione con il sito WordPress e strategia di dominio
- `ulilearn.academy` → resta invariato (landing, pagine autori, presentazione progetto, WordPress)
- `ulilearn.com` → attualmente su Kajabi. Viene dismesso a migrazione completata (vedi §7)
- `app.ulilearn.academy` → nuova piattaforma MVP (catalogo, area utente, checkout, player)
- Le CTA "Abbonati" / "Accedi" sul sito vetrina puntano a `app.ulilearn.academy/abbonati` e `app.ulilearn.academy/login`
- **Design system condiviso** (font, colori, tono) ma codebase separate
- **SEO** per il catalogo contenuti: pagine pubbliche contenuto (preview) indicizzabili su `app.ulilearn.academy/corsi/...`, mentre contenuto video resta privato
- **Evoluzione v2:** dopo la dismissione di Kajabi, valutare lo switch a `app.ulilearn.com` (dominio primario). Per questo, tutte le reference di dominio devono essere in env vars (`NEXT_PUBLIC_APP_URL`), mai hardcoded. Redirect 301 permanenti e aggiornamento whitelisting Vimeo / redirect URL Stripe al momento dello switch.

---

## 5. Data Model

Schema concettuale. Nomi tabelle in `snake_case`, chiavi primarie `uuid`.

### 5.1 Entità principali

```
users
  id (uuid, pk)
  email (unique)
  full_name
  avatar_url
  auth_provider (email, google, ...)
  created_at, updated_at
  marketing_consent (bool)
  role (enum: user, admin, editor)
  kajabi_legacy_id (nullable — per migrazione)

subscriptions
  id (uuid, pk)
  user_id (fk users)
  plan_id (fk plans)
  status (enum: trialing, active, past_due, canceled, expired)
  stripe_subscription_id (nullable)
  stripe_customer_id
  paypal_subscription_id (nullable)
  started_at
  current_period_start
  current_period_end
  cancel_at_period_end (bool)
  canceled_at
  created_at, updated_at

plans
  id (uuid, pk)
  slug (es. "plus-annuale")
  name
  price_cents (int)
  currency (default 'EUR')
  billing_interval (enum: year, month)
  is_active (bool)
  stripe_price_id
  paypal_plan_id

payments
  id (uuid, pk)
  user_id (fk)
  subscription_id (fk, nullable — per one-shot futuri)
  provider (enum: stripe, paypal)
  provider_payment_id
  amount_cents
  currency
  status (enum: succeeded, refunded, failed, pending)
  invoice_url (nullable)
  coupon_id (fk, nullable)
  created_at

coupons
  id (uuid, pk)
  code (unique, uppercase)
  type (enum: percentage, fixed)
  value (int — percent 0-100 o centesimi)
  max_redemptions (nullable)
  redemptions_count (int, default 0)
  valid_from
  valid_until
  applicable_plan_ids (array)
  stripe_coupon_id (nullable — se sincronizzato)
  is_active (bool)
  created_at

content_items
  id (uuid, pk)
  slug (unique)
  type (enum: lecture, corso, documentario)
  title
  subtitle
  description_md (markdown)
  cover_image_url (storage supabase)
  author_id (fk authors)
  vimeo_video_id (nullable — per single-video)
  duration_seconds (int)
  published_at (nullable — se null = bozza)
  status (enum: draft, scheduled, published, archived)
  tags (array)
  is_featured (bool)
  created_at, updated_at

course_modules            (solo per type=corso)
  id (uuid, pk)
  course_id (fk content_items)
  title
  order_index

course_lessons
  id (uuid, pk)
  module_id (fk course_modules)
  title
  vimeo_video_id
  duration_seconds
  order_index
  resources (jsonb — pdf, link, note)

authors
  id (uuid, pk)
  slug
  full_name
  bio_md
  portrait_url
  website_url
  social_links (jsonb)

viewing_progress
  id (uuid, pk)
  user_id (fk)
  content_item_id (fk, nullable)
  lesson_id (fk, nullable)
  seconds_watched (int)
  completed (bool)
  last_watched_at

saved_items           (watchlist)
  user_id (fk)
  content_item_id (fk)
  saved_at

email_events
  id (uuid, pk)
  user_id (fk, nullable)
  email
  template_key
  provider_message_id
  status (enum: sent, delivered, bounced, opened, clicked, failed)
  metadata (jsonb)
  created_at

audit_log
  id (uuid, pk)
  actor_user_id (fk)
  action (string)
  entity_type, entity_id
  diff (jsonb)
  created_at
```

### 5.2 Regole di integrità chiave
- `subscriptions.status = active` → l'utente ha accesso a tutti i `content_items` con `status = published`
- Se `status ∈ (past_due, canceled, expired)` → accesso revocato al rinnovo fallito (vedi flow §8.4)
- RLS Supabase: un utente può leggere solo i propri record di `viewing_progress`, `saved_items`, `subscriptions`, `payments`

---

## 6. Feature Requirements [MVP]

### 6.1 Autenticazione & Account [MVP]

**Descrizione.** Sistema di auth pulito: signup, login, recupero password, gestione profilo.

**User stories**
- Come visitatore, voglio registrarmi con email+password per iniziare l'abbonamento
- Come utente esistente, voglio loggarmi con magic link via email per non ricordare la password
- Come utente, voglio poter resettare la password se l'ho dimenticata

**Requisiti funzionali**
1. Signup con email + password (min 8 char, 1 numero)
2. Login con email + password **e** magic link (link valido 15 min)
3. Password reset via email
4. Verifica email obbligatoria al primo accesso (link valido 24h)
5. Logout disponibile in ogni vista autenticata
6. Session: JWT refresh automatico, durata sessione 30 giorni rolling
7. OAuth Google opzionale in MVP (se Supabase lo supporta out-of-the-box, attivarlo)
8. Pagina profilo: nome, email, avatar, preferenze email, password change
9. Cancellazione account (soft delete; dati conservati 30 giorni per eventuale ripristino, poi hard delete)

**Note tecniche**
- Supabase Auth con email provider + opzionale Google OAuth
- Tabella `users` estende `auth.users` di Supabase via trigger

**DoD**
- Registrazione → verifica email → login → logout funzionano end-to-end
- Password reset testato
- RLS policies attive (utenti vedono solo i propri dati)

---

### 6.2 Catalogo & Contenuti [MVP]

**Descrizione.** Area pubblica/semi-pubblica che mostra il catalogo Ulilearn. Pagine preview visibili a tutti; visione completa riservata ad abbonati.

**User stories**
- Come visitatore, voglio esplorare il catalogo e capire cosa ottengo abbonandomi
- Come abbonato, voglio trovare velocemente contenuti per autore / tipo / tema
- Come abbonato, voglio riprendere la visione da dove l'ho lasciata

**Requisiti funzionali**
1. **Home catalogo** (`/catalogo`): sezioni curate
   - Hero con contenuto in evidenza (`is_featured=true`)
   - "Nuovi contenuti" (ultimi 8 pubblicati)
   - "Continua a guardare" (se abbonato + ha `viewing_progress`)
   - Righe orizzontali per tipo: Lecture, Corsi, Documentari
   - Riga "In evidenza per te" (in MVP: random pesato per autori visti; raccomandazioni vere → v2)
2. **Pagina tipo** (`/lecture`, `/corsi`, `/documentari`):
   - Griglia con filtri (autore, tema, durata)
   - Ordinamento: più recenti, più lunghi, più visti (ultima → v2)
3. **Pagina contenuto singolo** (`/[tipo]/[slug]`):
   - Cover, titolo, autore, durata, descrizione, tags
   - CTA: se abbonato → "Guarda ora", altrimenti → "Abbonati per accedere"
   - Correlati (3-4 contenuti dello stesso autore o tema)
   - Per `type=corso`: elenco moduli/lezioni con stato (visto, in corso, da vedere)
4. **Pagina autore** (`/autori/[slug]`):
   - Bio, portrait, elenco contenuti
5. **Ricerca** (`/ricerca?q=...`):
   - Full-text su `title`, `subtitle`, `description_md`, autore, tag
   - Postgres `tsvector` in MVP; migrazione a servizio esterno → v2 se volumi lo richiedono
6. **Watchlist / Salvati** (`/salvati`):
   - Un utente autenticato (anche non abbonato) può salvare contenuti
7. **Gestione accesso**
   - Contenuti `status=draft` o `scheduled` non visibili
   - Contenuti `published` + utente non abbonato → vede preview (metadata + cover + primi secondi/trailer se disponibile su Vimeo), non il video completo

**Note tecniche**
- Pagine catalogo: SSR con revalidate (ISR) ogni 10 minuti
- Pagina contenuto: SSR con metadata OG per condivisione social
- Immagini cover: upload su Supabase Storage, serviti con `next/image`

**DoD**
- Navigazione del catalogo fluida da mobile e desktop
- Un utente non abbonato vede preview ma NON il video completo
- Un utente abbonato vede tutto + stato di avanzamento
- Ricerca restituisce risultati rilevanti

---

### 6.3 Player Video (Vimeo) [MVP]

**Descrizione.** Player integrato per visione contenuti video, con gating da abbonamento, tracking progresso, protezione base.

**User stories**
- Come abbonato, voglio vedere il video in full-screen, a buona qualità, con subtitle se disponibili
- Come abbonato, voglio che il progresso si salvi e possa riprendere
- Come admin, non voglio che un non abbonato possa embeddare il video altrove

**Requisiti funzionali**
1. Player: Vimeo embed iframe, con `dnt=1` (no tracking Vimeo marketing)
2. Domain whitelisting su Vimeo: video visibili solo da `app.ulilearn.academy` (+ `localhost` in dev; aggiungere `app.ulilearn.com` al momento del cut-over v2)
3. Gating server-side: l'URL dell'embed viene generato via API `/api/content/[id]/stream` che **prima** verifica:
   - Utente autenticato
   - Abbonamento attivo (o contenuto gratuito `is_free=true`)
   - Ritorna l'ID Vimeo privato solo se autorizzato
4. **Progress tracking**:
   - Su `timeupdate` (throttled a 10s), POST `/api/progress`
   - Marca `completed=true` quando > 90% durata
5. **Controlli UI custom** minimali sopra l'iframe: titolo, torna al catalogo, pulsante "Salva"
6. Subtitle: se caricati su Vimeo (WebVTT), player li mostra nativamente
7. Playback speed e qualità: gestiti nativamente da Vimeo player

**Note tecniche**
- `@vimeo/player` SDK per eventi (`timeupdate`, `ended`, `pause`)
- Nessun download diretto in MVP; protezione DRM = NO (Vimeo Pro/Business non la offre; è un compromesso accettato)

**DoD**
- Un utente non abbonato che prova a richiedere `/api/content/[id]/stream` riceve 403
- Un utente abbonato vede video e progresso si salva ogni 10 secondi
- "Continua a guardare" riprende dall'ultimo secondo salvato (tolleranza ±5s)

---

### 6.4 Abbonamento & Billing [MVP]

**Descrizione.** Flusso d'acquisto singolo piano annuale, con Stripe come provider primario e PayPal secondario. Self-service di gestione abbonamento.

**User stories**
- Come visitatore, voglio abbonarmi in meno di 2 minuti
- Come abbonato, voglio vedere quando scade l'abbonamento e aggiornare la carta
- Come abbonato, voglio poter disdire online senza chiamare nessuno
- Come admin, voglio che un rinnovo fallito disattivi l'accesso automaticamente

**Requisiti funzionali**
1. **Pagina pricing** (`/abbonati`): un solo piano "Ulilearn Plus — 1 anno", prezzo IVA inclusa
2. **Checkout Stripe**:
   - Stripe Checkout (session hosted, mobile-ready) oppure Stripe Elements embedded (preferito per controllo UX)
   - Dati raccolti: email, nome, nazione (per IVA), metodo di pagamento
   - Campo coupon opzionale
3. **Checkout PayPal**:
   - Button PayPal in checkout
   - One-shot payment annuale (niente subscription PayPal in MVP per evitare complessità multi-provider su rinnovi)
   - Il record `subscriptions` viene creato con `status=active`, `current_period_end = +1 anno`, `stripe_subscription_id=null`, rinnovo gestito manualmente da reminder email (→ upgrade a subscription vera su PayPal in v2)
4. **Webhook Stripe** (`/api/webhooks/stripe`) gestisce eventi:
   - `checkout.session.completed` → crea/attiva subscription
   - `invoice.paid` → record payment, estende period_end
   - `invoice.payment_failed` → status `past_due`, trigger email retry
   - `customer.subscription.updated` / `.deleted` → aggiorna stato
   - Idempotenza via `stripe_event_id` in una tabella dedicata
5. **Stripe Customer Portal** linkato dall'area personale per:
   - Aggiornare metodo di pagamento
   - Vedere ricevute
   - Disdire rinnovo automatico
6. **Rinnovi automatici**: gestiti da Stripe. L'utente viene avvisato via email 7 giorni prima
7. **Grace period** su pagamento fallito: 3 retry Stripe standard (giorni 3, 5, 7) + email a ogni retry → se al 7° fallisce, status `expired`, accesso revocato
8. **Cancellazione**: via Customer Portal → `cancel_at_period_end=true`, l'utente continua a vedere fino a `current_period_end`, poi `expired`
9. **Reattivazione**: se status `canceled` ma ancora entro period_end → un click "Riattiva" rimuove il flag di cancellazione

**Note tecniche**
- `stripe.subscriptions.create` con `billing_cycle_anchor` per allineare rinnovi al 1° del mese (opzionale, valuta)
- Currency: EUR only in MVP
- Gestione IVA: Stripe inclusiva del prezzo, no Stripe Tax in MVP (si aggiunge IVA italiana fissa 22% per B2C; niente B2B/EU reverse charge in MVP)

**DoD**
- Un utente può abbonarsi con Stripe end-to-end
- Un utente può abbonarsi con PayPal (one-shot)
- Rinnovo Stripe avviene automaticamente e aggiorna `current_period_end`
- Cancellazione tramite Customer Portal → accesso mantenuto fino a period_end poi revocato

---

### 6.5 Coupon [MVP]

**Descrizione.** Sistema di sconti per campagne, partnership, studenti, recuperi carrello abbandonato.

**User stories**
- Come admin, voglio creare un coupon "STUDENTI30" valido fino al 30 settembre
- Come utente, voglio inserire il coupon in checkout e vedere lo sconto applicato

**Requisiti funzionali**
1. Creazione coupon da admin: codice, tipo (% o fisso), valore, validità, max_redemptions
2. Sincronizzazione con Stripe coupon API (il coupon esiste sia in DB Ulilearn sia in Stripe)
3. In checkout: campo "Hai un codice sconto?" → validazione live
4. Tracking: `redemptions_count` incrementato su redeem effettivo (non su apply)
5. Coupon validi solo su primo abbonamento OR anche su rinnovo — flag `applies_to (enum: first_payment, all)`
6. Report admin: elenco coupon con redemptions_count, ricavo netto generato

**Note tecniche**
- Stripe `promotion_codes` è il meccanismo tecnico; il record Ulilearn in DB è il "master" della logica di business

**DoD**
- Admin crea coupon → visibile in Stripe entro 5s
- Utente inserisce coupon in checkout → vede prezzo scontato prima del submit
- Coupon scaduto/esaurito rifiutato con messaggio chiaro

---

### 6.6 Area Personale Utente [MVP]

**Descrizione.** Dashboard personale dell'abbonato.

**Sezioni**
1. **Home utente** (`/io`): saluto, continua a guardare, ultime uscite, CTA esplora
2. **Il mio abbonamento** (`/io/abbonamento`):
   - Stato, prossimo rinnovo, metodo di pagamento (link portal Stripe)
   - Storico pagamenti con download ricevuta
   - Bottone "Disdici rinnovo" (apre Stripe Portal)
3. **Profilo** (`/io/profilo`): dati anagrafici, password, preferenze email
4. **Salvati** (`/io/salvati`): watchlist
5. **Cronologia visione** (`/io/cronologia`): contenuti visti con data ultima visione

**DoD**
- Ogni sezione raggiungibile in ≤2 click
- Mobile responsive

---

### 6.7 Admin Panel / CMS [MVP]

**Descrizione.** Pannello di gestione per admin ed editor. Deve permettere di pubblicare un nuovo contenuto in meno di 15 minuti dall'upload su Vimeo.

**User stories**
- Come admin, voglio caricare un nuovo documentario: cover, autore, descrizione, Vimeo ID, tag → pubblica
- Come admin, voglio vedere quanti utenti attivi ho, quanto fattura il mese, churn rate
- Come admin, voglio poter dare rimborso / estendere abbonamento a un utente singolo

**Sezioni**
1. **Dashboard** (`/admin`):
   - MRR / ARR, subscriber attivi, nuovi nel periodo, churn, contenuti più visti
2. **Contenuti** (`/admin/contenuti`):
   - Lista con filtri per tipo, stato, autore
   - Editor contenuto: form con campi del modello + drag&drop cover + preview live
   - Pubblicazione immediata o schedulata
   - Gestione corsi: aggiunta moduli e lezioni, ordinamento drag&drop
3. **Autori** (`/admin/autori`): CRUD
4. **Utenti** (`/admin/utenti`):
   - Ricerca per email/nome
   - Vista dettaglio utente: abbonamento, pagamenti, cronologia, email inviate
   - Azioni: resetta password, estendi abbonamento (+30/90/365gg gratis), annulla abbonamento, rimborso parziale/totale (via Stripe API)
5. **Coupon** (`/admin/coupon`): CRUD
6. **Piani** (`/admin/piani`): CRUD (con sync Stripe)
7. **Email** (`/admin/email`):
   - Elenco template transazionali + ultima modifica
   - Editor template (HTML + variabili)
   - Log `email_events` filtrabile
8. **Audit log** (`/admin/audit`): lista azioni admin (chi ha fatto cosa)

**Note tecniche**
- Admin è una sotto-area `/admin/*` protetta da `role=admin|editor` via middleware Next.js
- Editor markdown: `@uiw/react-md-editor` o simile
- Upload immagini: diretto a Supabase Storage con signed URL

**DoD**
- Un nuovo contenuto può essere creato, compilato e pubblicato senza uscire dal pannello
- Admin vede tutte le metriche core in dashboard
- Azioni di rimborso ed estensione funzionano e sono loggate in `audit_log`

---

### 6.8 CRM [MVP]

**Descrizione.** Vista unificata dei contatti con dati di acquisizione, consumo, revenue. Non un CRM pieno stile HubSpot: piuttosto, un "customer view" potenziato.

**Per ogni utente, l'admin vede:**
- Anagrafica, data registrazione, sorgente (UTM salvati al signup)
- Stato abbonamento, date chiave, churn-risk (basato su ultimo login/visione)
- **LTV:** sum(payments.amount) per quell'utente
- Storico pagamenti, coupon usati
- Storico visione: n° contenuti visti, minuti totali, ultimo contenuto
- Storico email: inviate, aperte, cliccate
- Tag manuali applicabili (es. "pressostampa", "partner", "rimborsato")
- Note libere

**Segmentazioni base [MVP]**
- Abbonati attivi
- Scaduti ultimi 30 gg
- Nuovi ultimi 7 gg
- Inattivi (login > 30gg)
- Per coupon usato

**Export CSV** delle segmentazioni per uso esterno (Loops, Klaviyo, ecc.)

**[v2]** Campagne email dirette dal CRM, segmenti dinamici con rule builder

**DoD**
- Ricerca utente per email/nome < 1s
- Vista utente singolo mostra tutti i dati in una pagina
- Export CSV funzionante

---

### 6.9 Email Transazionali [MVP]

**Descrizione.** Tutte le email automatiche necessarie al ciclo di vita dell'abbonato.

**Template MVP**
1. **Verifica email** (al signup)
2. **Benvenuto** (dopo verifica e primo pagamento)
3. **Ricevuta pagamento** (ad ogni transazione riuscita — con link ricevuta Stripe)
4. **Reminder rinnovo** (-7 giorni da `current_period_end`)
5. **Pagamento fallito** (dopo 1° retry fallito, con link per aggiornare carta)
6. **Accesso revocato** (dopo ultimo retry fallito o scadenza period_end)
7. **Reset password**
8. **Cancellazione confermata** (post disdetta, con info su quando scade l'accesso)
9. **[Opzionale MVP] Nuovo contenuto pubblicato** — solo se utente ha `marketing_consent=true`, max 1/settimana
10. **Inattività** (login > 30gg) — reminder gentile

**Requisiti funzionali**
- Ogni invio registrato in `email_events` (status, message_id, timestamp)
- Template in repo come file `.mjml` o React Email, renderizzati server-side
- Variabili: `{user.full_name}`, `{subscription.end_date}`, `{content.title}`, ecc.
- Unsubscribe link obbligatorio sulle email marketing (non sulle transazionali)
- Webhook Resend per tracking open/click

**DoD**
- Tutti i 10 template testati in staging
- `email_events` popolato correttamente
- Un utente unsubscribed non riceve email marketing ma riceve ancora transazionali

---

### 6.10 Analytics [MVP]

**Descrizione.** Metriche di business e prodotto visibili dall'admin.

**Metriche business**
- MRR / ARR
- Nuovi abbonati (giornalieri, settimanali, mensili)
- Churn % (mensile)
- LTV medio
- Ricavo da coupon (ricavo totale con sconto applicato)
- Conversion rate visitatore → abbonato (con UTM)

**Metriche prodotto**
- Contenuti più visti (top 20)
- Contenuti meno visti (bottom 20)
- Completamento medio per contenuto
- Minuti visti totali / per utente medio
- DAU / WAU / MAU
- Tempo medio in app per sessione

**Metriche funnel**
- Signup → Checkout → Abbonamento (con drop-off per step)
- Abbonato → prima visione (attivazione)

**Implementazione**
- Dati business: query su Postgres (materialized views per performance)
- Traffico: Plausible script su app.ulilearn.academy
- Eventi prodotto custom: tabella `events` append-only con `user_id`, `event_name`, `properties jsonb`, `created_at`

**Dashboard admin**
- 4 card in alto (MRR, abbonati attivi, churn, nuovi 30gg)
- Grafici temporali (linea) per MRR e abbonati
- Tabelle contenuti top/bottom
- Selettore range data (7g, 30g, 90g, YTD, custom)

**DoD**
- Dashboard carica in < 3s
- Metriche match con realtà Stripe (spot check)

---

## 7. Migrazione da Kajabi [MVP]

### 7.1 Scope
Migrare **solo utenti e iscritti attivi**. Contenuti e storico email NON vengono migrati (ripartenza pulita sui contenuti, che saranno ricaricati/ricuratati; storico CRM Kajabi consultabile finché Kajabi resta attivo come riferimento).

### 7.2 Approccio

**Pre-migrazione (T-30 giorni)**
- Export da Kajabi: utenti attivi (email, nome, data iscrizione, data scadenza abbonamento, coupon eventuale)
- Creazione scripts di import su Supabase
- Staging con dati reali anonymizzati

**Migrazione (T-0)**
- Import utenti in tabella `users` con flag `migrated_from_kajabi=true` e `kajabi_legacy_id`
- Per ogni utente con abbonamento attivo Kajabi:
  - Creazione record `subscriptions` con `status=active`, `current_period_end = data scadenza Kajabi`
  - **No carta registrata** (Kajabi non la trasferisce): al prossimo rinnovo l'utente dovrà riabbonarsi
- Email di comunicazione a tutti gli abbonati migrati:
  - "Ulilearn si trasferisce su una nuova piattaforma"
  - Istruzioni per impostare nuova password (link reset con token unico)
  - Rassicurazione: l'abbonamento continua fino a scadenza originale, nessun addebito imprevisto

**Post-migrazione (T+30gg)**
- A ogni abbonato in scadenza nei 30 giorni: email con link per aggiungere metodo di pagamento su Ulilearn (Stripe) e riattivare rinnovo automatico
- Dopo 3 mesi dal go-live: Kajabi disattivato

### 7.3 Rischi & mitigazioni
| Rischio | Mitigazione |
|---|---|
| Utente migra ma non imposta password → perde accesso | 3 email reminder a T+1, T+7, T+14; bottone "Richiedi nuovo link" in landing |
| Dati contabili Kajabi non recuperabili | Export completo CSV di tutto prima del disattivare Kajabi |
| Conflitto email (duplicati) | Script di merge con priorità all'email più recente |

### 7.4 DoD
- 100% utenti attivi Kajabi esistenti in Ulilearn
- Almeno 80% ha impostato la password nei primi 14 giorni
- Nessun abbonato perde accesso prima della scadenza originale

---

## 8. Flussi Utente Chiave

### 8.1 Signup + primo abbonamento
```
1. Visitatore clicca "Abbonati" su ulilearn.academy
2. → app.ulilearn.academy/abbonati (pricing page)
3. Clicca "Abbonati ora" → /signup?next=/checkout
4. Inserisce email + password → account creato (status non verificato)
5. → /checkout: Stripe Elements caricato, email precompilata
6. (Opzionale) inserisce coupon → validazione live
7. Inserisce carta → "Paga €XXX" → conferma Stripe
8. Webhook Stripe → subscription attivata → email di benvenuto
9. Utente redirect a /io/benvenuto → inizia a esplorare catalogo
```

### 8.2 Login abbonato
```
1. → /login
2. Email + password OR "Ricevi magic link"
3. → /io (home personale)
```

### 8.3 Visione contenuto
```
1. Abbonato in /catalogo → clicca tile → /documentari/[slug]
2. Clicca "Guarda ora"
3. → /watch/[id]
4. Client chiama /api/content/[id]/stream → verifica auth + abbonamento
5. Server risponde con Vimeo ID autorizzato
6. Player carica iframe Vimeo
7. timeupdate → POST /api/progress ogni 10s
```

### 8.4 Rinnovo fallito
```
1. T=0: Stripe tenta rinnovo, carta rifiutata → webhook invoice.payment_failed
2. Subscription → status=past_due
3. Email #5 "Pagamento fallito, aggiorna la carta" con link Customer Portal
4. T=3: Stripe retry → fallito → email
5. T=5: Stripe retry → fallito → email
6. T=7: Stripe retry → fallito finale → webhook customer.subscription.deleted
7. Subscription → status=expired, accesso revocato
8. Email #6 "Abbonamento scaduto, riattivalo"
```

### 8.5 Cancellazione
```
1. Utente → /io/abbonamento → "Disdici rinnovo"
2. → Stripe Customer Portal → conferma
3. Webhook customer.subscription.updated (cancel_at_period_end=true)
4. Email "Cancellazione confermata, accesso fino al [data]"
5. Alla scadenza naturale: status=expired, accesso revocato, email conferma
```

---

## 9. Design System (riepilogo)

Il design system Ulilearn è **già definito** (vedi brand guidelines). Riportato qui per comodità implementativa.

### 9.1 Tipografia
- **Oswald** (300 e Bold) per titoli
- **Open Sans** per body e sottotitoli

Entrambi caricati via `next/font/google` con `display: 'swap'`.

### 9.2 Palette

```css
/* tailwind.config.ts - extend theme */
colors: {
  ink: {
    bg: '#000000',
    900: '#111111',
    800: '#151414',
    700: '#161616',
  },
  paper: {
    50:  '#FAF9F7',
    100: '#F5F5F0',
    300: '#AAAAAA',
    400: '#888888',
  },
  accent: {
    DEFAULT: '#FCF30B', // giallo dettagli bottone
  },
}
```

### 9.3 Principi UI
- **Sfondi scuri** di default (`#161616` / `#111111`) con testo chiaro
- **Giallo `#FCF30B`** usato in modo parsimonioso come accento (bottoni primari, hover stati, indicatori "In evidenza")
- **Spaziatura ampia**, tipografia generosa, nessuna compressione visiva
- **No pop-up intrusivi**, no gamification, no countdown timer
- Animazioni lente e discrete (transizioni 200-300ms, ease-out)
- **No emoji** nell'interfaccia (coerenza col tono editoriale)

### 9.4 Componenti base da costruire
- `Button` (primary / secondary / ghost)
- `Input` / `Textarea` / `Select`
- `ContentCard` (card contenuto catalogo)
- `ContentRow` (riga orizzontale scrollable)
- `Player` (wrapper Vimeo)
- `Modal`
- `Toast`
- `EmptyState`

---

## 10. Sicurezza & Compliance

### 10.1 Sicurezza
- HTTPS ovunque (Vercel forced)
- Password hashate da Supabase (bcrypt)
- CSRF protection: Next.js Server Actions + SameSite cookies
- Rate limiting su login/signup/reset (Upstash Redis o Vercel KV)
- RLS Supabase attive su tutte le tabelle utente
- Webhook Stripe verificati con signature
- Secrets in Vercel env vars, mai in repo
- Dependabot attivo

### 10.2 Privacy / GDPR
- Cookie banner solo se si aggiungono tool con cookie non essenziali (Plausible non ne ha)
- Privacy policy + Termini aggiornati (link da footer)
- Accesso, correzione, cancellazione dati su richiesta (tramite email support + cancellazione account nel profilo)
- Data processing agreement (DPA): firma con Supabase, Stripe, Resend, Vimeo
- Consenso marketing separato e revocabile in profilo
- Log con retention 90 giorni

### 10.3 Protezione contenuti
- Vimeo domain whitelisting attivo
- Nessun download diretto esposto
- **Limite accettato:** utenti determinati possono comunque registrare lo schermo. Non si investe in DRM nell'MVP (costo/benefit non giustificato per il target Ulilearn).

---

## 11. Metriche di Successo (primi 6 mesi post-go-live)

| KPI | Target |
|---|---|
| Uptime | ≥ 99.5% |
| Crash-free sessions | ≥ 99% |
| Time-to-first-byte mediano | ≤ 800ms |
| Migrazione utenti completata | 100% |
| Abbonati migrati che settano password | ≥ 80% in 14 giorni |
| NPS (survey in-app post 30gg) | ≥ 30 |
| Activation (1a visione nei primi 7gg) | ≥ 70% |
| Churn annuale estrapolato | ≤ 25% |
| Bug critici segnalati | 0 post-go-live |

---

## 12. Rischi Principali

| Rischio | Impatto | Probabilità | Mitigazione |
|---|---|---|---|
| Migrazione Kajabi perde abbonati per frizione password | Alto | Medio | 3 email reminder, supporto umano nella prima settimana |
| Stripe webhook falliti (downtime) disallineano subscription | Alto | Basso | Idempotenza + job notturno di reconciliation Stripe ↔ DB |
| Vimeo embed aggirato da utenti esperti | Medio | Basso | Accetto; roadmap v3 valuta DRM se abuso diventa misurabile |
| Stack troppo ambizioso per solo-dev | Alto | Medio | MVP rigoroso, niente feature v2 in v1, Claude Code per accelerare |
| Costo Vimeo Business cresce oltre previsione | Medio | Medio | Monitor storage/bandwidth mensile, valuta Premium solo se numeri lo giustificano |
| Fattura elettronica richiesta da subito dal commercialista | Medio | Medio | Allineamento preventivo commercialista; in peggio, integrazione Fatture in Cloud in v1.1 |

---

## 13. Roadmap Post-MVP

### v1.1 — Consolidamento (entro 3 mesi da go-live)
- **Fatturazione elettronica italiana** (integrazione Fatture in Cloud o Qonto API; IVA corretta UE/extra-UE; gestione P.IVA/Codice destinatario in checkout)
- Analytics admin più profondi (cohort retention, funnel detail)
- Magic link + Google OAuth rifiniti
- Miglioramenti SEO catalogo (structured data, sitemap dinamico)
- Contenuto gratuito "assaggio" pubblico per lead gen

### v2 — Monetizzazione estesa (3-6 mesi)
- **Acquisto singolo di contenuti selezionati** (one-off, per chi non vuole abbonarsi)
  - Nuova entità `content_purchases`
  - Flag `purchasable_standalone` su `content_items` con `standalone_price_cents`
  - Checkout mono-prodotto
  - Accesso perpetuo per i contenuti acquistati one-off
- **Gift subscriptions** (regala un abbonamento)
- **Subscription mensile** come alternativa all'annuale (se dati di ricerca validano la domanda)
- Marketing automation via Loops/Customer.io (flow abbandono carrello, win-back)
- Raccomandazioni personalizzate per utente

### v3 — Scala (6-12 mesi)
- **App mobile nativa** (React Native) se i dati di consumo mobile lo giustificano
- **Download offline** su mobile (se Vimeo Premium attivato)
- **Live session / masterclass** programmate (Vimeo Live)
- **Playlist editoriali** curate ("Percorso sul ritratto", "Percorso sul libro fotografico")
- **Pagine tematiche** che raggruppano contenuti per concetto
- Localizzazione (EN) se apertura mercato internazionale

### Esplicitamente fuori roadmap
- Podcast nativi
- Affiliate program
- Branded app (white label)
- Community / forum
- Certificati e quiz

---

## 14. Open Questions

Da chiarire prima dell'inizio sviluppo:

1. **Prezzo abbonamento Ulilearn Plus annuale**: definito o da stabilire?
2. **Piano di fatturazione**: quando entra in v1.1? Serve già al go-live per compliance?
3. **Supporto clienti**: email @ulilearn.academy gestita manualmente o serve widget tipo Intercom/Crisp?
4. **Termini & Privacy**: esistono già per Kajabi? Vanno rifatti o adattati?
5. **Design visual**: sviluppo direttamente da design system Tailwind o serve passaggio Figma preventivo?
6. **Go-live date target**: data obiettivo per avere benchmark di priorità
7. **Gestione autori**: gli autori hanno accesso al pannello per vedere statistiche dei propri contenuti? (→ probabile v2, confermare)
8. **Refund policy**: quale policy applicare (es. 14 giorni no-questions nel primo abbonamento)?

---

## Appendice A — Struttura URL proposta

```
app.ulilearn.academy
├── /                              → redirect a /catalogo (se loggato) o landing breve (se no)
├── /catalogo                      → home catalogo pubblica
├── /lecture                       → elenco lecture
├── /corsi                         → elenco corsi
├── /documentari                   → elenco documentari
├── /[tipo]/[slug]                 → pagina contenuto singolo
├── /autori                        → elenco autori
├── /autori/[slug]                 → pagina autore
├── /ricerca                       → risultati ricerca
├── /watch/[id]                    → player (auth required)
├── /abbonati                      → pricing
├── /checkout                      → form pagamento
├── /signup, /login, /reset-password
├── /io                            → dashboard utente
│   ├── /abbonamento
│   ├── /profilo
│   ├── /salvati
│   └── /cronologia
└── /admin                         → pannello (role-gated)
    ├── /contenuti
    ├── /autori
    ├── /utenti
    ├── /coupon
    ├── /piani
    ├── /email
    └── /audit
```

## Appendice B — Variabili ambiente principali

```
# Database
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_ANNUAL=

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
PAYPAL_ENV=sandbox|live

# Vimeo
VIMEO_ACCESS_TOKEN=
VIMEO_CLIENT_ID=
VIMEO_CLIENT_SECRET=

# Email
RESEND_API_KEY=
EMAIL_FROM="Ulilearn <hello@ulilearn.academy>"

# App
NEXT_PUBLIC_APP_URL=https://app.ulilearn.academy
NEXT_PUBLIC_SITE_URL=https://ulilearn.academy
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=app.ulilearn.academy

# Sentry
SENTRY_DSN=
```

## Appendice C — Priorità di sviluppo suggerita (8 sprint da 2 settimane)

| Sprint | Focus |
|---|---|
| 1 | Setup repo, CI/CD, Supabase, auth, layout base + design system |
| 2 | Data model completo + admin contenuti (CRUD) |
| 3 | Catalogo pubblico + pagina contenuto + ricerca |
| 4 | Stripe integration + checkout + webhook |
| 5 | Player Vimeo + gating + progress tracking |
| 6 | Area utente + Stripe Portal + PayPal |
| 7 | Email transazionali + CRM admin + analytics dashboard |
| 8 | Migrazione Kajabi + polish + bugfix + go-live |

---

**Fine documento.**
