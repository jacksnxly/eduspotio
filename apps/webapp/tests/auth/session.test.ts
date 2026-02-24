import { testEnv } from "../utils/env";
import { randomEmail, randomName } from "../utils/helpers";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";

describe.sequential("GET /api/auth/get-session", () => {
  let harness: IntegrationHarness;
  let signUpEmail: string;
  let signUpName: string;

  beforeAll(async () => {
    harness = new IntegrationHarness();
    signUpEmail = randomEmail();
    signUpName = randomName();

    await harness.init({
      email: signUpEmail,
      name: signUpName,
    });
  });

  afterAll(async () => {
    await harness.cleanup();
  });

  test("returns session data for an authenticated user", async () => {
    const { data, status } = await harness.http.get<{
      user?: {
        id: string;
        email: string;
        name: string;
        emailVerified: boolean;
      };
      session?: {
        id: string;
        token: string;
        expiresAt: string;
        userId: string;
      };
    }>({
      path: "/auth/get-session",
    });

    expect(status).toBe(200);
    expect(data.user).toBeDefined();
    expect(data.user!.id).toBeTypeOf("string");
    expect(data.session).toBeDefined();
    expect(data.session!.id).toBeTypeOf("string");
    expect(data.session!.userId).toBe(data.user!.id);
  });

  test("returns null without cookies (unauthenticated)", async () => {
    const anonHttp = new HttpClient({
      baseUrl: `${testEnv.E2E_BASE_URL}/api`,
    });

    const { data, status } = await anonHttp.get<{
      user?: { id: string } | null;
      session?: { id: string } | null;
    } | null>({
      path: "/auth/get-session",
    });

    // BetterAuth may return 200 with null or 401
    if (status === 200) {
      const isNullSession =
        data === null || data?.user === null || data?.user === undefined;
      expect(isNullSession).toBe(true);
    } else {
      expect(status).toBe(401);
    }
  });

  test("session contains correct user data matching sign-up", async () => {
    const { data, status } = await harness.http.get<{
      user?: {
        id: string;
        email: string;
        name: string;
        emailVerified: boolean;
      };
      session?: { id: string };
    }>({
      path: "/auth/get-session",
    });

    expect(status).toBe(200);
    expect(data.user).toBeDefined();
    expect(data.user!.email).toBe(signUpEmail);
    expect(data.user!.name).toBe(signUpName);
    expect(data.user!.emailVerified).toBe(true); // verified during init()
  });
});
