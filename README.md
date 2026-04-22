# Ulilearn

Piattaforma proprietaria di formazione avanzata in fotografia contemporanea.
Next.js 14 + Supabase + Prisma + tRPC + Stripe + Vimeo.

## Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| DB / Auth / Storage | Supabase (Postgres) |
| ORM | Prisma |
| API | tRPC |
| Billing | Stripe (primary) + PayPal (secondary) |
| Video | Vimeo Pro/Business |
| Email | Resend + React Email |
| Hosting | Vercel |

## Quickstart

```bash
nvm use                            # Node 20
pnpm install
cp .env.example .env.local         # fill in values
pnpm prisma:generate
pnpm prisma:migrate                # applies schema to Supabase DB
pnpm dev                           # http://localhost:3000
```

## Struttura

Vedi il PRD completo in `PRD_Ulilearn_App.md` (branch `main`) per feature
requirements, data model e roadmap. Lo scaffolding di questa branch copre
lo **Sprint 1**: setup repo, Supabase, auth skeleton, layout base, design system.

```
src/
├── app/                  # Next.js App Router (route groups, API routes)
├── components/           # UI, catalog, player, checkout, admin, layout
├── server/               # tRPC routers, services, integrations, db
├── lib/                  # env, supabase clients, trpc client, utils
├── hooks/                # React client hooks
├── emails/               # React Email templates
└── types/                # shared TS types

prisma/schema.prisma      # 15-model schema (PRD §5)
supabase/migrations/      # RLS policies, storage buckets
```

## Convenzioni

- Import sempre da `@/...` (alias `src/*`)
- Codice in `src/server/` **mai** importato da file `"use client"`
- Env vars passano sempre da `src/lib/env.ts` (validate con zod)
- URL assoluti costruiti con `NEXT_PUBLIC_APP_URL`, mai hardcoded
- Conventional Commits (`feat:`, `fix:`, `chore:`)

## Deploy

Push su `main` → Vercel deploy automatico.
Preview branches create automaticamente su ogni PR.
