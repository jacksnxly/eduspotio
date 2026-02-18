import { defineConfig } from "eslint/config";
import nextConfig from "@eduspot/eslint-config/next";

const eslintConfig = defineConfig([...nextConfig]);

export default eslintConfig;
