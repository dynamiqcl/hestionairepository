import { pgTable, text, serial, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  nombreCompleto: text("nombre_completo"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
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
const baseUserInsertSchema = createInsertSchema(users);
const baseUserSelectSchema = createSelectSchema(users);

// Extend the insert schema with custom validations
export const insertReceiptSchema = baseInsertSchema.extend({
  date: z.coerce.date().default(() => new Date()),
  total: z.string().or(z.number()).transform(val => val.toString()),
  vendor: z.string().optional(),
  category: z.string().optional(),
  taxAmount: z.string().or(z.number()).transform(val => val.toString()).optional(),
});

export const insertUserSchema = baseUserInsertSchema.extend({
  nombreCompleto: z.string().optional(),
});

export const selectReceiptSchema = baseSelectSchema;
export const selectUserSchema = baseUserSelectSchema;

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;