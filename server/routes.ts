import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { receipts, companies, users, UserRole, categories } from "@db/schema";
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

  app.put("/api/companies/:id", ensureAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, rut } = req.body;

      // Verify company belongs to user
      const [existingCompany] = await db
        .select()
        .from(companies)
        .where(and(
          eq(companies.id, parseInt(id)),
          eq(companies.userId, req.user!.id)
        ))
        .limit(1);

      if (!existingCompany) {
        return res.status(404).json({ error: "Empresa no encontrada" });
      }

      const [updatedCompany] = await db
        .update(companies)
        .set({ name, rut, updatedAt: new Date() })
        .where(eq(companies.id, parseInt(id)))
        .returning();

      res.json(updatedCompany);
    } catch (error) {
      console.error("Error al actualizar empresa:", error);
      res.status(500).json({ error: "Error al actualizar empresa" });
    }
  });

  app.delete("/api/companies/:id", ensureAuth, async (req, res) => {
    try {
      const { id } = req.params;

      // Verify company belongs to user
      const [existingCompany] = await db
        .select()
        .from(companies)
        .where(and(
          eq(companies.id, parseInt(id)),
          eq(companies.userId, req.user!.id)
        ))
        .limit(1);

      if (!existingCompany) {
        return res.status(404).json({ error: "Empresa no encontrada" });
      }

      await db
        .delete(companies)
        .where(eq(companies.id, parseInt(id)));

      res.json({ message: "Empresa eliminada correctamente" });
    } catch (error) {
      console.error("Error al eliminar empresa:", error);
      res.status(500).json({ error: "Error al eliminar empresa" });
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
      let query = db
        .select({
          id: receipts.id,
          userId: receipts.userId,
          receiptId: receipts.receiptId,
          date: receipts.date,
          total: receipts.total,
          vendor: receipts.vendor,
          categoryId: receipts.categoryId,
          category: categories.name,
          taxAmount: receipts.taxAmount,
          rawText: receipts.rawText,
          imageUrl: receipts.imageUrl,
          createdAt: receipts.createdAt,
          updatedAt: receipts.updatedAt,
          companyName: companies.name,
        })
        .from(receipts)
        .leftJoin(companies, eq(receipts.companyId, companies.id))
        .leftJoin(categories, eq(receipts.categoryId, categories.id));

      // Si no es admin, filtrar solo las boletas del usuario
      if (req.user?.role !== UserRole.ADMINISTRADOR) {
        query = query.where(eq(receipts.userId, req.user!.id));
      }

      const allReceipts = await query.orderBy(desc(receipts.date));
      res.json(allReceipts);
    } catch (error) {
      console.error("Error al obtener las boletas:", error);
      res.status(500).json({ error: "Error al obtener las boletas" });
    }
  });

  app.post("/api/receipts", ensureAuth, async (req, res) => {
    try {
      const date = new Date();
      const categoryId = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.name, req.body.category))
        .then(rows => rows[0]?.id);

      const receiptData = {
        ...req.body,
        userId: req.user!.id,
        date: new Date(req.body.date),
        total: parseFloat(req.body.total.toString()),
        taxAmount: req.body.taxAmount ? parseFloat(req.body.taxAmount.toString()) : null,
        receiptId: `RCT-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        categoryId
      };

      const [newReceipt] = await db
        .insert(receipts)
        .values(receiptData)
        .returning();

      res.json(newReceipt);
    } catch (error) {
      console.error("Error al agregar la boleta:", error);
      res.status(500).json({ error: "Error al agregar la boleta" });
    }
  });

  // Update existing receipt
  app.put("/api/receipts/:id", ensureAuth, async (req, res) => {
    try {
      const { id } = req.params;

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
          ...req.body,
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

  // Rutas de categorías
  app.get("/api/categories", ensureAuth, async (req, res) => {
    try {
      const allCategories = await db
        .select({
          id: categories.id,
          name: categories.name,
          description: categories.description,
          createdAt: categories.createdAt,
          updatedAt: categories.updatedAt,
        })
        .from(categories)
        .orderBy(desc(categories.createdAt));
      res.json(allCategories);
    } catch (error) {
      console.error("Error al obtener categorías:", error);
      res.status(500).json({ error: "Error al obtener categorías" });
    }
  });

  app.post("/api/categories", ensureAdmin, async (req, res) => {
    try {
      const { name, description } = req.body;
      const [newCategory] = await db
        .insert(categories)
        .values({ 
          name, 
          description,
          createdBy: req.user!.id 
        })
        .returning();
      res.json(newCategory);
    } catch (error) {
      res.status(500).json({ error: "Error al crear categoría" });
    }
  });

  app.put("/api/categories/:id", ensureAdmin, async (req, res) => {
    try {
      const { name, description } = req.body;
      const [updatedCategory] = await db
        .update(categories)
        .set({ name, description })
        .where(eq(categories.id, parseInt(req.params.id)))
        .returning();
      res.json(updatedCategory);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar categoría" });
    }
  });

  app.delete("/api/categories/:id", ensureAdmin, async (req, res) => {
    try {
      await db
        .delete(categories)
        .where(eq(categories.id, parseInt(req.params.id)));
      res.json({ message: "Categoría eliminada correctamente" });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar categoría" });
    }
  });

  app.delete("/api/receipts/:id", ensureAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await db
        .delete(receipts)
        .where(eq(receipts.id, parseInt(id)));
      res.json({ success: true, message: "Boleta eliminada correctamente" });
    } catch (error) {
      console.error("Error al eliminar la boleta:", error);
      res.status(500).json({ success: false, error: "Error al eliminar la boleta" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}