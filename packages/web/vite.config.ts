import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { readFileSync } from "fs";
import { execSync } from "child_process";

const { version } = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
);

function getGitHash(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

const gitHash = getGitHash();

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(`${version}+${gitHash}`),
  },
  envDir: path.resolve(__dirname, "../../"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
