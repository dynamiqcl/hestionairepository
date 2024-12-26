import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { receipts } from "@db/schema";
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
      res.status(500).json({ error: "Error al obtener las boletas" });
    }
  });

  // Add new receipt for the logged in user
  app.post("/api/receipts", ensureAuth, async (req, res) => {
    try {
      const [newReceipt] = await db
        .insert(receipts)
        .values({
          ...req.body,
          userId: req.user!.id,
        })
        .returning();
      res.json(newReceipt);
    } catch (error) {
      res.status(500).json({ error: "Error al agregar la boleta" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}