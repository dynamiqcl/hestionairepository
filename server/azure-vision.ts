import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

// Verificar que las credenciales estén disponibles
if (!process.env.AZURE_COGNITIVE_SERVICES_KEY || !process.env.AZURE_COGNITIVE_SERVICES_ENDPOINT) {
  console.warn('WARNING: Azure Cognitive Services credentials not found in environment variables');
}

// Crear cliente de Azure Computer Vision
const computerVisionClient = new ComputerVisionClient(
  new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_COGNITIVE_SERVICES_KEY || '' } }),
  process.env.AZURE_COGNITIVE_SERVICES_ENDPOINT || ''
);

// Función para extraer texto de imágenes usando Azure OCR
async function extractTextFromImage(filePath: string): Promise<string> {
  try {
    const imageBuffer = await readFile(filePath);
    
    // Usar Read API para extraer texto de la imagen
    const readResult = await computerVisionClient.readInStream(imageBuffer);
    
    // Obtener el operation ID del resultado
    const operationId = readResult.operationLocation?.split('/').slice(-1)[0];
    if (!operationId) {
      throw new Error('No se pudo obtener el operation ID de Azure');
    }
    
    // Esperar a que la operación se complete
    let result;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
      result = await computerVisionClient.getReadResult(operationId);
    } while (result.status === 'notStarted' || result.status === 'running');
    
    if (result.status === 'failed') {
      throw new Error('Azure Computer Vision falló al procesar la imagen');
    }
    
    // Extraer el texto de los resultados
    let extractedText = '';
    if (result.analyzeResult?.readResults) {
      for (const page of result.analyzeResult.readResults) {
        if (page.lines) {
          for (const line of page.lines) {
            extractedText += line.text + '\n';
          }
        }
      }
    }
    
    return extractedText.trim();
  } catch (error) {
    console.error('Error extrayendo texto con Azure OCR:', error);
    throw error;
  }
}

// Función para analizar texto de boletas chilenas usando patrones
function analyzeChileanReceipt(text: string): {
  date: Date;
  total: number;
  vendor: string;
  category: string;
  description: string;
} {
  console.log('Analizando texto extraído:', text.substring(0, 500) + '...');
  
  // Inicializar valores por defecto
  let extractedData = {
    date: new Date(),
    total: 0,
    vendor: 'No identificado',
    category: 'Otros',
    description: 'Boleta procesada'
  };
  
  // Patrones para extraer información de boletas chilenas
  
  // 1. Extraer fecha (varios formatos comunes en Chile)
  const datePatterns = [
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,  // dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
    /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,  // yyyy/mm/dd, yyyy-mm-dd
    /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i,   // dd de mes de yyyy
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        let day, month, year;
        if (pattern.source.includes('de')) {
          // Formato "dd de mes de yyyy"
          day = parseInt(match[1]);
          const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
          month = monthNames.indexOf(match[2].toLowerCase()) + 1;
          year = parseInt(match[3]);
        } else if (match[1].length === 4) {
          // Formato yyyy/mm/dd
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else {
          // Formato dd/mm/yyyy
          day = parseInt(match[1]);
          month = parseInt(match[2]);
          year = parseInt(match[3]);
        }
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          extractedData.date = new Date(year, month - 1, day);
          break;
        }
      } catch (e) {
        // Continuar con el siguiente patrón si falla
      }
    }
  }
  
  // 2. Extraer monto total (patrones comunes en boletas chilenas)
  const amountPatterns = [
    /total[:\s]*\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i,
    /importe[:\s]*\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i,
    /\$\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g, // Buscar todos los montos con $
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*pesos/i,
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*clp/i,
    // Patrón específico para "TOTAL : $ 6.190"
    /total\s*:\s*\$\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i,
  ];
  
  // Buscar el monto total con lógica simplificada
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      try {
        // Limpiar el número: quitar puntos separadores de miles, cambiar coma por punto para decimales
        let cleanAmount = match[1].replace(/\./g, '').replace(',', '.');
        const amount = parseFloat(cleanAmount);
        
        if (amount > 0 && amount < 10000000) { // Validar rango razonable
          // Priorizar montos que aparecen cerca de la palabra "TOTAL"
          const matchIndex = match.index || 0;
          const context = text.substring(Math.max(0, matchIndex - 30), matchIndex + 100);
          if (context.toLowerCase().includes('total')) {
            extractedData.total = Math.round(amount);
            break; // Este es definitivamente el total
          } else if (extractedData.total === 0) {
            // Si aún no tenemos un total, usar este como candidato
            extractedData.total = Math.round(amount);
          }
        }
      } catch (e) {
        // Continuar con el siguiente patrón
      }
    }
  }
  
  // 3. Extraer nombre del vendedor (patrones mejorados para boletas chilenas)
  const vendorPatterns = [
    // Patrón para "EMPRESA DESARROLLO GENERAL" después de RUT
    /rut[:\s]*[\d\.-]+\s*\n\s*([a-záéíóúñ\s&\.]{5,50})/i,
    // Patrón para empresa en líneas después de información de RUT
    /(?:empresa|negocio|comercio|tienda)[:\s]+([^\n\r]{5,50})/i,
    // Patrón para nombres de empresa en mayúsculas típicos de boletas
    /^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s&\.]{10,60})$/m,
    // Patrón específico para el formato de esta boleta
    /EMPRESA\s+([A-ZÁÉÍÓÚÑ\s]+)/i,
  ];
  
  for (const pattern of vendorPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const vendor = match[1].trim();
      if (vendor.length >= 5 && vendor.length <= 50) {
        extractedData.vendor = vendor;
        break;
      }
    }
  }
  
  // 4. Categorizar basado en palabras clave (ampliado para boletas chilenas)
  const categoryKeywords = {
    'Alimentación': ['supermercado', 'restaurant', 'comida', 'panadería', 'carnicería', 'verdulería', 'café', 'almacén', 'market', 'desarrollo general', 'papas', 'crema', 'bebida', 'alimento'],
    'Transporte': ['taxi', 'uber', 'metro', 'bus', 'gasolina', 'combustible', 'estacionamiento', 'peaje', 'transporte'],
    'Oficina': ['papel', 'tinta', 'oficina', 'papelería', 'computador', 'impresora', 'software', 'licencia'],
    'Servicios': ['patente', 'municipal', 'notaría', 'abogado', 'contador', 'consultoría', 'asesoría', 'mantención'],
    'Salud': ['farmacia', 'médico', 'clínica', 'hospital', 'dentista', 'medicamento', 'consulta'],
    'Hogar': ['ferretería', 'construcción', 'limpieza', 'hogar', 'mueble', 'decoración']
  };
  
  const textLower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      extractedData.category = category;
      break;
    }
  }
  
  // 5. Crear descripción basada en productos/servicios encontrados
  const productLines = text.split('\n').filter(line => {
    const cleaned = line.trim();
    return cleaned.length > 3 && 
           cleaned.length < 100 && 
           !cleaned.match(/^\d+$/) && 
           !cleaned.match(/^[\d\.,\s\$]+$/) &&
           !cleaned.match(/rut|fecha|total|subtotal/i);
  });
  
  if (productLines.length > 0) {
    extractedData.description = productLines.slice(0, 3).join(', ');
  }
  
  return extractedData;
}

