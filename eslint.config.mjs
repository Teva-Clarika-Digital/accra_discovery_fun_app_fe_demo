import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "eslint-config-next";

/**
 * Lint config.
 *
 * Two things this file must get right, both learned the hard way:
 *
 *  1. The type-aware TypeScript rules are scoped to `**\/*.{ts,tsx}`. Spread flat, they
 *     would try to lint `eslint.config.mjs` with type information it cannot have.
 *  2. `eslint-config-next` goes in the *same* block, after `typescript-eslint`. If it
 *     lands later it replaces the parser with `eslint-config-next/parser`, which does
 *     not forward `projectService`, and every type-aware rule throws.
 */
export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      "public/maplibre-gl-worker.mjs",
      "public/maplibre-gl-shared.mjs",
    ],
  },

  js.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommendedTypeChecked, ...nextPlugin],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "smart"],
    },
  },

  {
    // Playwright specs are not part of the app tsconfig, so they cannot be type-linted
    // with project information. Opt them out rather than pretending.
    files: ["e2e/**/*.ts"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      parserOptions: { projectService: false, project: false },
    },
    rules: {
      "no-console": "off",
    },
  },

  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },

  {
    files: ["scripts/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
);
