import { db } from "@eduspot/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { Resend } from "resend";
import { env } from "../env";
import { ac, roles } from "./permissions";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

if (!resend && process.env.NODE_ENV === "production") {
  console.error(
    "[auth] CRITICAL: RESEND_API_KEY is not set in production. Email verification will fail.",
  );
}

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      if (!resend) {
        if (process.env.NODE_ENV === "production") {
          throw new Error(
            "RESEND_API_KEY is not configured. Cannot send verification email in production.",
          );
        }
        console.log(`[dev] Verification email for ${user.email}: ${url}`);
        return;
      }
      const from = env.RESEND_FROM_EMAIL ?? "noreply@mail.eduspot.io";
      const safeUrl = url.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
      try {
        await resend.emails.send({
          from: `${env.NEXT_PUBLIC_APP_NAME} <${from}>`,
          to: user.email,
          subject: "Verify your email address",
          html: `<p>Click <a href="${safeUrl}">here</a> to verify your email address.</p>`,
        });
      } catch (error) {
        console.error("[auth] Failed to send verification email:", error);
        throw error;
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
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: "compact",
    },
  },
  plugins: [
    organization({
      ac,
      roles,
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
