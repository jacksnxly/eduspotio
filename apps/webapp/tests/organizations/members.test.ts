import { randomEmail, randomName, randomSlug } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";

describe.sequential("Organization Members", () => {
  let owner: IntegrationHarness;
  let member: IntegrationHarness;

  let orgId: string;
  let orgSlug: string;
  let invitationId: string;
  let secondUserMemberId: string;

  beforeAll(async () => {
    // Create the owner (first user) and an organization
    owner = new IntegrationHarness();
    await owner.init();

    orgSlug = randomSlug();
    const org = await owner.createOrganization(randomName(), orgSlug);
    orgId = org.id;

    // Create a second verified user with separate cookies
    member = await owner.createSecondUser();
  });

  afterAll(async () => {
    // Both harnesses clean up their own users; owner also cleans up the org
    await member.cleanup();
    await owner.cleanup();
  });

  test("invite member by email", async () => {
    const { data, status } = await owner.http.post<{
      id?: string;
      organizationId?: string;
      email?: string;
      role?: string;
      status?: string;
      error?: { message: string };
    }>({
      path: "/auth/organization/invite-member",
      body: {
        organizationId: orgId,
        email: member.user!.email,
        role: "member",
      },
    });

    expect(status).toBe(200);
    expect(data).toBeDefined();
    expect(data.id).toBeTypeOf("string");
    expect(data.email).toBe(member.user!.email);
    expect(data.role).toBe("member");

    invitationId = data.id!;
  });

  test("accept invitation (second user becomes member)", async () => {
    const { data, status } = await member.http.post<{
      member?: {
        id: string;
        userId: string;
        organizationId: string;
        role: string;
      };
      id?: string;
      userId?: string;
      organizationId?: string;
      role?: string;
      error?: { message: string };
    }>({
      path: "/auth/organization/accept-invitation",
      body: { invitationId },
    });

    expect(status).toBe(200);
    expect(data).toBeDefined();

    // BetterAuth may return the member record directly or nested under `member`
    const memberRecord = data.member ?? data;
    expect(memberRecord.organizationId).toBe(orgId);
    expect(memberRecord.role).toBe("member");

    // Store the member ID for later tests
    secondUserMemberId = memberRecord.id!;
  });

  test("update member role (owner promotes member to creator)", async () => {
    const { data, status } = await owner.http.post<{
      id?: string;
      role?: string;
      error?: { message: string };
    }>({
      path: "/auth/organization/update-member-role",
      body: {
        memberId: secondUserMemberId,
        role: "creator",
        organizationId: orgId,
      },
    });

    expect(status).toBe(200);
    expect(data).toBeDefined();

    // Verify the role was updated by fetching the full org
    const { data: fullOrg } = await owner.http.get<{
      members?: Array<{ id: string; userId: string; role: string }>;
    }>({
      path: "/auth/organization/get-full-organization",
      query: { organizationSlug: orgSlug },
    });

    const updated = fullOrg.members?.find((m) => m.id === secondUserMemberId);
    expect(updated).toBeDefined();
    expect(updated!.role).toBe("creator");
  });

  test("creator cannot invite (lacks invitation:create permission)", async () => {
    const thirdEmail = randomEmail();

    const { status } = await member.http.post<{
      error?: { message: string };
    }>({
      path: "/auth/organization/invite-member",
      body: {
        organizationId: orgId,
        email: thirdEmail,
        role: "member",
      },
    });

    // Creators do not have invitation:create — expect 403
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
  });

  test("remove member (owner removes second user)", async () => {
    const { data, status } = await owner.http.post<{
      id?: string;
      success?: boolean;
      error?: { message: string };
    }>({
      path: "/auth/organization/remove-member",
      body: {
        memberIdOrEmail: secondUserMemberId,
        organizationId: orgId,
      },
    });

    expect(status).toBe(200);
    expect(data).toBeDefined();

    // Verify the member is no longer in the org
    const { data: fullOrg } = await owner.http.get<{
      members?: Array<{ id: string; userId: string; role: string }>;
    }>({
      path: "/auth/organization/get-full-organization",
      query: { organizationSlug: orgSlug },
    });

    const removed = fullOrg.members?.find((m) => m.id === secondUserMemberId);
    expect(removed).toBeUndefined();
  });
});
