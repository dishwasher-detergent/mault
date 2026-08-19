import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/sync-worker.ts"],
  format: ["cjs"],
  outDir: "dist",
  noExternal: ["@magic-vault/shared"],
});
