import { type Receipt } from '@db/schema';

interface SpendingPattern {
  average: number;
  standardDeviation: number;
}

export function calculateSpendingPattern(receipts: Receipt[]): SpendingPattern {
  if (!receipts.length) return { average: 0, standardDeviation: 0 };

  const amounts = receipts.map(r => Number(r.total));
  const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  
  const squareDiffs = amounts.map(value => Math.pow(value - average, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / amounts.length;
  const standardDeviation = Math.sqrt(avgSquareDiff);

  return { average, standardDeviation };
}

export function isUnusualSpending(amount: number, pattern: SpendingPattern): boolean {
  if (pattern.standardDeviation === 0) return false;
  const zScore = Math.abs(amount - pattern.average) / pattern.standardDeviation;
  return zScore > 2; // Consideramos inusual si está a más de 2 desviaciones estándar
}

export function calculateCategoryPattern(receipts: Receipt[], category: string): SpendingPattern {
  const categoryReceipts = receipts.filter(r => r.category === category);
  return calculateSpendingPattern(categoryReceipts);
}

export function calculateFrequencyPattern(receipts: Receipt[], timeframe: string): number {
  const now = new Date();
  const timeframeInDays = timeframe === 'DAILY' ? 1 : timeframe === 'WEEKLY' ? 7 : 30;
  
  const startDate = new Date();
  startDate.setDate(now.getDate() - timeframeInDays);
  
  return receipts.filter(r => new Date(r.date) >= startDate).length;
}

export type AlertType = 'AMOUNT' | 'CATEGORY' | 'FREQUENCY';
export type TimeFrame = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface AlertRule {
  id: number;
  type: AlertType;
  threshold: number;
  category?: string;
  timeframe: TimeFrame;
  isActive: boolean;
}

export function checkAlertRule(rule: AlertRule, receipts: Receipt[], newReceipt: Receipt): boolean {
  switch (rule.type) {
    case 'AMOUNT': {
      const pattern = calculateSpendingPattern(receipts);
      return isUnusualSpending(Number(newReceipt.total), pattern);
    }
    case 'CATEGORY': {
      if (!rule.category) return false;
      const pattern = calculateCategoryPattern(receipts, rule.category);
      return newReceipt.category === rule.category && 
             isUnusualSpending(Number(newReceipt.total), pattern);
    }
    case 'FREQUENCY': {
      const currentFrequency = calculateFrequencyPattern(receipts, rule.timeframe);
      return currentFrequency > rule.threshold;
    }
    default:
      return false;
  }
}
