import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { receipts, companies, alertRules, alertNotifications, insertReceiptSchema, insertAlertRuleSchema, insertAlertNotificationSchema, users, UserRole } from "@db/schema";
import { desc, eq, and } from "drizzle-orm";
import { setupAuth } from "./auth";

// Middleware to ensure user is authenticated
const ensureAuth = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send("No has iniciado sesión");
};

// Middleware para verificar rol de administrador
const ensureAdmin = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
  if (req.user?.role !== UserRole.ADMINISTRADOR) {
    return res.status(403).send("Acceso no autorizado");
  }
  next();
};

// Middleware para verificar rol de consultor o superior
const ensureConsultorOrAdmin = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
  if (req.user?.role !== UserRole.CONSULTOR && req.user?.role !== UserRole.ADMINISTRADOR) {
    return res.status(403).send("Acceso no autorizado");
  }
  next();
};

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Actualizar rol de administrador
  app.post("/api/admin/init", async (req, res) => {
    try {
      await db
        .update(users)
        .set({ role: UserRole.ADMINISTRADOR })
        .where(eq(users.username, "management@hestion.cl"));

      res.json({ message: "Rol de administrador asignado correctamente" });
    } catch (error) {
      console.error("Error al asignar rol de administrador:", error);
      res.status(500).json({ error: "Error al asignar rol de administrador" });
    }
  });

  // Ruta para que el administrador actualice roles de usuarios
  app.put("/api/users/:id/role", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({ error: "Rol inválido" });
      }

      const [updatedUser] = await db
        .update(users)
        .set({ role })
        .where(eq(users.id, parseInt(id, 10)))
        .returning();

      res.json(updatedUser);
    } catch (error) {
      console.error("Error al actualizar rol:", error);
      res.status(500).json({ error: "Error al actualizar rol" });
    }
  });

  // Obtener lista de usuarios (solo admin)
  app.get("/api/users", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const userList = await db
        .select({
          id: users.id,
          username: users.username,
          nombreCompleto: users.nombreCompleto,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));

      res.json(userList);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      res.status(500).json({ error: "Error al obtener usuarios" });
    }
  });

  // Rutas de empresas
  app.get("/api/companies", ensureAuth, async (req, res) => {
    try {
      const userCompanies = await db
        .select()
        .from(companies)
        .where(eq(companies.userId, req.user!.id));
      res.json(userCompanies);
    } catch (error) {
      console.error("Error al obtener empresas:", error);
      res.status(500).json({ error: "Error al obtener empresas" });
    }
  });

  app.post("/api/companies", ensureAuth, async (req, res) => {
    try {
      const { name, rut } = req.body;
      const [newCompany] = await db
        .insert(companies)
        .values({
          name,
          rut,
          userId: req.user!.id,
        })
        .returning();
      res.json(newCompany);
    } catch (error) {
      console.error("Error al crear empresa:", error);
      res.status(500).json({ error: "Error al crear empresa" });
    }
  });

  // Get all receipts for the logged in user
  app.get("/api/receipts", ensureAuth, async (req, res) => {
    try {
      const userReceipts = await db
        .select({
          id: receipts.id,
          userId: receipts.userId,
          receiptId: receipts.receiptId,
          date: receipts.date,
          total: receipts.total,
          vendor: receipts.vendor,
          category: receipts.category,
          taxAmount: receipts.taxAmount,
          rawText: receipts.rawText,
          imageUrl: receipts.imageUrl,
          createdAt: receipts.createdAt,
          updatedAt: receipts.updatedAt,
          companyName: companies.name,
        })
        .from(receipts)
        .leftJoin(companies, eq(receipts.companyId, companies.id))
        .where(eq(receipts.userId, req.user!.id))
        .orderBy(desc(receipts.date));
      res.json(userReceipts);
    } catch (error) {
      console.error("Error al obtener las boletas:", error);
      res.status(500).json({ error: "Error al obtener las boletas" });
    }
  });

  app.post("/api/receipts", ensureAuth, async (req, res) => {
    try {
      const result = insertReceiptSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: "Datos de boleta inválidos",
          details: result.error.issues.map(i => i.message).join(", ")
        });
      }

      const receiptData = {
        ...result.data,
        userId: req.user!.id,
        total: parseFloat(result.data.total.toString()),
        taxAmount: result.data.taxAmount ? parseFloat(result.data.taxAmount.toString()) : null,
      };

      const [newReceipt] = await db
        .insert(receipts)
        .values(receiptData)
        .returning();

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