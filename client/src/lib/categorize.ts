import * as tf from '@tensorflow/tfjs';

const categories = ['Alimentación', 'Transporte', 'Oficina', 'Otros'];

// Preprocesamiento avanzado de imágenes
const preprocessImage = async (imageData: ImageData): Promise<tf.Tensor3D> => {
  // Convertir la imagen a tensor
  const tensor = tf.browser.fromPixels(imageData);

  // Normalizar los valores de píxeles
  const normalized = tensor.toFloat().div(255);

  // Mejorar el contraste
  const enhanced = tf.tidy(() => {
    const mean = normalized.mean();
    const std = normalized.sub(mean).square().mean().sqrt();
    return normalized.sub(mean).div(std).clipByValue(-3, 3).add(0.5);
  });

  return enhanced as tf.Tensor3D;
};

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

// Validación mejorada de autenticidad de la boleta
function validateReceipt(text: string): { isValid: boolean; confidence: number; issues: string[] } {
  const issues: string[] = [];
  let confidence = 1.0;

  // Verificar formato básico con expresiones regulares más precisas
  const dateRegex = /\b\d{1,2}[-/.]\d{1,2}[-/.}](?:20)?(?:19)?\d{2}\b/;
  const amountRegex = /\$?\s*\d{1,3}(?:\.\d{3})*(?:\,[0-9]{2})?/;
  const rutRegex = /\b\d{1,2}(?:\.\d{3}){2}-[\dkK]\b/;

  if (!text.match(dateRegex)) {
    issues.push("No se encontró una fecha válida en formato dd/mm/yyyy");
    confidence *= 0.7;
  }

  if (!text.match(amountRegex)) {
    issues.push("No se encontró un monto válido en formato chileno");
    confidence *= 0.7;
  }

  if (!text.match(rutRegex)) {
    issues.push("No se encontró un RUT válido");
    confidence *= 0.8;
  }

  // Verificar palabras clave esperadas con pesos diferentes
  const keywordWeights = {
    'boleta': 0.9,
    'total': 0.8,
    'rut': 0.7,
    'fecha': 0.7,
    'iva': 0.6,
    'neto': 0.6
  };

  const foundKeywords = Object.entries(keywordWeights).filter(([keyword]) =>
    text.toLowerCase().includes(keyword)
  );

  const keywordConfidence = foundKeywords.reduce((acc, [_, weight]) => acc + weight, 0) / 
                           Object.values(keywordWeights).reduce((a, b) => a + b, 0);

  confidence *= (0.3 + 0.7 * keywordConfidence);

  // Verificar estructura y longitud del texto
  if (text.length < 50) {
    issues.push("El texto extraído es muy corto para ser una boleta válida");
    confidence *= 0.9;
  }

  // Verificar coherencia de los datos
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 4) {
    issues.push("La boleta parece tener muy pocas líneas de información");
    confidence *= 0.9;
  }

  return {
    isValid: confidence > 0.65,
    confidence,
    issues
  };
}

