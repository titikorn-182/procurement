import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      include: ["lib/**/*.ts", "app/**/schemas.ts"],
    },
  },
});
