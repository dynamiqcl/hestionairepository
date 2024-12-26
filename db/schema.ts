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
  receiptId: text("receipt_id").notNull().unique(), // ID único para cada boleta
  date: timestamp("date").notNull(),
  total: numeric("total", { precision: 10, scale: 0 }).notNull(), // Sin decimales para CLP
  vendor: text("vendor"),
  category: text("category"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 0 }), // Sin decimales para CLP
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
  date: z.coerce.date(),
  total: z.string().or(z.number()).transform(val => 
    typeof val === 'string' ? Math.round(parseFloat(val)) : Math.round(val)
  ),
  vendor: z.string().optional(),
  category: z.string().optional(),
  taxAmount: z.string().or(z.number()).transform(val => 
    typeof val === 'string' ? Math.round(parseFloat(val)) : Math.round(val)
  ).optional(),
  rawText: z.string().optional(),
  imageUrl: z.string().optional(),
  receiptId: z.string().default(() => {
    const date = new Date();
    return `RCT-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }),
});

export const insertUserSchema = baseUserInsertSchema.extend({
  username: z.string().email("Por favor ingresa un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  nombreCompleto: z.string().optional(),
});

export const selectReceiptSchema = baseSelectSchema;
export const selectUserSchema = baseUserSelectSchema;

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;