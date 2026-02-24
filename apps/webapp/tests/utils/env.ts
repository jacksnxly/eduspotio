import { z } from "zod";

const testEnvSchema = z.object({
  E2E_BASE_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().url(),
});

export type TestEnv = z.infer<typeof testEnvSchema>;

export const testEnv = testEnvSchema.parse(process.env);
