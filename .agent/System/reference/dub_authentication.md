# Dub.co Authentication Analysis

Detailed analysis of Dub.co's authentication implementation.

---

## Auth Stack

| Component | Technology |
|-----------|------------|
| Core Library | NextAuth.js (Auth.js) |
| Adapter | Prisma Adapter (custom) |
| Session Strategy | JWT |
| Password Hashing | bcryptjs (12 rounds) |
| Rate Limiting | Upstash Redis |
| Enterprise SSO | BoxyHQ Jackson |
| Email | Resend |

---

## Auth Providers

| Provider | Type | Implementation |
|----------|------|----------------|
| Email | Magic Link | `EmailProvider` - sends login links |
| Google | OAuth 2.0 | `GoogleProvider` |
| GitHub | OAuth 2.0 | `GithubProvider` |
| Credentials | Password | Custom `CredentialsProvider` |
| SAML | Enterprise SSO | BoxyHQ Jackson integration |
| Framer | OAuth 2.0 | Custom OAuth provider |

---

## NextAuth.js Configuration

### Session Strategy

```typescript
session: { strategy: "jwt" }
```

JWT-based sessions scale better than database sessions for serverless.

### Cookie Configuration

```typescript
cookies: {
  sessionToken: {
    name: `__Secure-next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      domain: `.${APP_DOMAIN}`, // Subdomain support
      secure: true,
    }
  }
}
```

### Custom Prisma Adapter

```typescript
const CustomPrismaAdapter = (p: PrismaClient) => {
  return {
    ...PrismaAdapter(p),
    createUser: async (data: any) => {
      return p.user.create({
        data: {
          ...data,
          id: createId({ prefix: "user_" }), // Prefixed IDs
          notificationPreferences: {
            create: {},
          },
        },
      });
    },
  };
};
```

---

## Password Authentication

### Hashing

```typescript
import { compare, hash } from "bcryptjs";

// Hash password (12 rounds)
export async function hashPassword(password: string) {
  return await hash(password, 12);
}

// Validate password
export async function validatePassword({
  password,
  passwordHash,
}: {
  password: string;
  passwordHash: string;
}) {
  return await compare(password, passwordHash);
}
```

### Login Flow

```typescript
CredentialsProvider({
  id: "credentials",
  credentials: {
    email: { type: "email" },
    password: { type: "password" },
  },
  async authorize(credentials, req) {
    // 1. Rate limiting (5 attempts per minute)
    const { success } = await ratelimit(5, "1 m").limit(
      `login-attempts:${email}`
    );
    if (!success) throw new Error("too-many-login-attempts");

    // 2. Check SSO enforcement
    const ssoEnforced = await isSamlEnforcedForEmailDomain(email);
    if (ssoEnforced) throw new Error("require-saml-sso");

    // 3. Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id, passwordHash, invalidLoginAttempts, emailVerified }
    });

    // 4. Check account lockout
    if (exceededLoginAttemptsThreshold(user)) {
      throw new Error("exceeded-login-attempts");
    }

    // 5. Validate password
    const passwordMatch = await validatePassword({ password, passwordHash });
    if (!passwordMatch) {
      await incrementLoginAttempts(user);
      throw new Error("invalid-credentials");
    }

    // 6. Check email verification
    if (!user.emailVerified) throw new Error("email-not-verified");

    // 7. Reset login attempts & return user
    await prisma.user.update({
      where: { id: user.id },
      data: { invalidLoginAttempts: 0 }
    });

    return { id, name, email, image };
  }
})
```

### Account Lockout

```typescript
// Constants
const MAX_LOGIN_ATTEMPTS = 5;

// Increment failed attempts
export const incrementLoginAttempts = async (user) => {
  const { invalidLoginAttempts, lockedAt } = await prisma.user.update({
    where: { id: user.id },
    data: { invalidLoginAttempts: { increment: 1 } }
  });

  // Lock account after threshold
  if (!lockedAt && invalidLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lockedAt: new Date() }
    });
  }
};
```

---

## API Token Authentication

### Token Models

```prisma
// User API tokens
model Token {
  id         String    @id @default(cuid())
  name       String
  hashedKey  String    @unique
  partialKey String
  expires    DateTime?
  lastUsed   DateTime?
  userId     String
}

// Scoped tokens for integrations
model RestrictedToken {
  id            String    @id @default(cuid())
  name          String
  hashedKey     String    @unique
  partialKey    String
  scopes        String    // Space-separated
  expires       DateTime?
  lastUsed      DateTime?
  userId        String
  projectId     String
  installationId String?
}
```

### Token Hashing

```typescript
import { createHash } from "crypto";

