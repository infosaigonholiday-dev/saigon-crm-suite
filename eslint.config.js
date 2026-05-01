import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "src/test/**",
      "playwright*",
      "tests/**",
      "vite.config.ts",
      "vitest.config.ts",
      "supabase/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/localhost:[0-9]+/]",
          message:
            "Không hardcode localhost — dùng getAppBaseUrl() từ @/lib/getAppBaseUrl",
        },
      ],
    },
  },
  // Anti-regression guards cho Reset Password flow — xem AUTH_CONFIG.md mục #7
  {
    files: ["src/pages/Login.tsx", "src/pages/ResetPassword.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/localhost:[0-9]+/]",
          message:
            "Không hardcode localhost — dùng getAppBaseUrl() từ @/lib/getAppBaseUrl",
        },
        {
          selector: "MemberExpression[property.name='resetPasswordForEmail']",
          message:
            "Recovery dùng supabase.functions.invoke('send-recovery-email') — xem AUTH_CONFIG.md mục #7 (DO NOT MODIFY)",
        },
        {
          selector: "MemberExpression[property.name='exchangeCodeForSession']",
          message:
            "Recovery dùng verifyOtp(token_hash) — xem AUTH_CONFIG.md mục #7 (DO NOT MODIFY)",
        },
        {
          selector: "Property[key.name='flowType'][value.value='pkce']",
          message:
            "Recovery KHÔNG dùng PKCE — xem AUTH_CONFIG.md mục #7 (DO NOT MODIFY)",
        },
      ],
    },
  },
);
