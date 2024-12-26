import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { receipts } from "@db/schema";
import { desc } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Get all receipts
  app.get("/api/receipts", async (_req, res) => {
    try {
      const allReceipts = await db.select().from(receipts).orderBy(desc(receipts.date));
      res.json(allReceipts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch receipts" });
    }
  });

  // Add new receipt
  app.post("/api/receipts", async (req, res) => {
    try {
      const [newReceipt] = await db.insert(receipts).values(req.body).returning();
      res.json(newReceipt);
    } catch (error) {
      res.status(500).json({ error: "Failed to add receipt" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
