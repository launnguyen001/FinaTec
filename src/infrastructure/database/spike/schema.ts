import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const spikeProbe = sqliteTable("task00_spike_probe", {
  id: integer("id").primaryKey(),
  value: text("value").notNull(),
});
