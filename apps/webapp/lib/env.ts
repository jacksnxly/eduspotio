import { z } from "zod";

const envSchema = z.object({
  // App
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().url(),

  // Auth (BetterAuth)
  BETTER_AUTH_SECRET: z.string().min(32),

  // Google OAuth (optional — social sign-in disabled if missing)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Email (Resend — optional, logs to console in dev if missing)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // GitHub OAuth (optional — social sign-in disabled if missing)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Upstash Redis (optional — custom route rate limiting disabled if missing)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
}).refine(
  (data) => !data.GOOGLE_CLIENT_ID === !data.GOOGLE_CLIENT_SECRET,
  { message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set or both be absent" },
).refine(
  (data) => !data.RESEND_API_KEY === !data.RESEND_FROM_EMAIL,
  { message: "RESEND_API_KEY and RESEND_FROM_EMAIL must both be set or both be absent" },
).refine(
  (data) => !data.GITHUB_CLIENT_ID === !data.GITHUB_CLIENT_SECRET,
  { message: "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must both be set or both be absent" },
).refine(
  (data) => !data.UPSTASH_REDIS_REST_URL === !data.UPSTASH_REDIS_REST_TOKEN,
  { message: "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be set or both be absent" },
);

export type Env = z.infer<typeof envSchema>;

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

const result = envSchema.safeParse(process.env);

function parseEnv(): Env {
  if (isBuildPhase) {
    // WARNING: During `next build`, route handler modules are loaded (top-level
    // code runs) even though no HTTP requests are served. Env vars may be
    // undefined but code is never actually invoked for requests.
    // A Proxy trap here would be ideal but auth/index.ts requires module-level
    // env access for BetterAuth config (cannot be lazified due to type inference
    // via `typeof auth.$Infer.Session`).
    // Do NOT add module-level code that assumes validated env values outside of
    // function bodies — those paths will receive undefined at build time.
    return process.env as unknown as Env;
  }

  if (!result.success) {
    console.error(
      "Invalid environment variables:",
      result.error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables. Check server logs.");
  }

  return result.data;
}

export const env: Env = parseEnv();
