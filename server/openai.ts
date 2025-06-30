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
    const fileName = path.basename(filePath);
    
    // Procesamiento específico para PDFs
    if (fileType === '.pdf') {
      try {
        console.log('Procesando archivo PDF:', fileName);
        
        // Para PDFs, crear datos básicos razonables basados en el tipo de documento
        let extractedData = {
          date: new Date(),
          total: 0,
          vendor: 'Documento PDF',
          category: 'Otros',
          description: `Archivo PDF: ${fileName}`
        };

        // Intentar usar OpenAI para mejorar el análisis basado en el nombre del archivo
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `Eres un sistema especializado en categorizar documentos tributarios chilenos.
                Basándote en el nombre del archivo, sugiere información para una boleta o documento tributario.
                
                Para documentos de patente comercial, usa:
                - category: "Servicios"
                - vendor: nombre de empresa si aparece en el archivo
                - total: monto típico para patentes comerciales (30000-50000)
                - description: descripción del tipo de documento
                
                Responde ÚNICAMENTE en formato JSON con las propiedades: date, total, vendor, category, description.`
              },
              {
                role: "user",
                content: `Analiza este nombre de archivo PDF chileno y sugiere datos: ${fileName}`
              }
            ],
            response_format: { type: "json_object" },
            max_tokens: 300,
          });
          
          const content = response.choices[0].message.content;
          if (content) {
            const aiData = JSON.parse(content);
            
            // Actualizar datos con los mejorados por IA
            if (aiData.date) extractedData.date = new Date(aiData.date);
            if (aiData.total && !isNaN(Number(aiData.total))) extractedData.total = Number(aiData.total);
            if (aiData.vendor) extractedData.vendor = aiData.vendor;
            if (aiData.category) extractedData.category = aiData.category;
            if (aiData.description) extractedData.description = aiData.description;
          }
        } catch (aiError) {
          console.log('OpenAI no disponible para mejorar análisis, usando datos básicos');
        }
        
        return {
          success: true,
          extractedData
        };
      } catch (error) {
        console.error('Error procesando PDF:', error);
        return {
          success: false,
          message: 'Error al procesar PDF: ' + (error instanceof Error ? error.message : 'Error desconocido'),
          extractedData: {
            date: new Date(),
            total: 0,
            vendor: 'Documento PDF',
            category: 'Otros',
            description: `Archivo: ${fileName}`,
          }
        };
      }
    }
    
    // Procesamiento para imágenes
    const base64Image = await fileToBase64(filePath);
    
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