import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // `server-only` throws when imported outside a React Server Component bundle.
      { find: /^server-only$/, replacement: `${root}tests/stubs/server-only.ts` },
      { find: /^@\//, replacement: root },
    ],
  },
  esbuild: { jsx: "automatic" },
  test: {
    // Pure logic runs in Node; hook/component tests opt into jsdom per file
    // with a `// @vitest-environment jsdom` comment.
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    unstubEnvs: true,
    coverage: {
      provider: "v8",
      include: ["lib/**", "hooks/**", "components/**"],
      exclude: ["lib/seed/**", "**/*.d.ts"],
      reporter: ["text-summary", "html"],
    },
  },
});
