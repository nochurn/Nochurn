import { Customer, Top5CustomerPriority, AiRetentionActionType, RetentionMessage } from '../types';

/**
 * Calculates the exact Top 5 Priority Score based on:
 * - Risk Score (50%)
 * - Revenue Importance (25%)
 * - Engagement Decline (15%)
 * - Support Friction (10%)
 * Normalized to 0–100.
 */
export function calculatePriorityComponents(customer: Customer, maxMrr: number = 3000): {
  priorityScore: number;
  riskPart: number;
  revenuePart: number;
  engagementPart: number;
  supportPart: number;
  riskScore: number;
} {
  // 1. Risk Score (0-100)
  const rawRisk = Number(customer.risk_score ?? customer.riskScore ?? 50);
  const riskScore = Math.min(100, Math.max(0, isNaN(rawRisk) ? 50 : rawRisk));

  // 2. Revenue Importance (0-100)
  const mrr = Number(customer.mrr ?? 0);
  const effectiveMax = Math.max(1000, maxMrr);
  const revenueScore = Math.min(100, Math.max(0, Math.round((mrr / effectiveMax) * 100)));

  // 3. Engagement Decline (0-100)
  // Evaluated from lastLoginDays or usageTrendPercentage
  const lastLogin = Number(customer.lastLoginDays ?? customer.last_login_days_ago ?? 0);
  let engagementDeclineScore = 30;
  if (lastLogin >= 30) engagementDeclineScore = 100;
  else if (lastLogin >= 21) engagementDeclineScore = 85;
  else if (lastLogin >= 14) engagementDeclineScore = 70;
  else if (lastLogin >= 7) engagementDeclineScore = 50;
  else engagementDeclineScore = 20;

  if (customer.usageTrendPercentage !== undefined && customer.usageTrendPercentage < 0) {
    engagementDeclineScore = Math.min(100, Math.max(engagementDeclineScore, Math.abs(customer.usageTrendPercentage) * 1.2));
  }

  // 4. Support Friction (0-100)
  const openTickets = Number(customer.openTicketsCount ?? customer.open_support_tickets ?? 0);
  const hasFailedPayment = ['Failed', 'Retried', 'Disputed'].includes(customer.paymentStatus || '');
  let supportFrictionScore = 10;
  if (openTickets >= 3 || hasFailedPayment) supportFrictionScore = 100;
  else if (openTickets === 2) supportFrictionScore = 75;
  else if (openTickets === 1) supportFrictionScore = 50;

  // Formula: Risk 50% + Revenue 25% + Engagement 15% + Support 10%
  const weighted = (riskScore * 0.50) + (revenueScore * 0.25) + (engagementDeclineScore * 0.15) + (supportFrictionScore * 0.10);
  const priorityScore = Math.min(100, Math.max(1, Math.round(weighted)));

  return {
    priorityScore,
    riskPart: Math.round(riskScore * 0.50),
    revenuePart: Math.round(revenueScore * 0.25),
    engagementPart: Math.round(engagementDeclineScore * 0.15),
    supportPart: Math.round(supportFrictionScore * 0.10),
    riskScore
  };
}

/**
 * Plain English explanation of why a customer is at risk.
 * Follows the requirement:
 * "Login activity dropped significantly in the last 14 days and the customer has not purchased recently. They also have multiple support tickets."
 * Clearly separates confirmed behavior signals.
 */
