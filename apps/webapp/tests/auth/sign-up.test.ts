import { neonConfig, Pool } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../../../../packages/db/src/schema";
import { testEnv } from "../utils/env";
import { randomEmail, randomName, TEST_PASSWORD } from "../utils/helpers";
import { HttpClient } from "../utils/http";

neonConfig.webSocketConstructor = ws;

describe.sequential("POST /api/auth/sign-up/email", () => {
  const http = new HttpClient({
    baseUrl: `${testEnv.E2E_BASE_URL}/api`,
  });

  const pool = new Pool({ connectionString: testEnv.DATABASE_URL });
  const db = drizzle({ client: pool, schema });

  const createdUserIds: string[] = [];

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

  test("creates a user with email and password", async () => {
    const email = randomEmail();
    const name = randomName();

    const { data, status } = await http.post<{
      user?: {
        id: string;
        email: string;
        name: string;
        emailVerified: boolean;
      };
      error?: { message: string };
    }>({
      path: "/auth/sign-up/email",
      body: { email, password: TEST_PASSWORD, name },
    });

    expect(status).toBe(200);
    expect(data.user).toBeDefined();
    expect(data.user!.id).toBeTypeOf("string");
    expect(data.user!.email).toBe(email);
    expect(data.user!.name).toBe(name);
    expect(data.user!.emailVerified).toBe(false);

    createdUserIds.push(data.user!.id);
  });

  test("duplicate email returns an error", async () => {
    const email = randomEmail();
    const name = randomName();

    // First sign-up should succeed
    const { data: firstData, status: firstStatus } = await http.post<{
      user?: { id: string };
      error?: { message: string };
    }>({
      path: "/auth/sign-up/email",
      body: { email, password: TEST_PASSWORD, name },
    });

    expect(firstStatus).toBe(200);
    expect(firstData.user).toBeDefined();
    createdUserIds.push(firstData.user!.id);

    // Second sign-up with the same email should fail
    const { status: secondStatus } = await http.post<{
      error?: { message: string };
    }>({
      path: "/auth/sign-up/email",
      body: { email, password: TEST_PASSWORD, name: randomName() },
    });

    // BetterAuth returns 422 or 409 for duplicate email
    expect(secondStatus).toBeGreaterThanOrEqual(400);
    expect(secondStatus).toBeLessThan(500);
  });

  test("invalid email format returns an error", async () => {
    const { status } = await http.post<{
      error?: { message: string };
    }>({
      path: "/auth/sign-up/email",
      body: {
        email: "not-an-email",
        password: TEST_PASSWORD,
        name: randomName(),
      },
    });

    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
  });

  test("weak or short password returns an error", async () => {
    const { status } = await http.post<{
      error?: { message: string };
    }>({
      path: "/auth/sign-up/email",
      body: { email: randomEmail(), password: "ab", name: randomName() },
    });

    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
  });

  test("missing required fields returns an error", async () => {
    // Missing email
    const { status: noEmail } = await http.post<{
      error?: { message: string };
    }>({
      path: "/auth/sign-up/email",
      body: { password: TEST_PASSWORD, name: randomName() },
    });

    expect(noEmail).toBeGreaterThanOrEqual(400);
    expect(noEmail).toBeLessThan(500);

    // Missing password
    const { status: noPassword } = await http.post<{
      error?: { message: string };
    }>({
      path: "/auth/sign-up/email",
      body: { email: randomEmail(), name: randomName() },
    });

    expect(noPassword).toBeGreaterThanOrEqual(400);
    expect(noPassword).toBeLessThan(500);

    // Missing name
    const { status: noName } = await http.post<{
      error?: { message: string };
    }>({
      path: "/auth/sign-up/email",
      body: { email: randomEmail(), password: TEST_PASSWORD },
    });

    expect(noName).toBeGreaterThanOrEqual(400);
    expect(noName).toBeLessThan(500);
  });
});
