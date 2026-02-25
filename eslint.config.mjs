import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  globalIgnores([
    "**/dist/**",
    "**/node_modules/**",
    "**/.turbo/**",
  ]),
]);

export default eslintConfig;