export function generatePlainEnglishRiskExplanation(customer: Customer): string {
  const lastLogin = Number(customer.lastLoginDays ?? customer.last_login_days_ago ?? 0);
  const openTickets = Number(customer.openTicketsCount ?? customer.open_support_tickets ?? 0);
  const usageDrop = customer.usageTrendPercentage !== undefined && customer.usageTrendPercentage < -10;
  const dropAmount = Math.abs(customer.usageTrendPercentage || 0);
  const hasFailedPayment = ['Failed', 'Retried', 'Disputed'].includes(customer.paymentStatus || '');

  const parts: string[] = [];

  if (lastLogin >= 14) {
    parts.push(`Login activity dropped significantly in the last ${lastLogin} days`);
  } else if (lastLogin >= 7) {
    parts.push(`The customer has not logged in for ${lastLogin} days`);
  } else if (usageDrop) {
    parts.push(`Product usage dropped by ${dropAmount}% over the past 30 days`);
  }

  if (openTickets >= 2) {
    parts.push(`they have ${openTickets} open support tickets`);
  } else if (openTickets === 1) {
    parts.push(`they have an open support ticket`);
  }

  if (hasFailedPayment) {
    parts.push(`they experienced a failed payment`);
  }

  if (customer.risk_reason && parts.length === 0) {
    return customer.risk_reason;
  }

  if (parts.length === 0) {
    return `Login and engagement activity have decreased below normal baseline levels.`;
  }

  let result = parts.join(' and ') + '.';
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Generates an objective, non-alarmist "Why this customer?" explanation.
 * Strictly uses actual customer behavior signals and avoids saying "will definitely churn".
 */
export function generateWhyAtRisk(customer: Customer): string {
  const lastLogin = Number(customer.lastLoginDays ?? customer.last_login_days_ago ?? 0);
  const openTickets = Number(customer.openTicketsCount ?? customer.open_support_tickets ?? 0);
  const mrr = Number(customer.mrr ?? 0);
  const mrrFormatted = `$${mrr.toLocaleString()}`;
  const hasFailedPayment = ['Failed', 'Retried', 'Disputed'].includes(customer.paymentStatus || '');

  const reasons: string[] = [];

  if (lastLogin >= 14) {
    reasons.push(`has not logged in for ${lastLogin} days`);
  } else if (lastLogin >= 7) {
    reasons.push(`last login was ${lastLogin} days ago`);
  }

  if (customer.usageTrendPercentage !== undefined && customer.usageTrendPercentage < -15) {
    reasons.push(`active usage dropped by ${Math.abs(customer.usageTrendPercentage)}% over the past 30 days`);
  }

  if (hasFailedPayment) {
    reasons.push(`has a pending or retried billing transaction`);
  } else if (openTickets > 0) {
    reasons.push(`has ${openTickets} open support ticket${openTickets > 1 ? 's' : ''}`);
  }

  if (customer.risk_reason && !reasons.some(r => customer.risk_reason?.toLowerCase().includes(r.toLowerCase()))) {
    reasons.push(customer.risk_reason.toLowerCase());
  }

  const signalsText = reasons.length > 0 ? reasons.slice(0, 2).join(', and ') : 'telemetry reflects reduced product interactions';

  return `High churn risk based on current behavior signals. Priority account because the customer ${signalsText}, with ${mrrFormatted}/mo revenue at risk.`;
}

/**
 * Chooses one primary recommended action from the 7 approved actions:
 * 1. Personal Check-in
 * 2. Support Recovery
 * 3. Re-engagement
 * 4. Product Education
 * 5. VIP Outreach
 * 6. Feedback Request
 * 7. Renewal Reminder
 */
export function selectRecommendedAction(customer: Customer): AiRetentionActionType {
  const lastLogin = Number(customer.lastLoginDays ?? customer.last_login_days_ago ?? 0);
  const openTickets = Number(customer.openTicketsCount ?? customer.open_support_tickets ?? 0);
  const mrr = Number(customer.mrr ?? 0);
  const renewalDays = customer.renewalDaysLeft ?? 999;
  const hasFailedPayment = ['Failed', 'Retried', 'Disputed'].includes(customer.paymentStatus || '');

  // 1. Support Recovery (if tickets open or billing trouble)
  if (openTickets > 0 || hasFailedPayment) {
    return 'Support Recovery';
  }

  // 2. Renewal Reminder (if upcoming contract renewal)
  if (renewalDays <= 30) {
    return 'Renewal Reminder';
  }

  // 3. VIP Outreach (if enterprise or high revenue)
  if (mrr >= 1500 || customer.plan === 'Enterprise') {
    return 'VIP Outreach';
  }

  // 4. Re-engagement (if inactive > 21 days)
  if (lastLogin >= 21) {
    return 'Re-engagement';
  }

  // 5. Product Education (if usage dropped but logged in recently)
  if (customer.usageTrendPercentage !== undefined && customer.usageTrendPercentage < -30 && lastLogin < 14) {
    return 'Product Education';
  }

  // 6. Feedback Request (if medium risk or moderate usage)
  if ((customer.risk_score ?? customer.riskScore ?? 50) < 65) {
    return 'Feedback Request';
  }

  // Default: Personal Check-in
  return 'Personal Check-in';
}

/**
 * Generates personalized, human-sounding messages for WhatsApp & Email.
 * NEVER mentions "churn prediction", "risk score", "AI", or "internal analytics".
 */
export function generatePersonalizedDrafts(
  customer: Customer,
  action: AiRetentionActionType,
  tone: 'Empathetic' | 'Professional' | 'Direct' = 'Empathetic',
  senderName: string = 'Alex'
): {
  whatsappDraft: string;
  emailSubject: string;
  emailDraft: string;
} {
  const firstName = (customer.name || customer.company_name || 'there').split(' ')[0] || 'there';
  const companyName = customer.company_name || customer.name || 'your team';

  let whatsappDraft = '';
  let emailSubject = '';
  let emailDraft = '';

  switch (action) {
    case 'Support Recovery':
      whatsappDraft = `Hi ${firstName}, saw you recently had a support inquiry with our team. Wanted to make sure everything was taken care of for ${companyName}. How are things working for you right now?`;
      emailSubject = `Following up on your recent support request`;
      emailDraft = `Hi ${firstName},\n\nI noticed your team recently opened a support inquiry with us and wanted to personally follow up to make sure everything got resolved smoothly.\n\nWe want to ensure your setup runs without any friction. Are you still experiencing any hurdles, or is everything back on track?\n\nHappy to jump on a quick call if needed.\n\nBest regards,\n${senderName}`;
      break;

    case 'VIP Outreach':
      whatsappDraft = `Hi ${firstName}, checking in on how ${companyName} is doing with the platform. As one of our key accounts, I'd love to make sure you have everything you need for the upcoming quarter.`;
      emailSubject = `Executive check-in for ${companyName}`;
      emailDraft = `Hi ${firstName},\n\nI hope you're having a productive week. As a valued customer, I wanted to reach out directly to see how the platform is supporting your goals this quarter.\n\nOur team is working on several upcoming improvements, and I'd welcome your thoughts on how we can better support ${companyName}.\n\nDo you have 10 minutes for a brief executive sync this week?\n\nWarm regards,\n${senderName}`;
      break;

    case 'Re-engagement':
      whatsappDraft = `Hi ${firstName}, hope you're doing well! Noticed things have been a bit quiet on your account lately. Did you run into any blockers or is there anything we can help simplify?`;
      emailSubject = `Checking in on your account`;
      emailDraft = `Hi ${firstName},\n\nI hope you're doing well. It looks like things have been a little quiet on your workspace lately, and I wanted to check in to see how everything is going.\n\nIf your priorities have shifted or if there's any workflow we can help streamline, let me know. We're here to help whenever you're ready.\n\nBest,\n${senderName}`;
      break;

    case 'Product Education':
      whatsappDraft = `Hi ${firstName}, quick question—were you able to explore our latest workflow updates? Wanted to share a 2-minute walkthrough that might save your team time this week.`;
      emailSubject = `Quick tip to help your team get more from the platform`;
      emailDraft = `Hi ${firstName},\n\nI was looking over your workspace setup and thought of a few quick workflow tips that could save your team time.\n\nMany teams in your industry found that configuring automated summaries cut their reporting time in half. Would you like a short 3-minute video overview or a quick walkthrough?\n\nLet me know and I'll send it right over.\n\nBest,\n${senderName}`;
      break;

    case 'Renewal Reminder':
      whatsappDraft = `Hi ${firstName}, your subscription renewal for ${companyName} is coming up soon. Wanted to touch base early to review your usage and make sure everything is in place for next term.`;
      emailSubject = `Upcoming renewal check-in for ${companyName}`;
      emailDraft = `Hi ${firstName},\n\nI'm reaching out ahead of your upcoming account renewal to see how the platform has been performing for your team over the past year.\n\nWe want to ensure your plan still aligns with your goals and that your team is getting maximum value. Do you have 10 minutes this week to review your setup?\n\nLooking forward to speaking.\n\nBest regards,\n${senderName}`;
      break;

    case 'Feedback Request':
      whatsappDraft = `Hi ${firstName}, how has your experience been with the product lately? We're refining our roadmap and your honest feedback would mean a lot to us.`;
      emailSubject = `Quick question about your experience`;
      emailDraft = `Hi ${firstName},\n\nWe're currently reviewing our roadmap for next quarter and focusing on improvements that matter most to our active users.\n\nHow has your experience been recently? If there is one thing you would love to see improved or simplified, what would it be?\n\nYour honest perspective is invaluable.\n\nThanks,\n${senderName}`;
      break;

    case 'Personal Check-in':
    default:
      if (tone === 'Direct') {
        whatsappDraft = `Hi ${firstName}, wanted to check in directly on ${companyName}. Any questions or issues our team can resolve for you today?`;
        emailSubject = `Quick check-in regarding ${companyName}`;
        emailDraft = `Hi ${firstName},\n\nJust checking in to make sure your account is running smoothly. Please let me know if there's anything you need assistance with.\n\nBest,\n${senderName}`;
      } else if (tone === 'Professional') {
        whatsappDraft = `Hello ${firstName}, reaching out from the customer team to see if you have any questions or feedback regarding your workspace.`;
        emailSubject = `Customer check-in for ${companyName}`;
        emailDraft = `Hi ${firstName},\n\nI wanted to reach out and check in on your experience with our platform. Our goal is to ensure you have all the resources necessary to achieve your objectives.\n\nPlease feel free to reply with any questions or topics you would like to discuss.\n\nSincerely,\n${senderName}`;
      } else {
        // Empathetic
        whatsappDraft = `Hi ${firstName}, hope you're having a good week! Wanted to check in personally and see how things are going with your workspace. Any feedback or help you need?`;
        emailSubject = `Quick personal check-in`;
        emailDraft = `Hi ${firstName},\n\nI hope your week is off to a great start. I wanted to reach out personally to see how things are going with your account.\n\nWe really appreciate having you with us, and I want to make sure you have everything you need to be successful. If you have any feedback or if there is anything we can do better, just reply directly to this email.\n\nWarmly,\n${senderName}`;
      }
      break;
  }

  return { whatsappDraft, emailSubject, emailDraft };
}

/**
 * Calculates a deterministic, behavior-based risk score for a customer
 * based on verified telemetry inputs without random numbers.
 */
export function calculateDeterministicRiskScore(customer: Customer): number {
  const existingScore = Number(customer.risk_score ?? customer.riskScore);
  if (!isNaN(existingScore) && existingScore > 0) {
    return Math.min(99, Math.max(5, Math.round(existingScore)));
  }

  let score = 20; // baseline
  const openTickets = Number(customer.openTicketsCount ?? customer.open_support_tickets ?? 0);
  const lastLogin = Number(customer.lastLoginDays ?? customer.last_login_days_ago ?? 0);
  const paymentStatus = String(customer.paymentStatus || '').toLowerCase();

  if (['failed', 'retried', 'disputed'].includes(paymentStatus)) {
    score += 35;
  }
  if (openTickets >= 3) score += 25;
  else if (openTickets === 2) score += 15;
  else if (openTickets === 1) score += 10;

  if (lastLogin >= 30) score += 30;
  else if (lastLogin >= 14) score += 20;
  else if (lastLogin >= 7) score += 10;

  if (customer.usageTrendPercentage !== undefined && customer.usageTrendPercentage < -30) {
    score += 20;
  } else if (customer.usageTrendPercentage !== undefined && customer.usageTrendPercentage < -15) {
    score += 10;
  }

  if (customer.emailOpenRate !== undefined && customer.emailOpenRate < 15) {
    score += 10;
  }

  return Math.min(99, Math.max(8, score));
}

/**
 * Scans all customers, calculates priority scores, and selects the Top 5 customers.
 */
export function identifyTop5Priorities(
  customers: Customer[],
  tone: 'Empathetic' | 'Professional' | 'Direct' = 'Empathetic',
  existingMessages: RetentionMessage[] = []
): Top5CustomerPriority[] {
  if (!Array.isArray(customers) || customers.length === 0) return [];

  // Filter out customers that are already saved or churned, unless needed
  const activePool = customers.filter(c => c.status !== 'saved' && c.status !== 'churned');
  const pool = activePool.length > 0 ? activePool : customers;

  const maxMrr = Math.max(...customers.map(c => Number(c.mrr || 0)), 2000);

  // Score each customer
  const scored = pool.map(customer => {
    const components = calculatePriorityComponents(customer, maxMrr);
    const whyAtRisk = generateWhyAtRisk(customer);
    const recommendedAction = selectRecommendedAction(customer);
    const drafts = generatePersonalizedDrafts(customer, recommendedAction, tone);

    // Check existing message status for this customer
    const existingWa = existingMessages.find(m => m.customerId === customer.id && m.channel === 'whatsapp');
    const existingEm = existingMessages.find(m => m.customerId === customer.id && m.channel === 'email');

    const whatsappDraftStatus = (existingWa?.status as any) || 'ready';
    const emailDraftStatus = (existingEm?.status as any) || 'ready';

    let messageStatus: 'ready' | 'approved' | 'copied' | 'sent' = 'ready';
    if (whatsappDraftStatus === 'sent' && emailDraftStatus === 'sent') {
      messageStatus = 'sent';
    } else if (whatsappDraftStatus === 'copied' || emailDraftStatus === 'copied') {
      messageStatus = 'copied';
    } else if (whatsappDraftStatus === 'approved' || emailDraftStatus === 'approved') {
      messageStatus = 'approved';
    }

    const riskScore = components.riskScore;
    const riskLevel = riskScore >= 80 ? 'Critical' : riskScore >= 60 ? 'High' : riskScore >= 30 ? 'Medium' : 'Low';

    return {
      customer,
      priorityScore: components.priorityScore,
      riskScore,
      riskLevel,
      revenueAtRisk: Number(customer.mrr ?? 0),
      whyAtRisk,
      recommendedAction,
      whatsappDraft: drafts.whatsappDraft,
      whatsappDraftStatus,
      emailSubject: drafts.emailSubject,
      emailDraft: drafts.emailDraft,
      emailDraftStatus,
      messageStatus
    };
  });

  // Sort descending by priority score, then by revenue at risk
  scored.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return b.revenueAtRisk - a.revenueAtRisk;
  });

  return scored.slice(0, 5);
}
