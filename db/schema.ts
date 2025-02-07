import { pgTable, text, serial, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const UserRole = {
  CLIENTE: 'CLIENTE',
  ADMINISTRADOR: 'ADMINISTRADOR',
  EMPLEADO: 'EMPLEADO'
} as const;

// Tabla de usuarios mejorada
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  nombreCompleto: text("nombre_completo").notNull(),
  nombreEmpresa: text("nombre_empresa").notNull(),
  rutEmpresa: text("rut_empresa").notNull(),
  email: text("email").notNull(),
  direccion: text("direccion"),
  telefono: text("telefono"),
  fechaRegistro: timestamp("fecha_registro").defaultNow(),
  role: text("role").notNull().default(UserRole.CLIENTE),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabla de categorías mejorada
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  rut: text("rut").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  companyId: integer("company_id").references(() => companies.id),
  categoryId: integer("category_id").references(() => categories.id),
  receiptId: text("receipt_id").notNull().unique(),
  date: timestamp("date").notNull(),
  total: numeric("total", { precision: 10, scale: 0 }).notNull(),
  vendor: text("vendor"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 0 }),
  rawText: text("raw_text"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schemas base
const baseInsertSchema = createInsertSchema(receipts);
const baseSelectSchema = createSelectSchema(receipts);
const baseUserInsertSchema = createInsertSchema(users);
const baseUserSelectSchema = createSelectSchema(users);

// Schema para inserción de usuarios actualizado
export const insertUserSchema = createInsertSchema(users).extend({
  username: z.string().email("Por favor ingresa un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  nombreCompleto: z.string().min(1, "El nombre completo es requerido"),
  nombreEmpresa: z.string().min(1, "El nombre de la empresa es requerido").default(""),
  rutEmpresa: z.string().min(1, "El RUT de la empresa es requerido").default(""),
  email: z.string().email("Por favor ingresa un correo electrónico válido").optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  role: z.enum([UserRole.CLIENTE, UserRole.ADMINISTRADOR, UserRole.EMPLEADO]).default(UserRole.CLIENTE),
  fechaRegistro: z.date().optional().default(() => new Date())
});

// Schema para inserción de recibos
export const insertReceiptSchema = baseInsertSchema.extend({
  date: z.coerce.date(),
  total: z.string().or(z.number()).transform(val =>
    typeof val === 'string' ? Math.round(parseFloat(val)) : Math.round(val)
  ),
  vendor: z.string().optional(),
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

// Schema para selección de usuarios
export const selectUserSchema = createSelectSchema(users);

// Schemas de selección
export const selectReceiptSchema = baseSelectSchema;

// Agregar schemas para categorías
export const insertCategorySchema = createInsertSchema(categories);
export const selectCategorySchema = createSelectSchema(categories);

// Types
export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Tipos para categorías
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;