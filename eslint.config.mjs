import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".next.*/*",
    ".next.*/**",
    "out/**",
    "build/**",
    "apps/miniapp/**",
    "tools/math-verifier/.lake/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
