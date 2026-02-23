import { testEnv } from "../utils/env";
import { randomEmail, randomName, TEST_PASSWORD } from "../utils/helpers";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";

describe.sequential("POST /api/auth/sign-in/email", () => {
  let harness: IntegrationHarness;
  let verifiedEmail: string;
  let verifiedName: string;

  beforeAll(async () => {
    harness = new IntegrationHarness();
    verifiedEmail = randomEmail();
    verifiedName = randomName();

    await harness.init({
      email: verifiedEmail,
      name: verifiedName,
    });
  });

  afterAll(async () => {
    await harness.cleanup();
  });

  test("successful sign-in sets session cookies and returns user data", async () => {
    // Use a fresh HttpClient so we start without cookies
    const freshHttp = new HttpClient({
      baseUrl: `${testEnv.E2E_BASE_URL}/api`,
    });

    const { data, status } = await freshHttp.post<{
      token?: string;
      user?: { id: string; email: string; name: string };
      error?: { message: string };
    }>({
      path: "/auth/sign-in/email",
      body: { email: verifiedEmail, password: TEST_PASSWORD },
    });

    expect(status).toBe(200);
    expect(data.user).toBeDefined();
    expect(data.user!.email).toBe(verifiedEmail);
    expect(data.user!.name).toBe(verifiedName);
    expect(data.token).toBeTypeOf("string");

    // HttpClient should now have session cookies
    expect(freshHttp.hasCookies()).toBe(true);
  });

  test("wrong password returns an error", async () => {
    const freshHttp = new HttpClient({
      baseUrl: `${testEnv.E2E_BASE_URL}/api`,
    });

    const { status } = await freshHttp.post<{
      error?: { message: string };
    }>({
      path: "/auth/sign-in/email",
      body: { email: verifiedEmail, password: "WrongPassword999!" },
    });

    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
    expect(freshHttp.hasCookies()).toBe(false);
  });

  test("non-existent email returns an error", async () => {
    const freshHttp = new HttpClient({
      baseUrl: `${testEnv.E2E_BASE_URL}/api`,
    });

    const { status } = await freshHttp.post<{
      error?: { message: string };
    }>({
      path: "/auth/sign-in/email",
      body: { email: randomEmail(), password: TEST_PASSWORD },
    });

    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
    expect(freshHttp.hasCookies()).toBe(false);
  });

  test("unverified email is blocked from signing in", async () => {
    // Create a second user without email verification
    const unverifiedHarness = new IntegrationHarness();
    const unverifiedEmail = randomEmail();

    try {
      // Sign up but skip verification — init() will fail at sign-in step,
      // so we do sign-up manually
      const signUpHttp = new HttpClient({
        baseUrl: `${testEnv.E2E_BASE_URL}/api`,
      });

      const { data: signUpData, status: signUpStatus } = await signUpHttp.post<{
        user?: { id: string; email: string };
        error?: { message: string };
      }>({
        path: "/auth/sign-up/email",
        body: {
          email: unverifiedEmail,
          password: TEST_PASSWORD,
          name: randomName(),
        },
      });

      expect(signUpStatus).toBe(200);
      expect(signUpData.user).toBeDefined();

      // Track the user for cleanup
      unverifiedHarness.trackUserId(signUpData.user!.id);

      // Now try to sign in without verifying email
      const freshHttp = new HttpClient({
        baseUrl: `${testEnv.E2E_BASE_URL}/api`,
      });

      const { status: signInStatus } = await freshHttp.post<{
        error?: { message: string };
      }>({
        path: "/auth/sign-in/email",
        body: { email: unverifiedEmail, password: TEST_PASSWORD },
      });

      // BetterAuth blocks sign-in for unverified emails
      expect(signInStatus).toBeGreaterThanOrEqual(400);
      expect(signInStatus).toBeLessThan(500);
    } finally {
      await unverifiedHarness.cleanup();
    }
  });
});
