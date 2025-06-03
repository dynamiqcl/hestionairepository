import { Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

// Configuración de almacenamiento robusto
class StorageService {
  private baseUploadPath = path.join(process.cwd(), 'uploads');
  
  constructor() {
    this.ensureDirectoriesExist();
  }

  private async ensureDirectoriesExist() {
    const directories = [
      path.join(this.baseUploadPath, 'receipts'),
      path.join(this.baseUploadPath, 'documents'),
      path.join(this.baseUploadPath, 'temp')
    ];

    for (const dir of directories) {
      try {
        await access(dir);
      } catch {
        await mkdir(dir, { recursive: true });
        console.log(`Directorio creado: ${dir}`);
      }
    }
  }

  // Configuración de multer para recibos
  getReceiptStorage() {
    return multer.diskStorage({
      destination: async (req: Request, file, cb) => {
        const uploadPath = path.join(this.baseUploadPath, 'receipts');
        try {
          await access(uploadPath);
        } catch {
          await mkdir(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req: Request, file, cb) => {
        // Generar nombre único con timestamp y hash
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const ext = path.extname(file.originalname);
        const safeName = `receipt_${timestamp}_${randomString}${ext}`;
        cb(null, safeName);
      }
    });
  }

  // Configuración de multer para documentos
  getDocumentStorage() {
    return multer.diskStorage({
      destination: async (req: Request, file, cb) => {
        const uploadPath = path.join(this.baseUploadPath, 'documents');
        try {
          await access(uploadPath);
        } catch {
          await mkdir(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req: Request, file, cb) => {
        // Generar nombre único con timestamp y hash
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const ext = path.extname(file.originalname);
        const safeName = `doc_${timestamp}_${randomString}${ext}`;
        cb(null, safeName);
      }
    });
  }

  // Validación de archivos de recibo
  receiptFileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'application/pdf'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF) y PDF.'));
    }
  }

  // Validación de archivos de documento
  documentFileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten PDF, Word, Excel, texto e imágenes.'));
    }
  }

  // Eliminar archivo físico
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseUploadPath, filePath.replace('/uploads/', ''));
      await promisify(fs.unlink)(fullPath);
      console.log(`Archivo eliminado: ${fullPath}`);
      return true;
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      return false;
    }
  }

  // Obtener información del archivo
  getFileInfo(filePath: string) {
    try {
      const fullPath = path.join(this.baseUploadPath, filePath.replace('/uploads/', ''));
      const stats = fs.statSync(fullPath);
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        path: fullPath
      };
    } catch (error) {
      return {
        exists: false,
        error: String(error)
      };
    }
  }

  // Generar URL pública para el archivo
  getPublicUrl(filename: string, type: 'receipts' | 'documents'): string {
    return `/uploads/${type}/${filename}`;
  }

  // Limpiar archivos temporales antiguos (más de 24 horas)
  async cleanupTempFiles() {
    try {
      const tempDir = path.join(this.baseUploadPath, 'temp');
      const files = await promisify(fs.readdir)(tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await promisify(fs.stat)(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await promisify(fs.unlink)(filePath);
          console.log(`Archivo temporal eliminado: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error al limpiar archivos temporales:', error);
    }
  }
}

// Instancia única del servicio de almacenamiento
export const storageService = new StorageService();

// Configuraciones de multer usando el servicio
export const uploadReceipt = multer({
  storage: storageService.getReceiptStorage(),
  fileFilter: storageService.receiptFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 1
  }
});

export const uploadDocument = multer({
  storage: storageService.getDocumentStorage(),
  fileFilter: storageService.documentFileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB máximo
    files: 1
  }
});

// Limpieza automática cada 6 horas
setInterval(() => {
  storageService.cleanupTempFiles();
}, 6 * 60 * 60 * 1000);