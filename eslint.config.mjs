import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 40, skipBlankLines: true, skipComments: true }],
      "id-length": ["error", { min: 2, exceptions: ["_"] }],
      "no-console": ["error", { allow: ["error", "warn"] }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "variable",
          types: ["boolean"],
          format: ["PascalCase"],
          prefix: ["is", "has", "should", "can"],
        },
        { selector: "typeLike", format: ["PascalCase"] },
      ],
    },
  },
  {
    files: ["src/**/*.tsx"],
    rules: {
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ["src/**/*.test.ts"],
    rules: { "max-lines-per-function": "off" },
  },
  {
    files: ["src/**"],
    ignores: ["src/server/wine-intelligence/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@anthropic-ai/*", "@google/genai"],
              message: "Only wine-intelligence may call an AI service.",
            },
          ],
        },
      ],
    },
  },
  // Must come after the block above: for UI files the last matching block wins,
  // so it repeats the Claude restriction and adds the server restriction.
  {
    files: ["src/components/**", "src/app/**"],
    ignores: ["src/app/api/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/server/*", "@/server/**"], message: "UI must go through the API routes." },
            {
              group: ["@anthropic-ai/*", "@google/genai"],
              message: "Only wine-intelligence may call an AI service.",
            },
          ],
        },
      ],
    },
  },
  prettierConfig,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "drizzle/**",
    "data/**",
    "playwright-report/**",
    "test-results/**",
    ".e2e-data/**",
  ]),
]);

export default eslintConfig;
