import vinext from "vinext";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [vinext()],
  // mysql2 is a Node driver. Let Node load its CommonJS modules directly.
  ssr: { external: ["mysql2", "mysql2/promise"] },
  server: { watch: { usePolling: process.env.DOCKER_DEV_POLLING === "1", interval: 500 } },
});
