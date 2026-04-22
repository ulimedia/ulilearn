import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID_ANNUAL: z.string().min(1),

  PAYPAL_CLIENT_ID: z.string().min(1).optional(),
  PAYPAL_SECRET: z.string().min(1).optional(),
  PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),

  VIMEO_ACCESS_TOKEN: z.string().min(1),
  VIMEO_CLIENT_ID: z.string().min(1).optional(),
  VIMEO_CLIENT_SECRET: z.string().min(1).optional(),

  RESEND_API_KEY: z.string().min(1),
  RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).default("Ulilearn <hello@ulilearn.academy>"),

  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  SENTRY_DSN: z.string().url().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().min(1).optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

const clientValues = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
};

const isServer = typeof window === "undefined";

function format(error: z.ZodError) {
  return error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
}

const clientParsed = clientSchema.safeParse(clientValues);
if (!clientParsed.success) {
  throw new Error(
    `Invalid client environment variables:\n${format(clientParsed.error)}\n\nSee .env.example`,
  );
}

let serverParsed: z.infer<typeof serverSchema> | undefined;
if (isServer) {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      `Invalid server environment variables:\n${format(result.error)}\n\nSee .env.example`,
    );
  }
  serverParsed = result.data;
}

export const env = {
  ...clientParsed.data,
  ...(serverParsed ?? {}),
} as z.infer<typeof clientSchema> & Partial<z.infer<typeof serverSchema>>;

export type Env = typeof env;
