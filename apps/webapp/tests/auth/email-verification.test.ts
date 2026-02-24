import { neonConfig, Pool } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../../../../packages/db/src/schema";
import { testEnv } from "../utils/env";
import { randomEmail, randomName, TEST_PASSWORD } from "../utils/helpers";
import { HttpClient } from "../utils/http";

neonConfig.webSocketConstructor = ws;

// BetterAuth v1.4 uses self-contained signed tokens for email verification
// (no DB record in the verification table). These tests verify the observable
// behavior: unverified users are blocked, verified users can sign in, and
// invalid tokens are rejected.

describe.sequential("Email verification flow", () => {
  const pool = new Pool({ connectionString: testEnv.DATABASE_URL });
  const db = drizzle({ client: pool, schema });

  const createdUserIds: string[] = [];

  const http = new HttpClient({
    baseUrl: `${testEnv.E2E_BASE_URL}/api`,
  });

  afterAll(async () => {
    for (const userId of createdUserIds) {
      try {
        await db.delete(schema.user).where(eq(schema.user.id, userId));
      } catch {
        // Best-effort cleanup
      }
    }
    await pool.end();
  });

  test("sign-up creates user with emailVerified = false", async () => {
    const email = randomEmail();
    const name = randomName();

    const { data, status } = await http.post<{
      user?: { id: string; email: string; emailVerified: boolean };
      error?: { message: string };
    }>({
      path: "/auth/sign-up/email",
      body: { email, password: TEST_PASSWORD, name },
    });

    expect(status).toBe(200);
    expect(data.user).toBeDefined();
    expect(data.user!.emailVerified).toBe(false);

    createdUserIds.push(data.user!.id);

    // Confirm the DB record also shows unverified
    const users = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, data.user!.id))
      .limit(1);

    expect(users.length).toBe(1);
    expect(users[0].emailVerified).toBe(false);
  });

  test("unverified user cannot sign in", async () => {
    const email = randomEmail();

    const { data: signUpData, status: signUpStatus } = await http.post<{
      user?: { id: string };
      error?: { message: string };
    }>({
      path: "/auth/sign-up/email",
      body: { email, password: TEST_PASSWORD, name: randomName() },
    });

    expect(signUpStatus).toBe(200);
    createdUserIds.push(signUpData.user!.id);

    // Try to sign in without email verification
    const freshHttp = new HttpClient({
      baseUrl: `${testEnv.E2E_BASE_URL}/api`,
    });

    const { status: signInStatus } = await freshHttp.post<{
      error?: { message: string };
    }>({
      path: "/auth/sign-in/email",
      body: { email, password: TEST_PASSWORD },
    });

    expect(signInStatus).toBeGreaterThanOrEqual(400);
    expect(signInStatus).toBeLessThan(500);
  });

  test("after DB verification, user can sign in", async () => {
    const email = randomEmail();

    const { data: signUpData, status: signUpStatus } = await http.post<{
      user?: { id: string };
      error?: { message: string };
    }>({
      path: "/auth/sign-up/email",
      body: { email, password: TEST_PASSWORD, name: randomName() },
    });

    expect(signUpStatus).toBe(200);
    createdUserIds.push(signUpData.user!.id);

    // Verify email directly in the database (simulates clicking the link)
    await db
      .update(schema.user)
      .set({ emailVerified: true })
      .where(eq(schema.user.id, signUpData.user!.id));

    // Now sign-in should succeed
    const freshHttp = new HttpClient({
      baseUrl: `${testEnv.E2E_BASE_URL}/api`,
    });

    const { status: signInStatus } = await freshHttp.post<{
      user?: { id: string; email: string };
      error?: { message: string };
    }>({
      path: "/auth/sign-in/email",
      body: { email, password: TEST_PASSWORD },
    });

    expect(signInStatus).toBe(200);
    expect(freshHttp.hasCookies()).toBe(true);
  });

  test("invalid verification token is rejected", async () => {
    const verifyHttp = new HttpClient({
      baseUrl: `${testEnv.E2E_BASE_URL}/api`,
    });

    const { status } = await verifyHttp.get({
      path: "/auth/verify-email",
      query: { token: "completely-invalid-token-value-12345" },
    });

    // Should not succeed — either a client error or redirect
    expect(status).not.toBe(200);
    expect(status).toBeGreaterThanOrEqual(300);
  });
});
