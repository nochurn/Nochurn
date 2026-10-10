import { Customer, RiskCategory } from '../types';

export interface RiskDistribution {
  high: { count: number; percent: number; mrr: number };
  medium: { count: number; percent: number; mrr: number };
  low: { count: number; percent: number; mrr: number };
  total: number;
  totalMrr: number;
}

export interface ROIConfig {
  highRiskSaveRate: number; // e.g. 0.20 (20%)
  mediumRiskSaveRate: number; // e.g. 0.10 (10%)
  monthlyCost: number; // e.g. 299 (USD)
  period: 'monthly' | 'annual';
}

export interface ROIInsights {
  highRiskMrr: number;
  mediumRiskMrr: number;
  estimatedRecoveredMrr: number;
  productCost: number;
  netMonthlyValue: number;
  roiPercentage: number;
  multiplier: number;
  annualSaved: number;
  annualNetGain: number;
  formulaDescription: string;
}

/**
 * Safely extracts a numeric MRR value from a customer record.
 */
export function getSafeMrr(customer: Partial<Customer>): number {
  if (!customer) return 0;
  const raw: any = customer.mrr;
  if (raw === undefined || raw === null || raw === '') return 0;
  const clean = typeof raw === 'string' ? raw.replace(/[\$,€₹,\s]/g, '') : raw;
  const val = Number(clean);
  return !isNaN(val) && val >= 0 ? val : 0;
}

/**
 * Safely extracts a numeric risk score (0-100) from a customer record.
 * Clamps to 0-100. Returns fallback based on risk level string if numeric score is absent.
 */
export function getSafeRiskScore(customer: Partial<Customer>): number | null {
  if (!customer) return null;
  const raw: any = customer.risk_score !== undefined ? customer.risk_score : customer.riskScore;
  if (raw !== undefined && raw !== null && raw !== '') {
    const num = Number(raw);
    if (!isNaN(num)) {
      return Math.max(0, Math.min(100, Math.round(num)));
    }
  }
  const level = String(customer.risk_level || customer.riskCategory || '').toLowerCase();
  if (level === 'critical') return 90;
  if (level === 'high') return 80;
  if (level === 'medium') return 60;
  if (level === 'low') return 20;
  return null;
}

/**
 * Ensures unique customers by customer_id/id and email.
 */
export function deduplicateCustomers(customers: Customer[]): Customer[] {
  if (!Array.isArray(customers) || customers.length === 0) return [];
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  const unique: Customer[] = [];

  for (const c of customers) {
    if (!c) continue;
    const id = String(c.customer_id || c.customerId || c.id || '').trim();
    const email = String(c.email || '').trim().toLowerCase();

    if (id && seenIds.has(id)) continue;
    if (email && seenEmails.has(email)) continue;

    if (id) seenIds.add(id);
    if (email) seenEmails.add(email);
    unique.push(c);
  }
  return unique;
}

/**
 * Determines the risk level category based on risk score:
 * - High: >= 80
 * - Medium: 50–79
 * - Low: < 50
 */
export function getRiskLevel(score: number | null): RiskCategory {
  if (score === null || score === undefined) return 'Low';
  if (score >= 80) return 'Critical';
  if (score >= 50) return 'Medium';
  return 'Low';
}

/**
 * Total count of current active/monitored customers.
 */
export function getTotalCustomers(customers: Customer[]): number {
  if (!Array.isArray(customers)) return 0;
  return deduplicateCustomers(customers).length;
}

/**
 * Total sum of MRR for all customers.
 */
export function getTotalMRR(customers: Customer[]): number {
  if (!Array.isArray(customers) || customers.length === 0) return 0;
  return Math.round(deduplicateCustomers(customers).reduce((sum, c) => sum + getSafeMrr(c), 0));
}

/**
 * High-risk customer cohort (risk_score >= 80).
 */
export function getHighRiskCustomers(customers: Customer[]): Customer[] {
  if (!Array.isArray(customers)) return [];
  return deduplicateCustomers(customers).filter(c => {
    const score = getSafeRiskScore(c);
    return score !== null && score >= 80;
  });
}

/**
 * Medium-risk customer cohort (risk_score >= 50 and <= 79).
 */
export function getMediumRiskCustomers(customers: Customer[]): Customer[] {
  if (!Array.isArray(customers)) return [];
  return deduplicateCustomers(customers).filter(c => {
    const score = getSafeRiskScore(c);
    return score !== null && score >= 50 && score < 80;
  });
}

/**
 * Low-risk customer cohort (risk_score < 50 or unscored).
 */
export function getLowRiskCustomers(customers: Customer[]): Customer[] {
  if (!Array.isArray(customers)) return [];
  return deduplicateCustomers(customers).filter(c => {
    const score = getSafeRiskScore(c);
    return score === null || score < 50;
  });
}

/**
 * High-risk MRR total.
 */
