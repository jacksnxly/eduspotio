import { testEnv } from "../utils/env";
import { randomEmail, randomName } from "../utils/helpers";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";

describe.sequential("withSession HOF", () => {
  let harness: IntegrationHarness;
  let signUpEmail: string;

  beforeAll(async () => {
    harness = new IntegrationHarness();
    signUpEmail = randomEmail();

    await harness.init({
      email: signUpEmail,
      name: randomName(),
    });
  });

  afterAll(async () => {
    await harness.cleanup();
  });

  test("returns 401 for unauthenticated requests (no cookies)", async () => {
    const anonHttp = new HttpClient({
      baseUrl: `${testEnv.E2E_BASE_URL}/api`,
    });

    const { data, status } = await anonHttp.get<{
      error: { code: string; message: string };
    }>({
      path: "/test/session",
    });

    expect(status).toBe(401);
    expect(data.error.code).toBe("unauthorized");
  });

  test("returns 200 with user context for authenticated requests", async () => {
    const { data, status } = await harness.http.get<{
      user: { id: string; email: string };
      method: string;
      hasRateLimitHeaders: boolean;
    }>({
      path: "/test/session",
    });

    expect(status).toBe(200);
    expect(data.user).toBeDefined();
    expect(data.user.id).toBeTypeOf("string");
    expect(data.user.email).toBeTypeOf("string");
    expect(data.method).toBe("GET");
    expect(data.hasRateLimitHeaders).toBe(true);
  });

  test("session data matches the signed-up user", async () => {
    const { data, status } = await harness.http.get<{
      user: { id: string; email: string };
    }>({
      path: "/test/session",
    });

    expect(status).toBe(200);
    expect(data.user.id).toBe(harness.user!.id);
    expect(data.user.email).toBe(signUpEmail);
  });
});
