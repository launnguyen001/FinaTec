import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/infrastructure/database/schema.ts",
  out: "./src/infrastructure/database/generated",
  dialect: "sqlite",
  driver: "expo",
});