export function getHighRiskMRR(customers: Customer[]): number {
  return Math.round(getHighRiskCustomers(customers).reduce((sum, c) => sum + getSafeMrr(c), 0));
}

/**
 * Medium-risk MRR total.
 */
export function getMediumRiskMRR(customers: Customer[]): number {
  return Math.round(getMediumRiskCustomers(customers).reduce((sum, c) => sum + getSafeMrr(c), 0));
}

/**
 * MRR at Risk calculation.
 * Formula: High-Risk MRR + (Medium-Risk MRR * mediumRiskWeight)
 * Default mediumRiskWeight = 0.5 (50% of medium-risk MRR at stake).
 */
export function getMRRAtRisk(customers: Customer[], mediumRiskWeight: number = 0.5): number {
  const highMrr = getHighRiskMRR(customers);
  const medMrr = getMediumRiskMRR(customers);
  return Math.round(highMrr + (medMrr * mediumRiskWeight));
}

/**
 * Risk Distribution breakdown (High, Medium, Low) with exact counts, percentages, and MRR.
 * Sum of counts strictly equals total customers.
 */
export function getRiskDistribution(customers: Customer[]): RiskDistribution {
  const total = getTotalCustomers(customers);
  const totalMrr = getTotalMRR(customers);

  if (total === 0) {
    return {
      high: { count: 0, percent: 0, mrr: 0 },
      medium: { count: 0, percent: 0, mrr: 0 },
      low: { count: 0, percent: 0, mrr: 0 },
      total: 0,
      totalMrr: 0
    };
  }

  const high = getHighRiskCustomers(customers);
  const medium = getMediumRiskCustomers(customers);
  const low = getLowRiskCustomers(customers);

  const highCount = high.length;
  const medCount = medium.length;
  const lowCount = low.length;

  const highMrr = Math.round(high.reduce((sum, c) => sum + getSafeMrr(c), 0));
  const medMrr = Math.round(medium.reduce((sum, c) => sum + getSafeMrr(c), 0));
  const lowMrr = Math.round(low.reduce((sum, c) => sum + getSafeMrr(c), 0));

  return {
    high: {
      count: highCount,
      percent: Math.round((highCount / total) * 100),
      mrr: highMrr
    },
    medium: {
      count: medCount,
      percent: Math.round((medCount / total) * 100),
      mrr: medMrr
    },
    low: {
      count: lowCount,
      percent: Math.round((lowCount / total) * 100),
      mrr: lowMrr
    },
    total,
    totalMrr
  };
}

/**
 * Average risk score across active customers with a valid score.
 */
export function getAverageRiskScore(customers: Customer[]): number {
  if (!Array.isArray(customers) || customers.length === 0) return 0;
  const validScores: number[] = [];
  customers.forEach(c => {
    const score = getSafeRiskScore(c);
    if (score !== null) validScores.push(score);
  });
  if (validScores.length === 0) return 0;
  return Math.round(validScores.reduce((sum, s) => sum + s, 0) / validScores.length);
}

/**
 * Customers Needing Action:
 * All high-risk accounts (score >= 80) plus medium-risk accounts (score 50–79) due for renewal within 30 days.
 */
export function getCustomersNeedingAction(customers: Customer[]): Customer[] {
  if (!Array.isArray(customers)) return [];
  return customers.filter(c => {
    if (c.status === 'saved') return false;
    const score = getSafeRiskScore(c);
    if (score !== null && score >= 80) return true;
    
    // Medium risk with upcoming renewal
    if (score !== null && score >= 50) {
      const renewalDays = c.renewalDaysLeft ?? (c as any).contractRenewalDays;
      if (renewalDays !== undefined && renewalDays <= 30) return true;
      if (c.renewal_date) {
        const diffDays = Math.ceil((new Date(c.renewal_date).getTime() - Date.now()) / 86400000);
        if (diffDays >= 0 && diffDays <= 30) return true;
      }
    }
    return false;
  });
}

/**
 * Top at-risk accounts sorted by risk score desc, then MRR desc.
 */
export function getTopRiskAccounts(customers: Customer[], limit: number = 5): Customer[] {
  if (!Array.isArray(customers)) return [];
  return [...customers]
    .sort((a, b) => {
      const scoreA = getSafeRiskScore(a) ?? -1;
      const scoreB = getSafeRiskScore(b) ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return getSafeMrr(b) - getSafeMrr(a);
    })
    .slice(0, limit);
}

/**
 * Distribution of customers by subscription plan.
 */
export function getPlanDistribution(customers: Customer[]): { plan: string; count: number; mrr: number; percent: number }[] {
  if (!Array.isArray(customers) || customers.length === 0) return [];
  const map = new Map<string, { count: number; mrr: number }>();
  
  customers.forEach(c => {
    const plan = c.plan || 'Starter';
    const entry = map.get(plan) || { count: 0, mrr: 0 };
    entry.count += 1;
    entry.mrr += getSafeMrr(c);
    map.set(plan, entry);
  });

  const total = customers.length;
  return Array.from(map.entries()).map(([plan, data]) => ({
    plan,
    count: data.count,
    mrr: Math.round(data.mrr),
    percent: Math.round((data.count / total) * 100)
  })).sort((a, b) => b.mrr - a.mrr);
}

