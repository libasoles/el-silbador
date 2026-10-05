import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.{test,spec}.ts"],
        },
      },
      {
        // Component tests render with React Testing Library; only they pay for jsdom.
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.{test,spec}.tsx"],
          setupFiles: ["src/test/setupDom.ts"],
        },
      },
    ],
  },
});
