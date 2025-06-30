import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Crear cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Verify API key availability
if (!process.env.OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY not found in environment variables');
}

// Convertir un archivo a base64 para enviarlo a OpenAI
const readFile = promisify(fs.readFile);

async function fileToBase64(filePath: string): Promise<string> {
  const fileBuffer = await readFile(filePath);
  return fileBuffer.toString('base64');
}

// Analizar imagen de una boleta usando GPT-4 Vision
export async function analyzeReceiptImage(filePath: string) {
  try {
    const fileType = path.extname(filePath).toLowerCase();
    let base64Image: string;
    
    // Procesamiento específico para PDFs
    if (fileType === '.pdf') {
      try {
        // Leer el archivo PDF
        const fileBuffer = await readFile(filePath);
        
        // Importar pdf-parse dinámicamente para evitar problemas de inicialización
        const pdfParse = (await import('pdf-parse')).default;
        
        // Extraer texto del PDF
        const pdfData = await pdfParse(fileBuffer);
        const extractedText = pdfData.text;
        
        console.log('Texto extraído del PDF:', extractedText.substring(0, 500) + '...');
        
        // Procesar el texto con OpenAI (no Vision API)
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `Eres un sistema especializado en extraer datos de boletas y facturas chilenas a partir de texto extraído de PDFs.
              
              Extrae la siguiente información del texto proporcionado:
              1. Fecha de emisión en formato YYYY-MM-DD
              2. Monto total en pesos chilenos (solo el número, sin separadores de miles)
              3. Nombre del vendedor o empresa
              4. Categoría sugerida (elige entre: Alimentación, Transporte, Oficina, Servicios, Patente Municipal, Otros)
              5. Descripción detallada de la compra o servicio
              
              Responde ÚNICAMENTE en formato JSON con las propiedades: date, total, vendor, category, description.
              Asegúrate de hacer tu mejor esfuerzo en interpretar el contenido. Si no puedes determinar algún valor con certeza, usa valores razonables basados en el contexto.`
            },
            {
              role: "user",
              content: `Analiza el siguiente texto extraído de un PDF de boleta o factura chilena y extrae la información solicitada:

${extractedText}`
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: 800,
        });
        
        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error("No se recibió respuesta de OpenAI para el PDF");
        }
        
        const extractedData = JSON.parse(content);
        
        // Convertir la fecha a objeto Date si no lo es
        if (typeof extractedData.date === 'string') {
          extractedData.date = new Date(extractedData.date);
        }
        
        // Asegurarnos que el total sea un número
        if (typeof extractedData.total === 'string') {
          extractedData.total = parseFloat(extractedData.total.replace(/[^\d.-]/g, ''));
        }
        
        return {
          success: true,
          extractedData
        };
      } catch (error) {
        console.error('Error procesando PDF con OpenAI:', error);
        return {
          success: false,
          message: 'Error al procesar PDF: ' + (error instanceof Error ? error.message : 'Error desconocido'),
          extractedData: {
            date: new Date(),
            total: 0,
            vendor: 'Documento PDF',
            category: 'Otros',
            description: `Archivo: ${path.basename(filePath)}`,
          }
        };
      }
    }
    
    // Convertir imagen a base64
    base64Image = await fileToBase64(filePath);
    
    // El modelo más reciente de OpenAI es "gpt-4o" que fue lanzado después del 13 de mayo de 2024
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Eres un sistema especializado en extraer datos de boletas y facturas chilenas.
          Extrae la siguiente información:
          1. Fecha de emisión en formato YYYY-MM-DD
          2. Monto total en pesos chilenos (solo el número, sin separadores de miles)
          3. Nombre del vendedor o empresa
          4. Categoría sugerida (elige entre: Alimentación, Transporte, Oficina, Otros)
          5. Descripción breve de la compra
          
          Responde ÚNICAMENTE en formato JSON con las propiedades: date, total, vendor, category, description.
          Si no puedes determinar algún valor, usa valores por defecto lógicos.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analiza esta boleta y extrae los datos solicitados."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    // Procesar la respuesta
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No se recibió respuesta de OpenAI");
    }

    const extractedData = JSON.parse(content);
    
    // Convertir la fecha a objeto Date si no lo es
    if (typeof extractedData.date === 'string') {
      extractedData.date = new Date(extractedData.date);
    }
    
    // Asegurarnos que el total sea un número
    if (typeof extractedData.total === 'string') {
      extractedData.total = parseFloat(extractedData.total.replace(/[^\d.-]/g, ''));
    }
    
    return {
      success: true,
      extractedData
    };
  } catch (error) {
    console.error('Error analizando la boleta con OpenAI:', error);
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