/**
 * Distribution of customers by payment status.
 */
export function getPaymentStatusDistribution(customers: Customer[]): { status: string; count: number; mrr: number; percent: number }[] {
  if (!Array.isArray(customers) || customers.length === 0) return [];
  const map = new Map<string, { count: number; mrr: number }>();

  customers.forEach(c => {
    const status = c.paymentStatus || c.payment_status || 'Current';
    const entry = map.get(status) || { count: 0, mrr: 0 };
    entry.count += 1;
    entry.mrr += getSafeMrr(c);
    map.set(status, entry);
  });

  const total = customers.length;
  return Array.from(map.entries()).map(([status, data]) => ({
    status,
    count: data.count,
    mrr: Math.round(data.mrr),
    percent: Math.round((data.count / total) * 100)
  })).sort((a, b) => b.count - a.count);
}

/**
 * Customers with contracts up for renewal within specified days (default 30 days).
 */
export function getUpcomingRenewals(customers: Customer[], days: number = 30): Customer[] {
  if (!Array.isArray(customers)) return [];
  return customers.filter(c => {
    const renewalDays = c.renewalDaysLeft ?? (c as any).contractRenewalDays;
    if (renewalDays !== undefined && renewalDays >= 0 && renewalDays <= days) return true;
    if (c.renewal_date) {
      const diff = Math.ceil((new Date(c.renewal_date).getTime() - Date.now()) / 86400000);
      return diff >= 0 && diff <= days;
    }
    return false;
  }).sort((a, b) => {
    const dayA = a.renewalDaysLeft ?? (a as any).contractRenewalDays ?? 999;
    const dayB = b.renewalDaysLeft ?? (b as any).contractRenewalDays ?? 999;
    return dayA - dayB;
  });
}

/**
 * Live Retention ROI Insights calculator.
 * Strictly driven by canonical customer dataset:
 *
 * Estimated recovered MRR =
 * (high-risk MRR * high-risk save rate) +
 * (medium-risk MRR * medium-risk save rate)
 *
 * Net monthly value = Estimated recovered MRR - monthly NoChurn cost
 *
 * ROI percentage = ((Estimated recovered MRR - monthly NoChurn cost) / monthly NoChurn cost) * 100
 */
export function getROIInsights(
  customers: Customer[],
  customConfig?: Partial<ROIConfig>
): ROIInsights {
  const config: ROIConfig = {
    highRiskSaveRate: customConfig?.highRiskSaveRate ?? 0.20,
    mediumRiskSaveRate: customConfig?.mediumRiskSaveRate ?? 0.10,
    monthlyCost: customConfig?.monthlyCost ?? 4999,
    period: customConfig?.period ?? 'monthly'
  };

  const highMrr = getHighRiskMRR(customers);
  const medMrr = getMediumRiskMRR(customers);

  const estimatedRecoveredMonthly = Math.round(
    (highMrr * config.highRiskSaveRate) + (medMrr * config.mediumRiskSaveRate)
  );

  const monthlyCost = Math.max(0, config.monthlyCost);
  const isAnnual = config.period === 'annual';

  const effectiveRecovered = isAnnual ? estimatedRecoveredMonthly * 12 : estimatedRecoveredMonthly;
  const effectiveCost = isAnnual ? monthlyCost * 12 : monthlyCost;

  const netGain = effectiveRecovered - effectiveCost;

  let roiPercentage = 0;
  let multiplier = 0;

  if (effectiveCost > 0) {
    roiPercentage = Math.round(((effectiveRecovered - effectiveCost) / effectiveCost) * 100);
    multiplier = Math.round((effectiveRecovered / effectiveCost) * 10) / 10;
  } else if (effectiveRecovered > 0) {
    roiPercentage = 100;
    multiplier = 99;
  }

  const annualSaved = estimatedRecoveredMonthly * 12;
  const annualNetGain = annualSaved - (monthlyCost * 12);

  return {
    highRiskMrr: highMrr,
    mediumRiskMrr: medMrr,
    estimatedRecoveredMrr: estimatedRecoveredMonthly,
    productCost: monthlyCost,
    netMonthlyValue: netGain,
    roiPercentage,
    multiplier,
    annualSaved,
    annualNetGain,
    formulaDescription: `(High Risk $${highMrr.toLocaleString('en-US')} × ${(config.highRiskSaveRate * 100)}%) + (Medium Risk $${medMrr.toLocaleString('en-US')} × ${(config.mediumRiskSaveRate * 100)}%) − Cost $${monthlyCost.toLocaleString('en-US')}`
  };
}
