import { pgTable, text, serial, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  total: numeric("total").notNull(),
  vendor: text("vendor"),
  category: text("category"),
  taxAmount: numeric("tax_amount"),
  rawText: text("raw_text"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create base schemas
const baseInsertSchema = createInsertSchema(receipts);
const baseSelectSchema = createSelectSchema(receipts);

// Extend the insert schema with custom validations
export const insertReceiptSchema = baseInsertSchema.extend({
  date: z.coerce.date().default(() => new Date()),
  total: z.string().or(z.number()).transform(val => val.toString()),
  vendor: z.string().optional(),
  category: z.string().optional(),
  taxAmount: z.string().or(z.number()).transform(val => val.toString()).optional(),
});

export const selectReceiptSchema = baseSelectSchema;

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;