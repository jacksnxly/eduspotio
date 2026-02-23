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
});

export type Env = z.infer<typeof envSchema>;

const result = envSchema.safeParse(process.env);

// Skip validation during build phase — env vars validated at runtime startup
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (!result.success && !isBuildPhase) {
  console.error("Invalid environment variables:");
  console.error(result.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = (result.success ? result.data : process.env) as Env;
