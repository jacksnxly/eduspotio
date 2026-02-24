import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  plugins: [tsconfigPaths()],
  test: {
    dir: "./tests",
    globals: true,
    testTimeout: 50000,
    hookTimeout: 50000,
    setupFiles: ["./tests/setupTests.ts"],
    reporters: ["verbose"],
    env: loadEnv(mode ?? "", process.cwd(), ""),
  },
}));
