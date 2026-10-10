import { Customer, CustomerRetentionAction, HealthPillars, CohortMonthRecord, ChurnReasonStats, ChurnReasonType } from '../types';

/**
 * Calculates MRR Weight for Action Priority
 * MRR Weight = min(2.5, 0.5 + (MRR / 1000))
 */
export function calculateMrrWeight(mrr: number): number {
  return Math.min(2.5, 0.5 + (mrr / 1000));
}

/**
 * Calculates Urgency Multiplier
 * 1.5x: Renewal < 30 days OR payment Failed/Disputed
 * 1.3x: Inactive > 21 days with >= 2 open/urgent tickets
 * 1.1x: Usage trend < -40%
 * 1.0x: Standard baseline
 */
export function calculateUrgencyMultiplier(customer: Partial<Customer>): { multiplier: number; reason: string } {
  if (customer.renewalDaysLeft && customer.renewalDaysLeft <= 30) {
    return { multiplier: 1.5, reason: `Renewal in ${customer.renewalDaysLeft} days` };
  }
  if (customer.paymentStatus === 'Failed' || customer.paymentStatus === 'Disputed') {
    return { multiplier: 1.5, reason: `Payment ${customer.paymentStatus} (Invoice overdue)` };
  }
  if ((customer.lastLoginDays || 0) > 21 && (customer.openTicketsCount || 0) >= 2) {
    return { multiplier: 1.3, reason: `Inactive ${customer.lastLoginDays}d with ${customer.openTicketsCount} open tickets` };
  }
  if ((customer.usageTrendPercentage || 0) < -40) {
    return { multiplier: 1.1, reason: `Usage contracted ${customer.usageTrendPercentage}% MoM` };
  }
  return { multiplier: 1.0, reason: 'Standard baseline trajectory' };
}

/**
 * Calculates Normalized Priority Score (1 - 100)
 * Priority = Risk Score * MRR Weight * Urgency Weight
 */
export function calculatePriorityScore(customer: Customer): number {
  const mrrW = calculateMrrWeight(customer.mrr);
  const urgency = calculateUrgencyMultiplier(customer).multiplier;
  const raw = customer.riskScore * mrrW * urgency;
  // Normalize raw (which can reach ~375) down to a balanced 1-100 score
  const normalized = Math.min(100, Math.round((raw / 375) * 100));
  return Math.max(1, normalized);
}

/**
 * 5-Pillar Health Score Calculator
 * Churn Risk Score = (Product * 0.35) + (Billing * 0.25) + (Support * 0.15) + (Relationship * 0.15) + (Engagement * 0.10)
 */
export function calculateHealthPillars(customer: Customer): HealthPillars {
  if (customer.healthPillars) return customer.healthPillars;

  // 1. Product Adoption (35%)
  const usageDrop = Math.max(0, -customer.usageTrendPercentage);
  const loginInactivity = Math.min(100, (customer.lastLoginDays / 30) * 100);
  const seatUtil = customer.activeSeats && customer.totalSeats
    ? (customer.activeSeats / customer.totalSeats) * 100
    : Math.max(10, 100 - usageDrop * 0.8);
  const productScore = Math.min(100, Math.round((loginInactivity * 0.45) + (usageDrop * 0.35) + ((100 - seatUtil) * 0.2)));

  // 2. Billing Health (25%)
  let billingScore = 15;
  if (customer.paymentStatus === 'Failed' || customer.paymentStatus === 'Disputed') {
    billingScore = 95;
  } else if (customer.paymentStatus === 'Retried') {
    billingScore = 65;
  } else if (customer.renewalDaysLeft && customer.renewalDaysLeft <= 30 && productScore > 60) {
    billingScore = 80;
  }

  // 3. Support Health (15%)
  const ticketPenalty = Math.min(60, (customer.openTicketsCount || 0) * 20);
  const supportScore = Math.min(100, Math.round(ticketPenalty + (customer.lastLoginDays > 14 ? 25 : 10)));

  // 4. Relationship Health (15%)
  const championDays = customer.lastLoginDays || 10;
  const npsDeficit = customer.npsScore ? Math.max(0, (10 - customer.npsScore) * 10) : 50;
  const relationshipScore = Math.min(100, Math.round((championDays > 25 ? 80 : championDays * 2.5) * 0.6 + npsDeficit * 0.4));

  // 5. Engagement Health (10%)
  const openRate = customer.emailOpenRate || 15;
  const engagementScore = Math.min(100, Math.max(10, Math.round(100 - openRate * 2.5)));

  // Root Cause Diagnosis
  let rootCauseDiagnosis = 'Account activity and metrics are steady.';
  if (billingScore >= 80) {
    rootCauseDiagnosis = 'Recent payment charge failed or requires dunning intervention before automatic suspension.';
  } else if (productScore >= 75) {
    rootCauseDiagnosis = 'Severe drop in active user sessions; team stopped utilizing core reporting and workflows.';
  } else if (supportScore >= 70) {
    rootCauseDiagnosis = 'Multiple unresolved integration or critical defect tickets blocking customer value realization.';
  } else if (relationshipScore >= 70) {
    rootCauseDiagnosis = 'Primary executive champion has disengaged with no meeting attendance recorded in 30+ days.';
  } else if (customer.riskScore >= 60) {
    rootCauseDiagnosis = 'Combined telemetry signals indicate early silent disengagement ahead of upcoming contract renewal.';
  }

  return {
    productScore,
    billingScore,
    supportScore,
    relationshipScore,
    engagementScore,
    rootCauseDiagnosis,
    seatUtilizationRate: Math.round(seatUtil),
    activeSeats: customer.activeSeats || Math.max(1, Math.round((seatUtil / 100) * 10)),
    totalSeats: customer.totalSeats || 10,
    renewalDaysLeft: customer.renewalDaysLeft || 45,
    championLastActiveDays: customer.lastLoginDays
  };
}

