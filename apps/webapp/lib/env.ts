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
});

export type Env = z.infer<typeof envSchema>;

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

const result = envSchema.safeParse(process.env);

// During build phase, route handlers are evaluated at module scope but not
// executed. Return process.env so module-level reads (e.g., conditional
// Resend init) get `undefined` for missing vars rather than crashing.
// Real validation runs at runtime startup.
export const env: Env = isBuildPhase
  ? (process.env as unknown as Env)
  : (() => {
      if (!result.success) {
        console.error(
          "Invalid environment variables:",
          result.error.flatten().fieldErrors,
        );
        throw new Error("Invalid environment variables. Check server logs.");
      }
      return result.data;
    })();