export const hashToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};
```

### API Auth Middleware

```typescript
export const withSession = (handler) =>
  async (req, { params }) => {
    const authorizationHeader = headers().get("Authorization");

    if (authorizationHeader) {
      // Bearer token auth
      if (!authorizationHeader.includes("Bearer ")) {
        throw new DubApiError({
          code: "bad_request",
          message: "Misconfigured authorization header."
        });
      }

      const apiKey = authorizationHeader.replace("Bearer ", "");
      const hashedKey = await hashToken(apiKey);

      // Find user by token
      const user = await prisma.user.findFirst({
        where: { tokens: { some: { hashedKey } } }
      });

      if (!user) {
        throw new DubApiError({
          code: "unauthorized",
          message: "Invalid API key."
        });
      }

      // Rate limiting (60 req/min)
      const { success, limit, remaining, reset } = await ratelimit(60, "1 m")
        .limit(apiKey);

      if (!success) {
        throw new DubApiError({ code: "rate_limit_exceeded" });
      }

      // Update last used (debounced)
      waitUntil(updateLastUsed(hashedKey));

      return { user };
    } else {
      // Session auth
      const session = await getSession();
      if (!session?.user.id) {
        throw new DubApiError({
          code: "unauthorized",
          message: "Login required."
        });
      }
      return session;
    }
  };
```

---

## Enterprise SSO (SAML/OIDC)

### Library

[BoxyHQ Jackson](https://boxyhq.com/docs/jackson/overview) - Open source SAML/OIDC provider.

### Database Tables

```prisma
// Jackson SSO tables
model jackson_index {
  id    Int    @id @default(autoincrement())
  key   String @db.VarChar(250)
  storeKey String @db.VarChar(250)
  @@index([key])
}

model jackson_store {
  key       String   @id @db.VarChar(250)
  value     String   @db.Text
  iv        String?  @db.VarChar(64)
  tag       String?  @db.VarChar(64)
  namespace String?  @db.VarChar(64)
  createdAt DateTime @default(now())
  modifiedAt DateTime?
}

model jackson_ttl {
  key       String @id @db.VarChar(250)
  expiresAt BigInt
  @@index([expiresAt])
}
```

### SSO Enforcement

```typescript
// Check if email domain requires SSO
export const isSamlEnforcedForEmailDomain = async (email: string) => {
  const emailDomain = email.split("@")[1];

  const workspace = await prisma.project.findFirst({
    where: {
      ssoEnabled: true,
      ssoEmailDomain: emailDomain.toLowerCase(),
    },
  });

  return !!workspace;
};
```

### SAML Provider Configuration

```typescript
{
  id: "saml",
  name: "BoxyHQ",
  type: "oauth",
  version: "2.0",
  checks: ["pkce", "state"],
  authorization: {
    url: `${NEXTAUTH_URL}/api/auth/saml/authorize`,
    params: {
      scope: "",
      response_type: "code",
      provider: "saml",
    },
  },
  token: {
    url: `${NEXTAUTH_URL}/api/auth/saml/token`,
  },
  userinfo: `${NEXTAUTH_URL}/api/auth/saml/userinfo`,
}
```

---

## Key Files

```
apps/web/lib/auth/
├── index.ts          # Exports
├── options.ts        # NextAuth config
├── password.ts       # bcrypt hash/validate
├── lock-account.ts   # Login attempt tracking
├── session.ts        # withSession middleware
├── hash-token.ts     # SHA-256 token hashing
├── workspace.ts      # Workspace auth checks
├── constants.ts      # MAX_LOGIN_ATTEMPTS, etc.
└── utils.ts          # getSession helper

apps/web/app/(ee)/api/auth/saml/
├── authorize/route.ts
├── callback/route.ts
├── token/route.ts
└── userinfo/route.ts
```

---

## Security Features Summary

| Feature | Implementation |
|---------|----------------|
| Password Hashing | bcryptjs, 12 rounds |
| Rate Limiting | Upstash Redis, 5 attempts/min (login), 60 req/min (API) |
| Account Lockout | Lock after 5 failed attempts |
| Email Verification | Required before password login |
| SSO Enforcement | Per-workspace email domain |
| Token Security | SHA-256 hashing, never stored plain |
| Session Security | HttpOnly, Secure, SameSite cookies |
| Blacklisting | Email blacklist via Edge Config |

---

## Recommendations for Eduspotio

1. **Use NextAuth.js v5 (Auth.js)** - Latest version with better App Router support
2. **JWT sessions** - Better for serverless/edge
3. **Upstash Redis** - Rate limiting and caching
4. **bcryptjs** - Password hashing
5. **BoxyHQ Jackson** - If enterprise SSO is needed
6. **Prefixed IDs** - `user_`, `course_`, etc. for better debugging

---

## Related Documentation

- [Dub Architecture](dub_architecture.md) - Overall architecture
- [Dub Database Schema](dub_database_schema.md) - Schema details
