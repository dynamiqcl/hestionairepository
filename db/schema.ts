import { pgTable, text, serial, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";
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
  receiptId: text("receipt_id").notNull().unique(),
  date: timestamp("date").notNull(),
  total: numeric("total", { precision: 10, scale: 0 }).notNull(),
  vendor: text("vendor"),
  category: text("category"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 0 }),
  rawText: text("raw_text"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Nueva tabla para cuentas bancarias
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  bankName: text("bank_name").notNull(),
  accountType: text("account_type").notNull(), // "CUENTA_CORRIENTE", "CUENTA_VISTA", etc.
  accountNumber: text("account_number").notNull(),
  lastSync: timestamp("last_sync"),
  isActive: boolean("is_active").default(true),
  credentials: text("credentials").notNull(), // Credenciales encriptadas
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Nueva tabla para transacciones bancarias
export const bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  bankAccountId: serial("bank_account_id").references(() => bankAccounts.id),
  transactionId: text("transaction_id").unique().notNull(),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 0 }).notNull(),
  type: text("type").notNull(), // "CARGO", "ABONO"
  category: text("category"),
  receiptId: text("receipt_id").references(() => receipts.receiptId),
  status: text("status").default("PENDING"), // "PENDING", "MATCHED", "PROCESSED"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schemas base
const baseInsertSchema = createInsertSchema(receipts);
const baseSelectSchema = createSelectSchema(receipts);
const baseUserInsertSchema = createInsertSchema(users);
const baseUserSelectSchema = createSelectSchema(users);
const baseBankAccountInsertSchema = createInsertSchema(bankAccounts);
const baseBankAccountSelectSchema = createSelectSchema(bankAccounts);
const baseBankTransactionInsertSchema = createInsertSchema(bankTransactions);
const baseBankTransactionSelectSchema = createSelectSchema(bankTransactions);

// Schema extendido para inserción de recibos
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

// Schema para inserción de usuarios
export const insertUserSchema = baseUserInsertSchema.extend({
  username: z.string().email("Por favor ingresa un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  nombreCompleto: z.string().optional(),
});

// Schema para cuentas bancarias
export const insertBankAccountSchema = baseBankAccountInsertSchema.extend({
  bankName: z.string().min(1, "El nombre del banco es requerido"),
  accountType: z.enum(["CUENTA_CORRIENTE", "CUENTA_VISTA", "CUENTA_AHORRO"]),
  accountNumber: z.string().min(1, "El número de cuenta es requerido"),
  credentials: z.string().min(1, "Las credenciales son requeridas"),
});

// Schema para transacciones bancarias
export const insertBankTransactionSchema = baseBankTransactionInsertSchema.extend({
  transactionId: z.string().min(1, "El ID de transacción es requerido"),
  date: z.coerce.date(),
  description: z.string().min(1, "La descripción es requerida"),
  amount: z.number(),
  type: z.enum(["CARGO", "ABONO"]),
  category: z.string().optional(),
  status: z.enum(["PENDING", "MATCHED", "PROCESSED"]).default("PENDING"),
});

// Schemas de selección
export const selectReceiptSchema = baseSelectSchema;
export const selectUserSchema = baseUserSelectSchema;
export const selectBankAccountSchema = baseBankAccountSelectSchema;
export const selectBankTransactionSchema = baseBankTransactionSelectSchema;

// Types
export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankTransaction = typeof bankTransactions.$inferSelect;
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;