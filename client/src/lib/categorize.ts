import * as tf from '@tensorflow/tfjs';

const categories = ['Alimentación', 'Transporte', 'Oficina', 'Otros'];

// Modelo simple de embeddings para texto
const createEmbedding = (text: string): number[] => {
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(100).fill(0);

  words.forEach((word, i) => {
    const hash = Array.from(word).reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    embedding[Math.abs(hash) % embedding.length] += 1;
  });

  return embedding;
};

// Validación de autenticidad de la boleta
function validateReceipt(text: string): { isValid: boolean; confidence: number; issues: string[] } {
  const issues: string[] = [];
  let confidence = 1.0;

  // Verificar formato básico
  if (!text.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/)) {
    issues.push("No se encontró una fecha válida");
    confidence *= 0.7;
  }

  if (!text.match(/\$?\s*\d{1,3}(?:\.\d{3})*(?:\,[0-9]{2})?/)) {
    issues.push("No se encontró un monto válido");
    confidence *= 0.7;
  }

  // Verificar palabras clave esperadas
  const expectedKeywords = ['total', 'boleta', 'rut', 'fecha'];
  const foundKeywords = expectedKeywords.filter(keyword =>
    text.toLowerCase().includes(keyword)
  );

  if (foundKeywords.length < 2) {
    issues.push("Faltan elementos básicos de una boleta");
    confidence *= 0.8;
  }

  // Verificar longitud mínima del texto
  if (text.length < 50) {
    issues.push("El texto extraído es muy corto");
    confidence *= 0.9;
  }

  return {
    isValid: confidence > 0.6,
    confidence,
    issues
  };
}

// Categorización basada en palabras clave y contexto
function categorizeByKeywords(text: string): { category: string; confidence: number } {
  const textLower = text.toLowerCase();
  const scores = new Map<string, number>();

  // Inicializar scores
  categories.forEach(cat => scores.set(cat, 0));

  // Palabras clave por categoría
  const keywords = {
    'Alimentación': ['restaurant', 'comida', 'menu', 'almuerzo', 'cena', 'cafe'],
    'Transporte': ['taxi', 'uber', 'transporte', 'pasaje', 'combustible', 'estacionamiento'],
    'Oficina': ['oficina', 'papeleria', 'impresion', 'material', 'suministros'],
    'Otros': []
  };

  // Calcular scores basados en palabras clave
  Object.entries(keywords).forEach(([category, words]) => {
    words.forEach(word => {
      if (textLower.includes(word)) {
        scores.set(category, (scores.get(category) || 0) + 1);
      }
    });
  });

  // Encontrar la categoría con mayor score
  let maxScore = 0;
  let bestCategory = 'Otros';

  scores.forEach((score, category) => {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  });

  // Calcular confianza basada en el score
  const confidence = Math.min(maxScore / 3, 1);

  return {
    category: bestCategory,
    confidence
  };
}

// Extraer monto del texto en CLP
function extractAmount(text: string): { amount: number; confidence: number } {
  const patterns = [
    /\$?\s*(\d{1,3}(?:\.\d{3})*(?:\,[0-9]{2})?)/,  // formato $1.234,56 o $1.234
    /total:?\s*\$?\s*(\d{1,3}(?:\.\d{3})*)/i,      // "Total: $123.456"
    /\$\s*(\d{1,3}(?:\.\d{3})*)/,                  // "$123.456"
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Convertir formato CLP a número
      const amount = parseInt(match[1].replace(/\./g, '').replace(',', ''));
      return {
        amount,
        confidence: 0.9  // Alta confianza para matches exactos
      };
    }
  }

  // Búsqueda más flexible de números
  const numberMatch = text.match(/(\d+)/);
  if (numberMatch) {
    return {
      amount: parseInt(numberMatch[1]),
      confidence: 0.6  // Menor confianza para matches parciales
    };
  }

  return { amount: 0, confidence: 0 };
}

// Extraer fecha del texto
function extractDate(text: string): { date: Date; confidence: number } {
  const patterns = [
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/,  // dd/mm/yyyy o dd-mm-yyyy
    /fecha:?\s*(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/i,  // "Fecha: dd/mm/yyyy"
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let [_, day, month, year] = match;
      if (year.length === 2) year = '20' + year;

      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return { date, confidence: 0.9 };
      }
    }
  }

  return { date: new Date(), confidence: 0.5 };
}

// Extraer vendedor del texto
function extractVendor(text: string): { vendor: string; confidence: number } {
  const lines = text.split('\n');

  // Buscar la primera línea que no sea fecha ni monto
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (
      trimmedLine &&
      !trimmedLine.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/) &&
      !trimmedLine.match(/\$?\s*\d{1,3}(?:\.\d{3})*/) &&
      trimmedLine.length > 3
    ) {
      return {
        vendor: trimmedLine,
        confidence: 0.8
      };
    }
  }

  return {
    vendor: 'Desconocido',
    confidence: 0.3
  };
}

export function categorizeReceipt(text: string) {
  const validation = validateReceipt(text);
  const categorization = categorizeByKeywords(text);
  const amountInfo = extractAmount(text);
  const dateInfo = extractDate(text);
  const vendorInfo = extractVendor(text);

  return {
    isValid: validation.isValid,
    validationIssues: validation.issues,
    confidence: {
      overall: validation.confidence,
      category: categorization.confidence,
      amount: amountInfo.confidence,
      date: dateInfo.confidence,
      vendor: vendorInfo.confidence
    },
    date: dateInfo.date,
    total: amountInfo.amount,
    vendor: vendorInfo.vendor,
    category: categorization.category,
    taxAmount: Math.round(amountInfo.amount * 0.19), // IVA estándar en Chile
  };
}