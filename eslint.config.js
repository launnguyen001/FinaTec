// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["react", "react-native", "expo", "expo-*", "drizzle-orm"],
        },
      ],
    },
  },
  {
    files: ["src/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "react-native",
            "expo",
            "expo-*",
            "drizzle-orm",
            "src/infrastructure/*",
          ],
        },
      ],
    },
  },
  {
    files: ["src/presentation/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}"],
    ignores: ["src/app/_layout.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "expo-sqlite",
            "drizzle-orm",
            "src/infrastructure/database/*",
          ],
        },
      ],
    },
  },
]);
