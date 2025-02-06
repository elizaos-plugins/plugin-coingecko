import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  sourcemap: true,
  clean: true,
  format: ["esm"],
  dts: {
    resolve: false, // Don't try to resolve external types
  },
  external: ["dotenv", "fs", "path", "https", "http", "zod", "@elizaos/core"],
});
