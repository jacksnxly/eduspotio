import { testEnv } from "../utils/env";
import { randomName, randomSlug } from "../utils/helpers";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";

describe.sequential("withCommunity HOF", () => {
  let owner: IntegrationHarness;
  let member: IntegrationHarness;

  let orgId: string;
  let orgSlug: string;
  let orgName: string;

  beforeAll(async () => {
    // Create the owner and an organization
    owner = new IntegrationHarness();
    await owner.init();

    orgSlug = randomSlug();
    orgName = randomName();
    const org = await owner.createOrganization(orgName, orgSlug);
    orgId = org.id;

    // Create a second user, invite them, and have them accept
    member = await owner.createSecondUser();

    // Invite second user as a member
    const { data: invite } = await owner.http.post<{ id: string }>({
      path: "/auth/organization/invite-member",
      body: {
        organizationId: orgId,
        email: member.user!.email,
        role: "member",
      },
    });

    // Accept the invitation
    await member.http.post({
      path: "/auth/organization/accept-invitation",
      body: { invitationId: invite.id },
    });
  });

  afterAll(async () => {
    await member.cleanup();
    await owner.cleanup();
  });

  test("returns 401 for unauthenticated requests", async () => {
    const anonHttp = new HttpClient({
      baseUrl: `${testEnv.E2E_BASE_URL}/api`,
    });

    const { data, status } = await anonHttp.get<{
      error: { code: string; message: string };
    }>({
      path: `/test/community/${orgSlug}`,
    });

    expect(status).toBe(401);
    expect(data.error.code).toBe("unauthorized");
  });

  test("returns 404 for a non-existent community slug", async () => {
    const { data, status } = await owner.http.get<{
      error: { code: string; message: string };
    }>({
      path: "/test/community/does-not-exist-slug-xyz",
    });

    expect(status).toBe(404);
    expect(data.error.code).toBe("not_found");
  });

  test("returns 404 for authenticated user who is not a member (org existence not leaked)", async () => {
    const outsider = await owner.createSecondUser();

    try {
      const { data, status } = await outsider.http.get<{
        error: { code: string; message: string };
      }>({
        path: `/test/community/${orgSlug}`,
      });

      // BetterAuth's getFullOrganization is session-scoped — non-members
      // can't fetch the org at all, so the HOF returns 404 (not 403).
      // This is correct: don't reveal org existence to outsiders.
      expect(status).toBe(404);
      expect(data.error.code).toBe("not_found");
    } finally {
      await outsider.cleanup();
    }
  });

  test("returns 200 with community context for a member (GET)", async () => {
    const { data, status } = await member.http.get<{
      user: { id: string; email: string };
      community: { id: string; slug: string; name: string };
      membership: { id: string; role: string };
      hasRateLimitHeaders: boolean;
    }>({
      path: `/test/community/${orgSlug}`,
    });

    expect(status).toBe(200);
    expect(data.user.id).toBe(member.user!.id);
    expect(data.community.id).toBe(orgId);
    expect(data.community.slug).toBe(orgSlug);
    expect(data.community.name).toBe(orgName);
    expect(data.membership.role).toBe("member");
    expect(data.hasRateLimitHeaders).toBe(true);
  });

  test("returns 403 when member lacks required permissions (POST requires community:delete)", async () => {
    const { data, status } = await member.http.post<{
      error: { code: string; message: string };
    }>({
      path: `/test/community/${orgSlug}`,
      body: { title: "Test Post", description: "test" },
    });

    expect(status).toBe(403);
    expect(data.error.code).toBe("forbidden");
  });

  test("returns 200 when owner has required permissions (POST requires community:delete)", async () => {
    const { data, status } = await owner.http.post<{
      success: boolean;
      communityId: string;
      userId: string;
    }>({
      path: `/test/community/${orgSlug}`,
      body: { title: "Test Post", description: "test" },
    });

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.communityId).toBe(orgId);
    expect(data.userId).toBe(owner.user!.id);
  });

  test("community context data matches the created organization", async () => {
    const { data, status } = await owner.http.get<{
      user: { id: string; email: string };
      community: { id: string; slug: string; name: string };
      membership: { id: string; role: string };
    }>({
      path: `/test/community/${orgSlug}`,
    });

    expect(status).toBe(200);
    expect(data.user.id).toBe(owner.user!.id);
    expect(data.community.id).toBe(orgId);
    expect(data.community.slug).toBe(orgSlug);
    expect(data.community.name).toBe(orgName);
    expect(data.membership.role).toBe("owner");
  });
});
