import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-useless-assignment": "off",
    },
  },
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
