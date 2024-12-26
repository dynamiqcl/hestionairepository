import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { receipts, alertRules, alertNotifications, insertReceiptSchema, insertAlertRuleSchema, insertAlertNotificationSchema } from "@db/schema";
import { desc, eq, and } from "drizzle-orm";
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

      const date = new Date();
      const receiptId = `RCT-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const receiptData = {
        ...result.data,
        userId: req.user!.id,
        receiptId,
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

  // Update existing receipt
  app.put("/api/receipts/:id", ensureAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const result = insertReceiptSchema.partial().safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          error: "Datos de boleta inválidos",
          details: result.error.issues.map(i => i.message).join(", ")
        });
      }

      // Verify receipt belongs to user
      const [existingReceipt] = await db
        .select()
        .from(receipts)
        .where(and(
          eq(receipts.id, parseInt(id)),
          eq(receipts.userId, req.user!.id)
        ))
        .limit(1);

      if (!existingReceipt) {
        return res.status(404).json({ error: "Boleta no encontrada" });
      }

      const [updatedReceipt] = await db
        .update(receipts)
        .set({
          ...result.data,
          updatedAt: new Date(),
        })
        .where(eq(receipts.id, parseInt(id)))
        .returning();

      res.json(updatedReceipt);
    } catch (error) {
      console.error("Error al actualizar la boleta:", error);
      res.status(500).json({ error: "Error al actualizar la boleta" });
    }
  });

  // Get all alert rules for the logged in user
  app.get("/api/alerts/rules", ensureAuth, async (req, res) => {
    try {
      const rules = await db
        .select()
        .from(alertRules)
        .where(eq(alertRules.userId, req.user!.id))
        .orderBy(desc(alertRules.createdAt));
      res.json(rules);
    } catch (error) {
      console.error("Error al obtener reglas de alertas:", error);
      res.status(500).json({ error: "Error al obtener reglas de alertas" });
    }
  });

  // Add new alert rule
  app.post("/api/alerts/rules", ensureAuth, async (req, res) => {
    try {
      const result = insertAlertRuleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: "Datos inválidos",
          details: result.error.issues.map(i => i.message).join(", ")
        });
      }

      const [newRule] = await db
        .insert(alertRules)
        .values({
          ...result.data,
          userId: req.user!.id,
        })
        .returning();

      res.json(newRule);
    } catch (error) {
      console.error("Error al crear regla de alerta:", error);
      res.status(500).json({ error: "Error al crear regla de alerta" });
    }
  });

  // Update alert rule status
  app.put("/api/alerts/rules/:id", ensureAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: "ID de regla inválido" });
      }

      // Verify rule belongs to user and exists
      const [existingRule] = await db
        .select()
        .from(alertRules)
        .where(and(
          eq(alertRules.id, parseInt(id)),
          eq(alertRules.userId, req.user!.id)
        ))
        .limit(1);

      if (!existingRule) {
        return res.status(404).json({ error: "Regla no encontrada" });
      }

      // Toggle the isActive status
      const [updatedRule] = await db
        .update(alertRules)
        .set({
          isActive: !existingRule.isActive,
          updatedAt: new Date()
        })
        .where(eq(alertRules.id, parseInt(id)))
        .returning();

      res.json(updatedRule);
    } catch (error) {
      console.error("Error al actualizar regla:", error);
      res.status(500).json({ error: "Error al actualizar regla" });
    }
  });

  // Get notifications for the logged in user
  app.get("/api/alerts/notifications", ensureAuth, async (req, res) => {
    try {
      const notifications = await db
        .select()
        .from(alertNotifications)
        .where(eq(alertNotifications.userId, req.user!.id))
        .orderBy(desc(alertNotifications.createdAt));
      res.json(notifications);
    } catch (error) {
      console.error("Error al obtener notificaciones:", error);
      res.status(500).json({ error: "Error al obtener notificaciones" });
    }
  });

  // Mark notification as read
  app.put("/api/alerts/notifications/:id", ensureAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: "ID de notificación inválido" });
      }

      const [notification] = await db
        .select()
        .from(alertNotifications)
        .where(and(
          eq(alertNotifications.id, parseInt(id)),
          eq(alertNotifications.userId, req.user!.id)
        ))
        .limit(1);

      if (!notification) {
        return res.status(404).json({ error: "Notificación no encontrada" });
      }

      const [updatedNotification] = await db
        .update(alertNotifications)
        .set({ isRead: true })
        .where(eq(alertNotifications.id, parseInt(id)))
        .returning();

      res.json(updatedNotification);
    } catch (error) {
      console.error("Error al actualizar notificación:", error);
      res.status(500).json({ error: "Error al actualizar notificación" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}