/**
 * Generates Ranked Action Queue Items
 */
export function generateActionQueue(customers: Customer[]): CustomerRetentionAction[] {
  const activeList = customers.filter(c => c.status !== 'saved');

  const scored = activeList.map(c => {
    const priorityScore = calculatePriorityScore(c);
    const whyAtRisk = c.topFactors?.[0]?.factor || 'Low engagement detected';
    const recAction = c.recommendedAction || 'Schedule executive check-in';
    const draft = c.retentionRecommendation ? {
      subject: c.retentionRecommendation.emailScript.split('\n')[0].replace(/^Subject:\s*/i, '') || `${c.name} & NoChurn: Action Required`,
      body: c.retentionRecommendation.emailScript,
      channel: c.retentionRecommendation.suggestedChannel || 'Email',
      effortMinutes: c.retentionRecommendation.effortMinutes || 20
    } : {
      subject: `Urgent: Ensuring ${c.name} receives expected value from NoChurn`,
      body: `Hi ${c.adminName || 'Team'},\n\nI wanted to reach out personally from our leadership team. I noticed your recent telemetry indicated some roadblocks with your account.\n\nCould we hop on a brief 10-minute sync this week so we can resolve any friction directly?\n\nBest regards,\nCustomer Success Team`,
      channel: 'Email',
      effortMinutes: 15
    };

    return {
      id: `act-${c.id}`,
      customerId: c.id,
      customerName: c.name,
      companyCity: c.companyCity || 'Bengaluru',
      adminName: c.adminName || c.email.split('@')[0],
      ownerEmail: c.owner || 'alex@nochurn.com',
      priorityRank: 0, // Assigned after sort
      priorityScore,
      mrr: c.mrr,
      riskScore: c.riskScore,
      whyAtRisk,
      recommendedAction: recAction,
      actionEmailDraft: draft,
      status: (c.status === 'churned' ? 'churned' : 'pending') as any,
      assignedTo: c.owner || 'Alex Vance (Founder)',
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
    };
  });

  // Sort descending by priority score
  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  return scored.map((item, index) => ({
    ...item,
    priorityRank: index + 1
  }));
}

/**
 * Historical Closed-Loop Cohort Data
 */
export const INITIAL_COHORTS: CohortMonthRecord[] = [
  {
    month: 'July 2026',
    highRiskCount: 16,
    actionedCount: 14,
    rescuedCount: 10,
    churnedCount: 4,
    savedMrr: 7200,
    winRate: 71.4
  },
  {
    month: 'August 2026',
    highRiskCount: 18,
    actionedCount: 15,
    rescuedCount: 11,
    churnedCount: 4,
    savedMrr: 8450,
    winRate: 73.3
  },
  {
    month: 'September 2026',
    highRiskCount: 22,
    actionedCount: 19,
    rescuedCount: 14,
    churnedCount: 5,
    savedMrr: 11200,
    winRate: 73.6
  }
];

/**
 * Historical Churn Reason Attribution Data
 */
export const INITIAL_CHURN_REASONS: ChurnReasonStats[] = [
  {
    reason: 'missing_feature',
    label: 'Missing Feature / Product Gap',
    percentage: 34,
    count: 17,
    mrrLost: 12400,
    preventiveFix: 'Ship requested export & webhook retry capabilities.'
  },
  {
    reason: 'poor_onboarding',
    label: 'Poor Onboarding / Seat Adoption',
    percentage: 28,
    count: 14,
    mrrLost: 9800,
    preventiveFix: 'Trigger 1-on-1 team onboarding if < 40% seats activated in week 1.'
  },
  {
    reason: 'payment_failure',
    label: 'Payment Failure / Involuntary Churn',
    percentage: 18,
    count: 9,
    mrrLost: 6500,
    preventiveFix: 'Enable automated Razorpay Smart Retries & card update SMS.'
  },
  {
    reason: 'pricing',
    label: 'Pricing / Budgetary Reductions',
    percentage: 12,
    count: 6,
    mrrLost: 4100,
    preventiveFix: 'Offer annual downgrade with 20% concession rather than cancel.'
  },
  {
    reason: 'competitor',
    label: 'Switched to Competitor',
    percentage: 8,
    count: 4,
    mrrLost: 3200,
    preventiveFix: 'Maintain competitive battlecards highlighting Gemini real-time actions.'
  }
];
