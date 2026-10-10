import { RiskCategory } from '../types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function getRiskCategory(score: number): 'Healthy' | 'Watch' | 'High Risk' {
  if (score >= 70) return 'High Risk';
  if (score >= 40) return 'Watch';
  return 'Healthy';
}

export function getRiskColorClass(category: RiskCategory): {
  bg: string;
  text: string;
  border: string;
  badge: string;
  dot: string;
  lightBg: string;
} {
  switch (category) {
    case 'High Risk':
    case 'Critical': // Red #EF4444
      return {
        bg: 'bg-red-500',
        text: 'text-red-700',
        border: 'border-red-200',
        badge: 'bg-red-50 text-red-700 border border-red-200',
        dot: 'bg-red-500',
        lightBg: 'bg-red-50/70'
      };
    case 'Watch':
    case 'High': // Orange #F97316
    case 'Medium': // Yellow #F59E0B
      return {
        bg: 'bg-amber-500',
        text: 'text-amber-800',
        border: 'border-amber-200',
        badge: 'bg-amber-50 text-amber-800 border border-amber-200',
        dot: 'bg-amber-500',
        lightBg: 'bg-amber-50/70'
      };
    case 'Healthy':
    case 'Low': // Green #10B981
    default:
      return {
        bg: 'bg-emerald-500',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        dot: 'bg-emerald-500',
        lightBg: 'bg-emerald-50/70'
      };
  }
}
