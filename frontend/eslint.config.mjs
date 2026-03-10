import js from "@eslint/js";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";

const sharedRules = {
  ...js.configs.recommended.rules,
  "no-console": ["error", { allow: ["warn", "error"] }],
  "no-restricted-globals": [
    "error",
    {
      name: "alert",
      message: "Use controlled UI feedback instead of alert().",
    },
    {
      name: "prompt",
      message: "Use controlled forms instead of prompt().",
    },
  ],
  "no-unused-vars": [
    "warn",
    {
      argsIgnorePattern: "^_",
      ignoreRestSiblings: true,
      varsIgnorePattern: "^React$",
    },
  ],
  "react/jsx-uses-vars": "error",
  "react/prop-types": "off",
  "react/react-in-jsx-scope": "off",
  "react/jsx-uses-react": "off",
  "react-hooks/rules-of-hooks": "error",
  "react-hooks/exhaustive-deps": "warn",
  "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
};

export default [
  {
    ignores: ["dist/**", "coverage/**", "cypress/**"],
  },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "react-refresh": reactRefreshPlugin,
    },
    rules: sharedRules,
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["src/**/*.test.{js,jsx}", "src/test/**/*.{js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        afterEach: "readonly",
        beforeEach: "readonly",
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        test: "readonly",
        vi: "readonly",
      },
    },
  },
  {
    files: ["src/context/**/*.{js,jsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
];
