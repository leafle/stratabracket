import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["worker/src/**/*.test.ts", "frontend/src/**/*.test.ts"],
    globals: true,
    coverage: {
      all: true,
      include: ["worker/src/**/*.ts", "frontend/src/**/*.ts"],
      exclude: ["worker/src/**/*.test.ts", "frontend/src/**/*.test.ts", "frontend/src/main.tsx"],
      reporter: ["text", "html"]
    }
  }
});
