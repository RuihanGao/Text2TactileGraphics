import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";
import includeGitignore from "eslint-config-flat-gitignore";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        // Loaded from CDN in index.html
        Swiper: "readonly",
        YT: "readonly",
      },
    },
  },
  {
    files: ["eslint.config.js"],
    languageOptions: { globals: globals.node },
  },
  prettier,
  includeGitignore(),
];
