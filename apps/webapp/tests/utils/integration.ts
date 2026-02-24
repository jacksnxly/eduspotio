import { neonConfig, Pool } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../../../../packages/db/src/schema";
import { testEnv } from "./env";
import { randomEmail, randomName, TEST_PASSWORD } from "./helpers";
import { HttpClient } from "./http";

neonConfig.webSocketConstructor = ws;

type UserData = {
  id: string;
  email: string;
  name: string;
};

type InitOptions = {
  email?: string;
  password?: string;
  name?: string;
  skipVerification?: boolean;
};

export class IntegrationHarness {
  public http: HttpClient;
  public user: UserData | null = null;

  private email: string;
  private password: string;
  private name: string;
  private pool: Pool;
  private db: ReturnType<typeof drizzle>;
  private createdUserIds: string[] = [];
  private createdOrgIds: string[] = [];

  constructor() {
    this.http = new HttpClient({
      baseUrl: `${testEnv.E2E_BASE_URL}/api`,
    });
    this.email = randomEmail();
    this.password = TEST_PASSWORD;
    this.name = randomName();

    this.pool = new Pool({ connectionString: testEnv.DATABASE_URL });
    this.db = drizzle({ client: this.pool, schema });
  }

  async init(opts?: InitOptions) {
    this.email = opts?.email ?? this.email;
    this.password = opts?.password ?? this.password;
    this.name = opts?.name ?? this.name;

    // 1. Sign up
    const { data: signUpData, status: signUpStatus } = await this.http.post<{
      user?: { id: string; email: string; name: string };
      error?: { message: string };
    }>({
      path: "/auth/sign-up/email",
      body: {
        email: this.email,
        password: this.password,
        name: this.name,
      },
    });

    if (signUpStatus !== 200 || !signUpData.user) {
      throw new Error(
        `Sign-up failed (${signUpStatus}): ${JSON.stringify(signUpData)}`,
      );
    }

    this.user = signUpData.user;
    this.createdUserIds.push(signUpData.user.id);

    // 2. Verify email via DB query (can't check real inbox)
    if (!opts?.skipVerification) {
      await this.verifyEmailViaDB(this.email);
    }

    // 3. Sign in to get session cookies
    const { status: signInStatus } = await this.http.post({
      path: "/auth/sign-in/email",
      body: {
        email: this.email,
        password: this.password,
      },
    });

    if (signInStatus !== 200) {
      throw new Error(`Sign-in failed (${signInStatus})`);
    }

    return {
      http: this.http,
      user: this.user,
    };
  }

  private async verifyEmailViaDB(email: string): Promise<void> {
    // BetterAuth v1.4 uses self-contained signed tokens for email verification
    // (no DB record in the verification table). For test setup, we directly
    // mark the user as verified in the database.
    await this.db
      .update(schema.user)
      .set({ emailVerified: true })
      .where(eq(schema.user.email, email));
  }

  async createOrganization(
    name: string,
    slug: string,
  ): Promise<{ id: string; name: string; slug: string }> {
    const { data, status } = await this.http.post<{
      id: string;
      name: string;
      slug: string;
    }>({
      path: "/auth/organization/create",
      body: { name, slug },
    });

    if (status !== 200) {
      throw new Error(
        `Create organization failed (${status}): ${JSON.stringify(data)}`,
      );
    }

    this.createdOrgIds.push(data.id);

    // Set as active organization
    await this.http.post({
      path: "/auth/organization/set-active",
      body: { organizationId: data.id },
    });

    return data;
  }

  async createSecondUser(opts?: InitOptions): Promise<IntegrationHarness> {
    const harness = new IntegrationHarness();
    await harness.init(opts);
    return harness;
  }

  async cleanup(): Promise<void> {
    try {
      // Delete organizations first (cascades to members + invitations)
      for (const orgId of this.createdOrgIds) {
        await this.db
          .delete(schema.organization)
          .where(eq(schema.organization.id, orgId));
      }

      // Delete users (cascades to sessions, accounts, verifications)
      for (const userId of this.createdUserIds) {
        await this.db.delete(schema.user).where(eq(schema.user.id, userId));
      }
    } catch {
      // Best-effort cleanup — don't fail tests if cleanup fails
    } finally {
      await this.pool.end();
    }
  }

  trackUserId(userId: string): void {
    this.createdUserIds.push(userId);
  }

  trackOrgId(orgId: string): void {
    this.createdOrgIds.push(orgId);
  }
}
