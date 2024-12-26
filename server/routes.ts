import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { receipts, insertReceiptSchema } from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { setupAuth } from "./auth";

// Middleware to ensure user is authenticated
const ensureAuth = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send("No has iniciado sesión");
};

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Get all receipts for the logged in user
  app.get("/api/receipts", ensureAuth, async (req, res) => {
    try {
      const allReceipts = await db
        .select()
        .from(receipts)
        .where(eq(receipts.userId, req.user!.id))
        .orderBy(desc(receipts.date));
      res.json(allReceipts);
    } catch (error) {
      console.error("Error al obtener las boletas:", error);
      res.status(500).json({ error: "Error al obtener las boletas" });
    }
  });

  // Add new receipt for the logged in user
  app.post("/api/receipts", ensureAuth, async (req, res) => {
    try {
      console.log("Datos recibidos:", req.body);

      const result = insertReceiptSchema.safeParse(req.body);
      if (!result.success) {
        console.error("Error de validación:", result.error.issues);
        return res.status(400).json({
          error: "Datos de boleta inválidos",
          details: result.error.issues.map(i => i.message).join(", ")
        });
      }

      const receiptData = {
        ...result.data,
        userId: req.user!.id,
        // Ensure numeric fields are properly formatted
        total: parseFloat(result.data.total.toString()),
        taxAmount: result.data.taxAmount ? parseFloat(result.data.taxAmount.toString()) : null,
      };

      console.log("Datos a insertar:", receiptData);

      const [newReceipt] = await db
        .insert(receipts)
        .values(receiptData)
        .returning();

      console.log("Boleta guardada:", newReceipt);
      res.json(newReceipt);
    } catch (error) {
      console.error("Error al agregar la boleta:", error);
      res.status(500).json({ 
        error: "Error al agregar la boleta",
        details: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}