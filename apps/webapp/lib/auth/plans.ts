import { PLAN_VALUES } from "@eduspot/db";

export type CommunityPlan = (typeof PLAN_VALUES)[number];

export const COMMUNITY_PLANS: Record<
  CommunityPlan,
  { readonly rateLimit: number; readonly rateLimitWindow: `${number} m` }
> = {
  free: { rateLimit: 60, rateLimitWindow: "1 m" },
  pro: { rateLimit: 300, rateLimitWindow: "1 m" },
  business: { rateLimit: 1000, rateLimitWindow: "1 m" },
  enterprise: { rateLimit: 5000, rateLimitWindow: "1 m" },
};
