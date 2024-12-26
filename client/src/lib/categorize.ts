import * as tf from '@tensorflow/tfjs';

const categories = ['Food', 'Transport', 'Office', 'Other'];

// Simple keyword-based categorization
function categorizeByKeywords(text: string): string {
  const textLower = text.toLowerCase();
  
  if (textLower.includes('restaurant') || textLower.includes('food') || textLower.includes('cafe')) {
    return 'Food';
  }
  if (textLower.includes('taxi') || textLower.includes('uber') || textLower.includes('transport')) {
    return 'Transport';
  }
  if (textLower.includes('office') || textLower.includes('supplies') || textLower.includes('equipment')) {
    return 'Office';
  }
  return 'Other';
}

// Extract amount from text
function extractAmount(text: string): number {
  const amountRegex = /\$?\s*(\d+(\.\d{2})?)/;
  const match = text.match(amountRegex);
  return match ? parseFloat(match[1]) : 0;
}

// Extract date from text
function extractDate(text: string): Date {
  const dateRegex = /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/;
  const match = text.match(dateRegex);
  return match ? new Date(match[0]) : new Date();
}

// Extract vendor name from text
function extractVendor(text: string): string {
  // Simple heuristic: take first line that's not a date or amount
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\$?\s*\d+\.\d{2})/)) {
      return line.trim();
    }
  }
  return 'Unknown Vendor';
}

export function categorizeReceipt(text: string) {
  return {
    date: extractDate(text),
    total: extractAmount(text),
    vendor: extractVendor(text),
    category: categorizeByKeywords(text),
    taxAmount: extractAmount(text) * 0.1, // Simple assumption for tax
  };
}
