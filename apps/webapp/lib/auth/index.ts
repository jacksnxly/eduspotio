import { db } from "@eduspot/db";
import { user as userTable } from "@eduspot/db";
import { eq, sql } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, apiKey, bearer, organization } from "better-auth/plugins";
import { Resend } from "resend";
import { logger } from "@/lib/axiom";
import { env } from "../env";
import { ac, roles } from "./permissions";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

if (!resend && process.env.NODE_ENV === "production") {
  throw new Error(
    "[auth] FATAL: RESEND_API_KEY is not set in production. " +
    "Email verification is required but cannot send emails. " +
    "Set RESEND_API_KEY and RESEND_FROM_EMAIL to enable email delivery.",
  );
}

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 minutes

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  rateLimit: {
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 10, max: 3 },
      "/sign-up/email": { window: 10, max: 3 },
      "/forget-password": { window: 60, max: 3 },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      if (!resend) {
        if (process.env.NODE_ENV === "production") {
          throw new Error(
            "RESEND_API_KEY is not configured. Cannot send password reset email in production.",
          );
        }
        logger.info("[dev] Password reset email", { email: user.email, url });
        return;
      }
      // Guaranteed by env.ts refine: RESEND_API_KEY and RESEND_FROM_EMAIL are always paired
      const from = env.RESEND_FROM_EMAIL!;
      const safeUrl = url
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#x27;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

      const { error: sendError } = await resend.emails.send({
        from: `${env.NEXT_PUBLIC_APP_NAME} <${from}>`,
        to: user.email,
        subject: "Reset your password",
        html: `<p>Click <a href="${safeUrl}">here</a> to reset your password.</p>`,
      });
      if (sendError) {
        logger.error("[auth] Resend API error sending password reset email", {
          errorName: sendError.name,
          errorMessage: sendError.message,
          userEmail: user.email,
        });
        throw new Error(
          `Failed to send password reset email: ${sendError.message}`,
        );
      }
    },
  },
  emailVerification: {
    // KNOWN LIMITATION: BetterAuth persists the user BEFORE calling
    // sendVerificationEmail. If this callback throws, the user exists in DB
    // but the client sees 500. A "resend verification email" endpoint is
    // required to recover from this state.
    // See: https://github.com/better-auth/better-auth/issues/6436
    sendVerificationEmail: async ({ user, url }) => {
      if (!resend) {
        if (process.env.NODE_ENV === "production") {
          throw new Error(
            "RESEND_API_KEY is not configured. Cannot send verification email in production.",
          );
        }
        logger.info("[dev] Verification email", { email: user.email, url });
        return;
      }
      // Guaranteed by env.ts refine: RESEND_API_KEY and RESEND_FROM_EMAIL are always paired
      const from = env.RESEND_FROM_EMAIL!;
      const safeUrl = url
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#x27;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

      const { error: sendError } = await resend.emails.send({
        from: `${env.NEXT_PUBLIC_APP_NAME} <${from}>`,
        to: user.email,
        subject: "Verify your email address",
        html: `<p>Click <a href="${safeUrl}">here</a> to verify your email address.</p>`,
      });
      if (sendError) {
        logger.error("[auth] Resend API error sending verification email", {
          errorName: sendError.name,
          errorMessage: sendError.message,
          userEmail: user.email,
        });
        throw new Error(
          `Failed to send verification email: ${sendError.message}`,
        );
      }
    },
  },
  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET && {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }),
    ...(env.GITHUB_CLIENT_ID &&
      env.GITHUB_CLIENT_SECRET && {
        github: {
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
        },
      }),
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: "compact",
    },
  },
  user: {
    additionalFields: {
      invalidLoginAttempts: {
        type: "number",
        defaultValue: 0,
        required: false,
        input: false,
      },
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;
      const email = (ctx.body as Record<string, unknown> | undefined)?.email;
      if (!email || typeof email !== "string") return;

      const response = ctx.context?.returned as Response | undefined;
      if (!response) return;

      if (response.ok) {
        // Successful login — reset counter via direct DB query
        // (invalidLoginAttempts has input: false — auth.api.updateUser rejects it with 400)
        const [loggedInUser] = await db
          .select({ id: userTable.id })
          .from(userTable)
          .where(eq(userTable.email, email))
          .limit(1);
        if (loggedInUser) {
          await db
            .update(userTable)
            .set({ invalidLoginAttempts: 0 })
            .where(eq(userTable.id, loggedInUser.id))
            .catch((err) => {
              logger.warn("Lockout counter reset failed", {
                type: "lockout_counter_reset_failed",
                userId: loggedInUser.id,
                error: err instanceof Error ? err.message : String(err),
              });
            });
        }
      } else {
        // Failed login — increment counter (best-effort, must not corrupt the auth response)
        try {
          const [result] = await db
            .update(userTable)
            .set({
              invalidLoginAttempts: sql`${userTable.invalidLoginAttempts} + 1`,
            })
            .where(eq(userTable.email, email))
            .returning({
              id: userTable.id,
              invalidLoginAttempts: userTable.invalidLoginAttempts,
            });

          if (result && result.invalidLoginAttempts >= LOCKOUT_THRESHOLD) {
            await auth.api.banUser({
              body: {
                userId: result.id,
                banExpiresIn: LOCKOUT_DURATION_SECONDS,
                banReason: "Too many failed login attempts",
              },
            });
          }
        } catch (err) {
          logger.error("Lockout increment failed", {
            type: "lockout_increment_failed",
            email,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }),
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;
      const email = (ctx.body as Record<string, unknown> | undefined)?.email;
      if (!email || typeof email !== "string") return;

      const [existingUser] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, email))
        .limit(1);

      if (existingUser?.banned) {
        if (
          existingUser.banExpires &&
          new Date(existingUser.banExpires) > new Date()
        ) {
          // Ban is active
          const retryAfter = Math.ceil(
            (new Date(existingUser.banExpires).getTime() - Date.now()) / 1000,
          );
          throw new APIError("TOO_MANY_REQUESTS", {
            message:
              "Account temporarily locked due to too many failed login attempts.",
            headers: { "Retry-After": String(retryAfter) },
          });
        } else {
          // Ban expired — reset counter so user gets a fresh set of attempts
          await db
            .update(userTable)
            .set({ invalidLoginAttempts: 0, banned: false })
            .where(eq(userTable.id, existingUser.id))
            .catch((err) => {
              logger.warn("Expired ban reset failed", {
                type: "expired_ban_reset_failed",
                userId: existingUser.id,
                error: err instanceof Error ? err.message : String(err),
              });
            });
        }
      }
    }),
  },
  plugins: [
    organization({
      ac,
      roles,
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
      // BetterAuth accepts custom fields at runtime but its TS types don't
      // include them — assert to satisfy the type checker.
      schema: {
        organization: {
          fields: {
            plan: {
              type: "string",
              defaultValue: "free",
              required: false,
              input: false,
            },
          },
        } as Record<string, unknown>,
      },
    }),
    admin(),
    apiKey({
      defaultPrefix: "edsp",
      enableSessionForAPIKeys: true,
      enableMetadata: true,
      rateLimit: {
        enabled: true,
        timeWindow: 60_000,
        maxRequests: 60,
      },
    }),
    bearer(),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