// Categorización mejorada basada en palabras clave y contexto
function categorizeByKeywords(text: string): { category: string; confidence: number } {
  const textLower = text.toLowerCase();
  const scores = new Map<string, number>();

  // Inicializar scores
  categories.forEach(cat => scores.set(cat, 0));

  // Palabras clave por categoría con pesos
  const keywordWeights = {
    'Alimentación': {
      'restaurant': 1.0,
      'comida': 0.9,
      'menu': 0.8,
      'almuerzo': 0.9,
      'cena': 0.9,
      'cafe': 0.8,
      'supermercado': 0.7,
      'alimentos': 0.8
    },
    'Transporte': {
      'taxi': 1.0,
      'uber': 1.0,
      'transporte': 0.9,
      'pasaje': 0.9,
      'combustible': 0.8,
      'estacionamiento': 0.8,
      'peaje': 0.9,
      'bencina': 0.9
    },
    'Oficina': {
      'oficina': 1.0,
      'papeleria': 0.9,
      'impresion': 0.8,
      'material': 0.7,
      'suministros': 0.8,
      'libreria': 0.8,
      'computacion': 0.8
    }
  };

  // Calcular scores basados en palabras clave con pesos
  Object.entries(keywordWeights).forEach(([category, keywords]) => {
    Object.entries(keywords).forEach(([word, weight]) => {
      if (textLower.includes(word)) {
        scores.set(category, (scores.get(category) || 0) + weight);
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

  // Calcular confianza basada en el score y el contexto
  const totalPossibleScore = Object.values(keywordWeights[bestCategory as keyof typeof keywordWeights] || {})
    .reduce((sum, weight) => sum + weight, 0);

  const confidence = Math.min(maxScore / (totalPossibleScore * 0.5), 1);

  return {
    category: bestCategory,
    confidence
  };
}

// Extraer monto del texto en CLP con mejor precisión
function extractAmount(text: string): { amount: number; confidence: number } {
  const patterns = [
    /total:?\s*\$?\s*(\d{1,3}(?:\.\d{3})*(?:\,[0-9]{2})?)/i,
    /\$?\s*(\d{1,3}(?:\.\d{3})*(?:\,[0-9]{2})?)\s*(?:pesos|clp)?/i,
    /(?:valor|precio|monto):?\s*\$?\s*(\d{1,3}(?:\.\d{3})*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/\./g, '').replace(',', '');
      const amount = parseInt(amountStr);

      // Validar que el monto sea razonable
      if (amount > 100 && amount < 10000000) {
        return {
          amount,
          confidence: 0.95
        };
      }
    }
  }

  // Búsqueda más flexible de números
  const numberMatches = text.match(/(\d{4,})/g);
  if (numberMatches) {
    // Tomar el número más grande como posible monto
    const possibleAmounts = numberMatches
      .map(n => parseInt(n))
      .filter(n => n > 100 && n < 10000000);

    if (possibleAmounts.length > 0) {
      return {
        amount: Math.max(...possibleAmounts),
        confidence: 0.7
      };
    }
  }

  return { amount: 0, confidence: 0 };
}

// Extracción mejorada de fecha
function extractDate(text: string): { date: Date; confidence: number } {
  const patterns = [
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/,
    /fecha:?\s*(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/i,
    /(\d{1,2})\s+(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(\d{4})/i
  ];

  const monthMap: { [key: string]: number } = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
    'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  };

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let day: number, month: number, year: number;

      if (match[1] && match[2] && match[3]) {
        // Formato numérico
        day = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        year = parseInt(match[3]);
        if (year < 100) year += 2000;
      } else {
        // Formato texto
        day = parseInt(match[1]);
        const monthText = match[2].toLowerCase();
        month = monthMap[monthText];
        year = parseInt(match[3]);
      }

      const date = new Date(year, month, day);

      // Validar que la fecha sea razonable
      const now = new Date();
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(now.getFullYear() - 2);

      if (!isNaN(date.getTime()) && date >= twoYearsAgo && date <= now) {
        return { date, confidence: 0.95 };
      }
    }
  }

  return { date: new Date(), confidence: 0.5 };
}

// Extracción mejorada de vendedor
function extractVendor(text: string): { vendor: string; confidence: number } {
  const lines = text.split('\n');

  // Buscar patrones comunes de nombres de empresa
  const companyPatterns = [
    /^(?:empresa|tienda|comercial)?\s*([A-Z][A-Za-z\s&]+(?:S\.A\.|LTDA\.?|SPA|E\.I\.R\.L\.)?)\s*$/,
    /^([A-Z][A-Za-z\s&]+(?:S\.A\.|LTDA\.?|SPA|E\.I\.R\.L\.)?)$/,
    /(?:razón\s+social|nombre):\s*([A-Z][A-Za-z\s&]+)/i
  ];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Ignorar líneas que parecen montos o fechas
    if (trimmedLine.match(/^\d{1,3}(?:\.\d{3})*(?:\,[0-9]{2})?$/) ||
        trimmedLine.match(/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/)) {
      continue;
    }

    // Buscar patrones de empresa
    for (const pattern of companyPatterns) {
      const match = trimmedLine.match(pattern);
      if (match && match[1].length > 3) {
        return {
          vendor: match[1].trim(),
          confidence: 0.9
        };
      }
    }

    // Si es una línea larga sin números y con mayúsculas, podría ser el nombre
    if (trimmedLine.length > 3 && 
        trimmedLine.length < 50 &&
        !trimmedLine.match(/\d+/) &&
        trimmedLine.match(/[A-Z]/)) {
      return {
        vendor: trimmedLine,
        confidence: 0.7
      };
    }
  }

  return {
    vendor: 'Desconocido',
    confidence: 0.3
  };
}

export async function categorizeReceipt(text: string, imageData?: ImageData) {
  let enhancedConfidence = 1.0;

  // Si hay datos de imagen, realizar preprocesamiento
  if (imageData) {
    try {
      const processedImage = await preprocessImage(imageData);
      enhancedConfidence = 1.2; // Aumentar la confianza si el preprocesamiento fue exitoso
      processedImage.dispose(); // Liberar memoria
    } catch (error) {
      console.error('Error en el preprocesamiento de imagen:', error);
      enhancedConfidence = 0.9; // Reducir la confianza si hubo error
    }
  }

  const validation = validateReceipt(text);
  const categorization = categorizeByKeywords(text);
  const amountInfo = extractAmount(text);
  const dateInfo = extractDate(text);
  const vendorInfo = extractVendor(text);

  // Ajustar confianzas basadas en el preprocesamiento de imagen
  const adjustedConfidence = {
    overall: validation.confidence * enhancedConfidence,
    category: categorization.confidence * enhancedConfidence,
    amount: amountInfo.confidence * enhancedConfidence,
    date: dateInfo.confidence * enhancedConfidence,
    vendor: vendorInfo.confidence * enhancedConfidence
  };

  return {
    isValid: validation.isValid,
    validationIssues: validation.issues,
    confidence: adjustedConfidence,
    date: dateInfo.date,
    total: amountInfo.amount,
    vendor: vendorInfo.vendor,
    category: categorization.category,
    taxAmount: Math.round(amountInfo.amount * 0.19), // IVA estándar en Chile
  };
}