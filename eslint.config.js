import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";
import includeGitignore from "eslint-config-flat-gitignore";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: { ...globals.browser, YT: "readonly" },
    },
  },
  prettier,
  includeGitignore(),
];