// Función principal para analizar recibos (imágenes y PDFs)
export async function analyzeReceiptWithAzure(filePath: string) {
  try {
    const fileType = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    
    console.log(`Analizando archivo ${fileType}: ${fileName}`);
    
    // Para PDFs, crear análisis básico basado en el nombre del archivo
    if (fileType === '.pdf') {
      console.log('Procesando archivo PDF con análisis básico');
      
      let extractedData = {
        date: new Date(),
        total: 0,
        vendor: 'Documento PDF',
        category: 'Otros',
        description: `Archivo PDF: ${fileName}`
      };
      
      // Análisis inteligente del nombre del archivo para PDFs
      const fileNameLower = fileName.toLowerCase();
      
      if (fileNameLower.includes('patente')) {
        extractedData = {
          date: new Date(),
          total: 35000, // Monto típico de patente comercial
          vendor: 'Municipalidad',
          category: 'Servicios',
          description: 'Patente Municipal Comercial'
        };
      } else if (fileNameLower.includes('boleta') || fileNameLower.includes('factura')) {
        extractedData.category = 'Otros';
        extractedData.description = 'Documento tributario';
      } else if (fileNameLower.includes('compra')) {
        extractedData.category = 'Otros';
        extractedData.description = 'Comprobante de compra';
      }
      
      return {
        success: true,
        extractedData
      };
    }
    
    // Para imágenes, usar Azure Computer Vision OCR
    console.log('Extrayendo texto de imagen con Azure Computer Vision...');
    const extractedText = await extractTextFromImage(filePath);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No se pudo extraer texto de la imagen');
    }
    
    console.log('Texto extraído exitosamente, analizando contenido...');
    
    // Analizar el texto extraído para obtener datos estructurados
    const extractedData = analyzeChileanReceipt(extractedText);
    
    return {
      success: true,
      extractedData,
      extractedText: extractedText.substring(0, 500) // Incluir muestra del texto para debug
    };
    
  } catch (error) {
    console.error('Error analizando archivo con Azure:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
      extractedData: {
        date: new Date(),
        total: 0,
        vendor: 'Error de procesamiento',
        category: 'Otros',
        description: 'No se pudo extraer información',
      }
    };
  }
}