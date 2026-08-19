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
      sourceType: "script",
      globals: {
        ...globals.browser,
        // Loaded from CDN in index.html
        Swiper: "readonly",
        YT: "readonly",
        gtag: "readonly",
        dataLayer: "readonly",
      },
    },
  },
  {
    // This config file is the only ES module in the repo.
    files: ["eslint.config.js"],
    languageOptions: {
      sourceType: "module",
      globals: globals.node,
    },
  },
  prettier,
  includeGitignore(),
];
