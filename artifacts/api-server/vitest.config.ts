import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Each test file gets its own module registry so vi.mock is isolated
    isolate: true,
  },
});
