import { randomName, randomSlug } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";

describe.sequential("Organization CRUD", () => {
  let h: IntegrationHarness;
  let orgId: string;
  let orgName: string;
  let orgSlug: string;

  beforeAll(async () => {
    h = new IntegrationHarness();
    await h.init();

    orgName = randomName();
    orgSlug = randomSlug();
  });

  afterAll(async () => {
    await h.cleanup();
  });

  test("create organization", async () => {
    const { data, status } = await h.http.post<{
      id?: string;
      name?: string;
      slug?: string;
      createdAt?: string;
      error?: { message: string };
    }>({
      path: "/auth/organization/create",
      body: { name: orgName, slug: orgSlug },
    });

    expect(status).toBe(200);
    expect(data).toBeDefined();
    expect(data.id).toBeTypeOf("string");
    expect(data.name).toBe(orgName);
    expect(data.slug).toBe(orgSlug);

    orgId = data.id!;
    h.trackOrgId(orgId);
  });

  test("list organizations includes the created org", async () => {
    const { data, status } = await h.http.get<
      | Array<{ id: string; name: string; slug: string }>
      | { error?: { message: string } }
    >({
      path: "/auth/organization/list",
    });

    expect(status).toBe(200);

    // BetterAuth may wrap the list in different shapes; handle both
    const orgs = Array.isArray(data) ? data : [];
    expect(orgs.length).toBeGreaterThanOrEqual(1);

    const found = orgs.find((o) => o.id === orgId);
    expect(found).toBeDefined();
    expect(found!.name).toBe(orgName);
    expect(found!.slug).toBe(orgSlug);
  });

  test("get full organization returns org with members", async () => {
    const { data, status } = await h.http.get<{
      id?: string;
      name?: string;
      slug?: string;
      members?: Array<{
        id: string;
        userId: string;
        role: string;
        organizationId: string;
      }>;
      error?: { message: string };
    }>({
      path: "/auth/organization/get-full-organization",
      query: { organizationSlug: orgSlug },
    });

    expect(status).toBe(200);
    expect(data).toBeDefined();
    expect(data.id).toBe(orgId);
    expect(data.name).toBe(orgName);

    // The creator should appear as a member with "owner" role
    expect(data.members).toBeDefined();
    expect(data.members!.length).toBeGreaterThanOrEqual(1);

    const ownerMember = data.members!.find((m) => m.userId === h.user!.id);
    expect(ownerMember).toBeDefined();
    expect(ownerMember!.role).toBe("owner");
  });

  test("set active organization", async () => {
    const { data, status } = await h.http.post<{
      id?: string;
      organizationId?: string;
      error?: { message: string };
    }>({
      path: "/auth/organization/set-active",
      body: { organizationId: orgId },
    });

    expect(status).toBe(200);
    expect(data).toBeDefined();
    // The response may contain the session or org info; just confirm success
  });

  test("duplicate slug returns an error", async () => {
    const { status } = await h.http.post<{
      error?: { message: string };
    }>({
      path: "/auth/organization/create",
      body: { name: randomName(), slug: orgSlug },
    });

    // BetterAuth returns a 4xx error for duplicate slug
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
  });
});
