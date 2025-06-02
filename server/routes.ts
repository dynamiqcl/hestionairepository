import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { receipts, companies, users, UserRole, categories, documents, userMessages } from "@db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { setupAuth, crypto } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { analyzeReceiptImage } from "./openai";

// Configuración de multer para almacenar las imágenes de las boletas
const receiptStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), "uploads", "receipts");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

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

// Configuración de multer para almacenar archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Asegurarse de que el directorio uploads existe
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos PDF"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Configuración para almacenar PDFs de boletas
const receiptPdfStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), "uploads", "receipts");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, "receipt-pdf-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadReceiptPdf = multer({
  storage: receiptPdfStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos PDF"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

export function registerRoutes(app: Express): Server {
  // Servir archivos estáticos
  const uploadsPath = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsPath));

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
          nombreEmpresa: users.nombreEmpresa,
          rutEmpresa: users.rutEmpresa,
          email: users.email,
          direccion: users.direccion,
          telefono: users.telefono,
          fechaRegistro: users.fechaRegistro,
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

  // Crear nuevo usuario (solo admin)
  app.post("/api/users", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const { username, password, nombreCompleto, role } = req.body;

      // Validaciones básicas
      if (!username || !password || !nombreCompleto) {
        return res.status(400).json({
          error: "Faltan campos requeridos (username, password, nombreCompleto)"
        });
      }

      // Hash simple de la contraseña
      const salt = randomBytes(16).toString("hex");
      const buf = (await promisify(scrypt)(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          nombreCompleto,
          role: role || UserRole.CLIENTE,
          nombreEmpresa: req.body.nombreEmpresa || "",
          rutEmpresa: req.body.rutEmpresa || "",
          email: username,
          direccion: req.body.direccion || "",
          telefono: req.body.telefono || "",
          fechaRegistro: new Date(),
        })
        .returning({
          id: users.id,
          username: users.username,
          nombreCompleto: users.nombreCompleto,
          role: users.role,
          fechaRegistro: users.fechaRegistro,
        });

      res.json(newUser);
    } catch (error) {
      console.error("Error detallado al crear usuario:", error);
      res.status(500).json({ error: "Error al crear usuario" });
    }
  });

  // Actualizar usuario existente (solo admin)
  app.put("/api/users/:id", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword, ...userData } = req.body;

      // Preparar los datos a actualizar
      const updateData = {
        ...userData,
        updatedAt: new Date(),
      };

      // Si se proporciona una nueva contraseña, la hasheamos
      if (newPassword && newPassword.trim() !== '') {
        const hashedPassword = await crypto.hash(newPassword);
        updateData.password = hashedPassword;
      }

      // Actualizar usuario en la base de datos
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, parseInt(id)))
        .returning();

      res.json(updatedUser);
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      res.status(500).json({ error: "Error al actualizar usuario" });
    }
  });


  // Rutas de empresas
  app.get("/api/companies", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const userCompanies = await db
        .select()
        .from(companies);
      res.json(userCompanies);
    } catch (error) {
      console.error("Error al obtener empresas:", error);
      res.status(500).json({ error: "Error al obtener empresas" });
    }
  });

  app.put("/api/companies/:id", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, rut, direccion, userId } = req.body;

      // Verify company exists (admin can edit any company)
      const [existingCompany] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, parseInt(id)))
        .limit(1);

      if (!existingCompany) {
        return res.status(404).json({ error: "Empresa no encontrada" });
      }

      const [updatedCompany] = await db
        .update(companies)
        .set({
          name,
          rut,
          direccion,
          userId: userId || existingCompany.userId, // Allow reassigning to different user
          updatedAt: new Date()
        })
        .where(eq(companies.id, parseInt(id)))
        .returning();

      res.json(updatedCompany);
    } catch (error) {
      console.error("Error al actualizar empresa:", error);
      res.status(500).json({ error: "Error al actualizar empresa" });
    }
  });

  app.delete("/api/companies/:id", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Verify company exists
      const [existingCompany] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, parseInt(id)))
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

  app.post("/api/companies", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const { name, rut, direccion, userId } = req.body;
      const [newCompany] = await db
        .insert(companies)
        .values({
          name,
          rut,
          direccion,
          userId: userId || req.user!.id, // Allow assigning to other users
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
      let allReceipts;

      if (req.user?.role === UserRole.ADMINISTRADOR) {
        // Si es admin, obtener todas las boletas
        allReceipts = await db
          .select({
            id: receipts.id,
            userId: receipts.userId,
            username: users.username,
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
          .leftJoin(categories, eq(receipts.categoryId, categories.id))
          .leftJoin(users, eq(receipts.userId, users.id))
          .orderBy(desc(receipts.createdAt));
      } else {
        // Si no es admin, filtrar solo las boletas del usuario
        allReceipts = await db
          .select({
            id: receipts.id,
            userId: receipts.userId,
            username: users.username,
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
          .leftJoin(categories, eq(receipts.categoryId, categories.id))
          .leftJoin(users, eq(receipts.userId, users.id))
          .where(eq(receipts.userId, req.user!.id))
          .orderBy(desc(receipts.createdAt));
      }

      res.json(allReceipts);
    } catch (error) {
      console.error("Error al obtener las boletas:", error);
      res.status(500).json({ error: "Error al obtener las boletas" });
    }
  });

  // Nueva ruta para solo procesar imágenes sin guardar (para preview)
  app.post("/api/receipts/process", ensureAuth, uploadReceipt.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: "No se proporcionó ningún archivo" 
        });
      }

      const filePath = path.join(process.cwd(), "uploads", "receipts", req.file.filename);

      console.log("Analizando imagen de boleta con OpenAI (solo procesamiento)...");
      const analysisResult = await analyzeReceiptImage(filePath);
      console.log("Resultado del análisis OpenAI:", analysisResult);

      if (analysisResult.success && analysisResult.extractedData) {
        // Devolver solo los datos extraídos sin guardar en la base de datos
        res.json({
          success: true,
          extractedData: analysisResult.extractedData,
          imageUrl: `/uploads/receipts/${req.file.filename}`
        });
      } else {
        // Si OpenAI falla, devolver error
        res.status(422).json({ 
          success: false, 
          error: "No se pudo extraer información de la imagen",
          details: analysisResult.message || "Error desconocido"
        });
      }

    } catch (error) {
      console.error("Error al procesar la imagen:", error);
      res.status(500).json({ 
        success: false, 
        error: "Error al procesar la imagen" 
      });
    }
  });

  // Nuevo endpoint simple para guardar boletas con todos los datos
  app.post("/api/receipts/save", ensureAuth, uploadReceipt.single('image'), async (req, res) => {
    try {
      let imageUrl = null;

      // Si hay un archivo, guardarlo
      if (req.file) {
        imageUrl = `/uploads/receipts/${req.file.filename}`;
      }

      // Usar los datos del formulario
      const receiptDate = new Date(req.body.date);
      const receiptTotal = parseFloat(req.body.total);
      const receiptVendor = req.body.vendor;
      const receiptCategory = req.body.category;
      const receiptDescription = req.body.description || "";
      
      // Obtener el categoryId basado en el nombre de la categoría
      let categoryId = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.name, receiptCategory))
        .then(rows => rows[0]?.id);

      // Si no existe la categoría, crear una nueva
      if (!categoryId) {
        const [newCategory] = await db
          .insert(categories)
          .values({
            name: receiptCategory,
            description: `Categoría creada automáticamente`,
            createdBy: req.user!.id
          })
          .returning();
        categoryId = newCategory.id;
      }

      // Obtener el último receiptId
      const lastReceipt = await db
        .select({ receiptId: receipts.receiptId })
        .from(receipts)
        .orderBy(desc(receipts.id))
        .limit(1);

      const nextId = lastReceipt.length > 0
        ? (parseInt(lastReceipt[0].receiptId) + 1).toString()
        : "1";

      const receiptData = {
        userId: req.user!.id,
        date: receiptDate,
        total: receiptTotal.toString(),
        vendor: receiptVendor,
        taxAmount: req.body.taxAmount ? req.body.taxAmount.toString() : Math.round(receiptTotal * 0.19).toString(),
        receiptId: nextId,
        categoryId,
        companyId: req.body.companyId ? parseInt(req.body.companyId) : null,
        rawText: receiptDescription || req.body.rawText || "",
        imageUrl
      };

      const [newReceipt] = await db
        .insert(receipts)
        .values(receiptData)
        .returning();

      res.json(newReceipt);
    } catch (error) {
      console.error("Error al guardar la boleta:", error);
      res.status(500).json({ error: "Error al guardar la boleta" });
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

  // Ruta para subir y procesar PDFs de boletas con OpenAI
  app.post("/api/receipts/pdf", ensureAuth, uploadReceiptPdf.single('pdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: "No se ha subido ningún archivo PDF" 
        });
      }

      // Ruta al archivo PDF subido
      const pdfPath = path.join(process.cwd(), "uploads", "receipts", req.file.filename);
      const imageUrl = `/uploads/receipts/${req.file.filename}`;

      console.log("Analizando PDF de boleta con OpenAI (solo procesamiento)...");
      const analysisResult = await analyzeReceiptImage(pdfPath);
      console.log("Resultado del análisis OpenAI (PDF):", analysisResult);

      // Si el análisis con OpenAI falló, devolver error
      if (!analysisResult.success || !analysisResult.extractedData) {
        return res.status(422).json({
          success: false,
          error: "No se pudo extraer información del PDF",
          details: analysisResult.message || "Error desconocido"
        });
      }

      // Devolver solo los datos extraídos sin guardar en la base de datos
      res.json({
        success: true,
        extractedData: analysisResult.extractedData,
        imageUrl: imageUrl
      });

    } catch (error) {
      console.error("Error al procesar PDF de boleta:", error);
      res.status(500).json({ 
        success: false, 
        error: "Error al procesar PDF de boleta" 
      });
    }
  });

  // Rutas de documentos  (moved from above)
  app.get("/api/documents", ensureAuth, async (req, res) => {
    try {
      let query = db
        .select({
          id: documents.id,
          name: documents.name,
          description: documents.description,
          fileUrl: documents.fileUrl,
          uploadedBy: documents.uploadedBy,
          targetUsers: documents.targetUsers,
          category: documents.category,
          isActive: documents.isActive,
          createdAt: documents.createdAt,
        })
        .from(documents);

      // Si no es admin, solo mostrar documentos dirigidos al usuario
      if (req.user?.role !== UserRole.ADMINISTRADOR) {
        query = query.where(sql`${documents.targetUsers} @> ${JSON.stringify([req.user?.id])}`);
      }

      const allDocuments = await query.orderBy(desc(documents.createdAt));
      res.json(allDocuments);
    } catch (error) {
      console.error("Error al obtener documentos:", error);
      res.status(500).json({ error: "Error al obtener documentos" });
    }
  });

  app.post("/api/documents", ensureAuth, ensureAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se ha proporcionado ningún archivo" });
      }

      const { name, description, targetUsers, category } = req.body;
      const fileUrl = `/uploads/${req.file.filename}`;

      const [newDocument] = await db
        .insert(documents)
        .values({
          name,
          description,
          fileUrl,
          uploadedBy: req.user!.id,
          targetUsers: JSON.parse(targetUsers),
          category: category || "Documentos Generales",
          isActive: true,
        })
        .returning();

      res.json(newDocument);
    } catch (error) {
      console.error("Error al crear documento:", error);
      res.status(500).json({ error: "Error al crear documento" });
    }
  });

  app.delete("/api/documents/:id", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, parseInt(id)))
        .limit(1);

      if (!document) {
        return res.status(404).json({ error: "Documento no encontrado" });
      }

      // Eliminar el archivo físico
      const filePath = path.join(process.cwd(), document.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await db
        .delete(documents)
        .where(eq(documents.id, parseInt(id)));

      res.json({ message: "Documento eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar documento:", error);
      res.status(500).json({ error: "Error al eliminar documento" });
    }
  });

  // Rutas para los mensajes personalizados a usuarios
  // Obtener mensaje para un usuario específico
  app.get("/api/user-messages/:userId", ensureAuth, async (req, res) => {
    try {
      const { userId } = req.params;

      // El administrador puede ver cualquier mensaje, pero los usuarios regulares solo los suyos
      if (req.user?.role !== UserRole.ADMINISTRADOR && req.user?.id !== parseInt(userId)) {
        return res.status(403).json({ error: "No tienes permiso para ver este mensaje" });
      }

      const messages = await db
        .select()
        .from(userMessages)
        .where(eq(userMessages.userId, parseInt(userId)))
        .orderBy(desc(userMessages.createdAt));

      // Retornar el mensaje activo más reciente
      const activeMessage = messages.find(msg => msg.isActive);

      res.json(activeMessage || null);
    } catch (error) {
      console.error("Error al obtener mensaje de usuario:", error);
      res.status(500).json({ error: "Error al obtener mensaje de usuario" });
    }
  });

  // Crear o actualizar mensaje para un usuario (solo administrador)
  app.post("/api/user-messages/:userId", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { message } = req.body;

      if (!userId || !message) {
        return res.status(400).json({ error: "El ID de usuario y el mensaje son requeridos" });
      }

      // Validar que el usuario existe
      const [userExists] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!userExists) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Desactivar mensajes anteriores
      await db
        .update(userMessages)
        .set({ isActive: false })
        .where(eq(userMessages.userId, userId));

      // Crear nuevo mensaje
      const [newMessage] = await db
        .insert(userMessages)
        .values({
          userId,
          message,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      res.json(newMessage);
    } catch (error) {
      console.error("Error al crear mensaje de usuario:", error);
      res.status(500).json({ error: "Error al crear mensaje de usuario" });
    }
  });

  // Actualizar estado de un mensaje (activar/desactivar)
  app.patch("/api/user-messages/:userId/:id/status", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isActive } = req.body;

      if (isActive === undefined) {
        return res.status(400).json({ error: "El estado del mensaje es requerido" });
      }

      const [updatedMessage] = await db
        .update(userMessages)
        .set({ 
          isActive, 
          updatedAt: new Date() 
        })
        .where(eq(userMessages.id, parseInt(id)))
        .returning();

      if (!updatedMessage) {
        return res.status(404).json({ error: "Mensaje no encontrado" });
      }

      res.json(updatedMessage);
    } catch (error) {
      console.error("Error al actualizar mensaje:", error);
      res.status(500).json({ error: "Error al actualizar mensaje" });
    }
  });

  // Actualizar contenido de un mensaje - endpoint simplificado
  app.put("/api/user-messages/:userId/:id", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      console.log("PUT /api/user-messages/:userId/:id - Request params:", req.params);
      console.log("PUT /api/user-messages/:userId/:id - Request body:", req.body);
      console.log("PUT /api/user-messages/:userId/:id - Request body type:", typeof req.body);
      console.log("PUT /api/user-messages/:userId/:id - Request headers:", req.headers);

      // Obtener los parámetros de la URL
      const id = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);

      // Verificar si el cuerpo de la solicitud es válido
      if (!req.body) {
        return res.status(400).json({ error: "No se recibió el contenido de la solicitud" });
      }

      // Extraer el mensaje del cuerpo, con varias alternativas para flexibilidad
      let messageContent = null;
      if (typeof req.body === 'string') {
        messageContent = req.body;
      } else if (req.body.message) {
        messageContent = req.body.message;
      } else if (req.body.contenido) {
        messageContent = req.body.contenido;
      } else if (req.body.text) {
        messageContent = req.body.text;
      } else {
        // Si no podemos encontrar el mensaje, tomamos la primera propiedad del objeto
        const keys = Object.keys(req.body);
        if (keys.length > 0) {
          messageContent = req.body[keys[0]];
        }
      }

      console.log("PUT /api/user-messages - Extracted message:", messageContent);

      // Validar que tengamos un mensaje
      if (!messageContent || (typeof messageContent === 'string' && !messageContent.trim())) {
        return res.status(400).json({ error: "El mensaje no puede estar vacío" });
      }

      const [updatedMessage] = await db
        .update(userMessages)
        .set({ 
          message: typeof messageContent === 'string' ? messageContent.trim() : String(messageContent), 
          updatedAt: new Date() 
        })
        .where(and(
          eq(userMessages.id, id),
          eq(userMessages.userId, userId)
        ))
        .returning();

      if (!updatedMessage) {
        return res.status(404).json({ error: "Mensaje no encontrado" });
      }

      res.json(updatedMessage);
    } catch (error) {
      console.error("Error al actualizar contenido del mensaje:", error);
      res.status(500).json({ error: "Error al actualizar contenido del mensaje" });
    }
  });

  // Eliminar mensaje
  app.delete("/api/user-messages/:userId/:id", ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);

      await db
        .delete(userMessages)
        .where(and(
          eq(userMessages.id, id),
          eq(userMessages.userId, userId)
        ));

      res.json({ message: "Mensaje eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar mensaje:", error);
      res.status(500).json({ error: "Error al eliminar mensaje" });
    }
  });



  // NUEVO SISTEMA DE BOLETAS - SOLO ANÁLISIS (SIN GUARDAR)
  app.post("/api/receipts/analyze", ensureAuth, uploadReceipt.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se proporcionó archivo" });
      }

      // Solo analizar y extraer datos, NO guardar en BD
      const filePath = req.file.path;
      const analysisResult = await analyzeReceiptImage(filePath);
      
      res.json(analysisResult);
    } catch (error) {
      console.error("Error al analizar imagen:", error);
      res.status(500).json({ error: "Error al analizar la imagen" });
    }
  });

  // NUEVO SISTEMA DE BOLETAS - SOLO GUARDAR (UNA SOLA VEZ)
  app.post("/api/receipts/create", ensureAuth, uploadReceipt.single('image'), async (req, res) => {
    try {
      let imageUrl = null;
      
      // Guardar archivo si existe
      if (req.file) {
        imageUrl = `/uploads/receipts/${req.file.filename}`;
      }

      const {
        date,
        total,
        vendor,
        category,
        description,
        companyId,
        taxAmount
      } = req.body;

      // Validaciones estrictas
      if (!date || !total || !companyId || !category || !description) {
        return res.status(400).json({ 
          error: "Todos los campos marcados como obligatorios son requeridos" 
        });
      }

      // Obtener categoryId
      let categoryRecord = await db
        .select()
        .from(categories)
        .where(eq(categories.name, category))
        .limit(1);

      let categoryId: number;
      if (categoryRecord.length === 0) {
        // Crear categoría si no existe
        const [newCategory] = await db
          .insert(categories)
          .values({
            name: category,
            description: `Categoría: ${category}`,
            createdBy: req.user!.id
          })
          .returning();
        categoryId = newCategory.id;
      } else {
        categoryId = categoryRecord[0].id;
      }

      // Generar receiptId único
      const lastReceipt = await db
        .select({ receiptId: receipts.receiptId })
        .from(receipts)
        .orderBy(desc(receipts.id))
        .limit(1);

      const nextReceiptId = lastReceipt.length > 0 
        ? (parseInt(lastReceipt[0].receiptId) + 1).toString()
        : "1";

      // Insertar boleta UNA SOLA VEZ
      const [newReceipt] = await db
        .insert(receipts)
        .values({
          userId: req.user!.id,
          companyId: parseInt(companyId),
          categoryId,
          receiptId: nextReceiptId,
          date: new Date(date),
          total: parseFloat(total).toString(),
          vendor: vendor || '',
          taxAmount: taxAmount ? parseFloat(taxAmount).toString() : Math.round(parseFloat(total) * 0.19).toString(),
          rawText: description,
          imageUrl
        })
        .returning();

      res.json({
        success: true,
        receipt: newReceipt
      });

    } catch (error) {
      console.error("Error al crear boleta:", error);
      res.status(500).json({ error: "Error al crear la boleta" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}