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
}).refine(
  (data) => !data.GOOGLE_CLIENT_ID === !data.GOOGLE_CLIENT_SECRET,
  { message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set or both be absent" },
).refine(
  (data) => !data.RESEND_API_KEY === !data.RESEND_FROM_EMAIL,
  { message: "RESEND_API_KEY and RESEND_FROM_EMAIL must both be set or both be absent" },
);

export type Env = z.infer<typeof envSchema>;

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

const result = envSchema.safeParse(process.env);

function parseEnv(): Env {
  if (isBuildPhase) {
    // WARNING: During `next build`, route handler modules are loaded (top-level
    // code runs) even though no HTTP requests are served. Skip throwing so the
    // build doesn't crash when env vars are absent. Real validation happens at
    // runtime startup. Do NOT add module-level code that assumes validated env
    // values outside of function bodies.
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
