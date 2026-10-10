import { Customer, RiskCategory, RiskFactor, ChurnProbability, RetentionRecommendation } from '../types';

export function getCategory(score: number): RiskCategory {
  if (score >= 86) return 'Critical';
  if (score >= 61) return 'High';
  if (score >= 31) return 'Medium';
  return 'Low';
}

export function createDefaultFactors(score: number, lastLoginDays: number, paymentStatus: string, usageTrend: number): RiskFactor[] {
  const factors: RiskFactor[] = [];
  if (lastLoginDays > 20) {
    factors.push({
      factor: `Inactivity Alert: ${lastLoginDays} days without login`,
      points: 35,
      description: `Team engagement has halted. Key champion has not signed in for ${lastLoginDays} days.`,
      category: 'usage'
    });
  } else if (usageTrend < -30) {
    factors.push({
      factor: `Severe usage drop (${usageTrend}%) in last 30 days`,
      points: 25,
      description: 'Daily active sessions and API volume contracted sharply month-over-month.',
      category: 'usage'
    });
  }

  if (paymentStatus === 'Failed' || paymentStatus === 'Disputed') {
    factors.push({
      factor: `Billing issue: Payment marked as ${paymentStatus}`,
      points: 30,
      description: 'Primary Razorpay auto-debit / card failed multiple automatic rebill attempts.',
      category: 'payment'
    });
  } else if (paymentStatus === 'Retried') {
    factors.push({
      factor: 'Razorpay dunning cycle: payment retried 2x',
      points: 15,
      description: 'Customer card expired or hit limits on recent billing cycle.',
      category: 'payment'
    });
  }

  if (score > 60) {
    factors.push({
      factor: 'Low email engagement (<8% open rate)',
      points: 15,
      description: 'Customer ignoring product release announcements and survey check-ins.',
      category: 'engagement'
    });
  } else {
    factors.push({
      factor: 'Stable support health',
      points: 5,
      description: 'No severe open escalations or critical blockers.',
      category: 'support'
    });
  }

  return factors.slice(0, 3);
}

export const SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: 'cust-in-001',
    name: 'QuickPay Technologies',
    email: 'rohan.verma@quickpay.in',
    companyDomain: 'quickpay.in',
    adminName: 'Rohan Verma',
    companyCity: 'Bengaluru',
    owner: 'Alex Vance (Founder)',
    plan: 'Growth',
    mrr: 850,
    ltv: 10200,
    customerSince: '2024-02-18',
    lastLoginDays: 28,
    openTicketsCount: 2,
    paymentStatus: 'Current',
    usageTrendPercentage: -54,
    emailOpenRate: 6,
    riskScore: 91,
    riskCategory: 'Critical',
    renewalDaysLeft: 18,
    activeSeats: 3,
    totalSeats: 10,
    isDemo: true,
    healthPillars: {
      productScore: 88,
      billingScore: 78,
      supportScore: 92,
      relationshipScore: 85,
      engagementScore: 75,
      rootCauseDiagnosis: 'Blocked by 2 unresolved webhook timeout bugs; team stopped logging in ahead of contract renewal in 18 days.',
      seatUtilizationRate: 30,
      activeSeats: 3,
      totalSeats: 10,
      renewalDaysLeft: 18,
      unresolvedBugDays: 14,
      championLastActiveDays: 28
    },
    topFactors: [
      { factor: 'Last login 28 days ago (3 of 10 seats active)', points: 38, description: 'Champion Rohan and core ops engineers have stopped platform sessions.', category: 'usage' },
      { factor: '2 unresolved API webhook bugs pending > 14 days', points: 32, description: 'Ticket #5102 on payment webhook drops is blocking live merchant sync.', category: 'support' },
      { factor: 'Annual contract renewal coming in 18 days', points: 21, description: 'High probability of non-renewal unless technical blockers are resolved.', category: 'payment' }
    ],
    churnProbability: { day30: 92, day60: 96, day90: 98 },
    recommendedAction: 'Executive Check-in: Offer direct engineering hotfix + 15m CTO sync',
    retentionRecommendation: {
      action: 'Executive Check-in: Offer direct engineering hotfix + 15m CTO sync',
      emailScript: `Subject: QuickPay + NoChurn: Direct engineering check-in for Rohan\n\nHi Rohan,\n\nI was reviewing your account telemetry this morning and noticed ticket #5102 regarding your webhook timeout has been pending longer than it ever should have. I know reliable event delivery is critical for QuickPay's payment workflows.\n\nI've escalated this directly to our Lead Infrastructure Engineer today to ship a dedicated hotfix. I'd also love to credit your current billing period while we make sure your integration is running at 100%.\n\nCould we hop on a quick 10-minute sync this afternoon or tomorrow morning so I can walk through the fix with you?\n\nBest regards,\nAlex Vance\nFounder & CEO, NoChurn`,
      recoveryProbability: 46,
      effortMinutes: 25,
      offerDiscount: '1 Month 100% Billing Credit + Direct CTO Escalation',
      suggestedChannel: 'Executive Call'
    },
    lastAnalyzedAt: '2026-09-15T18:30:00Z',
    isAiAnalyzed: true,
    supportTickets: [
      { id: 'TCK-5102', subject: 'Payment callback webhook timeout under high TPS', status: 'Open', priority: 'Urgent', createdAt: '2026-09-01', category: 'Bug' },
      { id: 'TCK-5044', subject: 'Requesting custom timestamp format in CSV exports', status: 'Open', priority: 'High', createdAt: '2026-08-25', category: 'Feature Request' }
    ],
    paymentHistory: [
      { id: 'INV-401', date: '2026-08-18', amount: 850, status: 'Succeeded', invoiceId: 'in_qp001' },
      { id: 'INV-322', date: '2026-07-18', amount: 850, status: 'Succeeded', invoiceId: 'in_qp002' }
    ],
    loginHistory: [
      { week: 'W1', activeUsers: 9, sessionsCount: 88, durationMinutes: 320 },
      { week: 'W2', activeUsers: 6, sessionsCount: 42, durationMinutes: 140 },
      { week: 'W3', activeUsers: 3, sessionsCount: 12, durationMinutes: 45 },
      { week: 'W4', activeUsers: 1, sessionsCount: 2, durationMinutes: 8 }
    ],
    riskTrend: [
      { month: 'Apr', score: 22 },
      { month: 'May', score: 35 },
      { month: 'Jun', score: 50 },
      { month: 'Jul', score: 68 },
      { month: 'Aug', score: 82 },
      { month: 'Sep', score: 91 }
    ],
    status: 'active'
  },
  {
    id: 'cust-in-002',
    name: 'CloudKite Pune',
    email: 'priya.nair@cloudkite.io',
    companyDomain: 'cloudkite.io',
    adminName: 'Priya Nair',
    companyCity: 'Pune',
    owner: 'Alex Vance (Founder)',
    plan: 'Enterprise',
    mrr: 2100,
    ltv: 25200,
    customerSince: '2023-11-05',
    lastLoginDays: 14,
    openTicketsCount: 1,
    paymentStatus: 'Retried',
    usageTrendPercentage: -68,
    emailOpenRate: 10,
    riskScore: 84,
    riskCategory: 'High',
    renewalDaysLeft: 42,
    activeSeats: 7,
    totalSeats: 22,
    isDemo: true,
    healthPillars: {
      productScore: 82,
      billingScore: 89,
      supportScore: 65,
      relationshipScore: 78,
      engagementScore: 60,
      rootCauseDiagnosis: 'Razorpay subscription payment failed 2x; active seats dropped from 22 to 7 due to corporate budget reorganization.',
      seatUtilizationRate: 31,
      activeSeats: 7,
      totalSeats: 22,
      renewalDaysLeft: 42,
      championLastActiveDays: 14
    },
    topFactors: [
      { factor: 'Razorpay invoice charge retried 2x (Card ending 9102)', points: 35, description: 'Second billing retry failed on Sept 12; customer at risk of suspension.', category: 'payment' },
      { factor: 'Active seat utilization collapsed from 22 to 7 seats', points: 30, description: 'Usage drop of 68% suggests downsizing or internal tool consolidation.', category: 'usage' },
      { factor: 'Open invoice for $2,100 pending clarification', points: 19, description: 'Customer finance team requested revised GST invoice before payment.', category: 'payment' }
    ],
    churnProbability: { day30: 78, day60: 89, day90: 94 },
    recommendedAction: 'Billing Resolution Call: Re-issue GST invoice & offer flexible quarterly payment plan',
    retentionRecommendation: {
      action: 'Billing Resolution Call: Re-issue GST invoice & offer flexible quarterly payment plan',
      emailScript: `Subject: CloudKite & NoChurn: Updated GST invoice & account review for Priya\n\nHi Priya,\n\nI noticed our billing system flagged a retry on your recent renewal invoice. We have re-issued the invoice with your updated GSTIN and registered Pune entity details attached.\n\nI also noticed your team's seat count adjusted over the last month. We want to ensure your plan scales smoothly with your current team size. I can immediately adjust your tier to align with your 10 most active seats and pause any automatic dunning retries.\n\nCould we connect for 10 minutes this Wednesday to finalize this?\n\nWarm regards,\nElena Rostova\nHead of Customer Success`,
      recoveryProbability: 52,
      effortMinutes: 30,
      offerDiscount: 'Quarterly Billing Flex + Adjusted Seat Baseline ($600/mo savings)',
      suggestedChannel: 'Executive Call'
    },
    lastAnalyzedAt: '2026-09-15T17:00:00Z',
    isAiAnalyzed: true,
    supportTickets: [
      { id: 'TCK-5088', subject: 'Need updated Tax Invoice with correct GSTIN number', status: 'Open', priority: 'High', createdAt: '2026-09-10', category: 'Billing' }
    ],
    paymentHistory: [
      { id: 'INV-402', date: '2026-09-12', amount: 2100, status: 'Retried', invoiceId: 'in_ck001' },
      { id: 'INV-319', date: '2026-08-12', amount: 2100, status: 'Succeeded', invoiceId: 'in_ck002' }
    ],
    loginHistory: [
      { week: 'W1', activeUsers: 22, sessionsCount: 190, durationMinutes: 620 },
      { week: 'W2', activeUsers: 15, sessionsCount: 110, durationMinutes: 380 },
      { week: 'W3', activeUsers: 9, sessionsCount: 45, durationMinutes: 150 },
      { week: 'W4', activeUsers: 7, sessionsCount: 28, durationMinutes: 90 }
    ],
    riskTrend: [
      { month: 'Apr', score: 18 },
      { month: 'May', score: 24 },
      { month: 'Jun', score: 38 },
      { month: 'Jul', score: 55 },
      { month: 'Aug', score: 72 },
      { month: 'Sep', score: 84 }
    ],
    status: 'active'
  },
  {
    id: 'cust-in-003',
    name: 'MetricPulse Systems',
    email: 'amitesh.sen@metricpulse.ai',
    companyDomain: 'metricpulse.ai',
    adminName: 'Amitesh Sen',
    companyCity: 'Gurugram',
    owner: 'Elena Rostova',
    plan: 'Growth',
    mrr: 650,
    ltv: 5200,
    customerSince: '2024-03-20',
    lastLoginDays: 16,
    openTicketsCount: 1,
    paymentStatus: 'Current',
    usageTrendPercentage: -48,
    emailOpenRate: 8,
    riskScore: 74,
    riskCategory: 'High',
    renewalDaysLeft: 60,
    activeSeats: 4,
    totalSeats: 12,
    isDemo: true,
    healthPillars: {
      productScore: 76,
      billingScore: 30,
      supportScore: 50,
      relationshipScore: 82,
      engagementScore: 70,
      rootCauseDiagnosis: 'Seat utilization down 48%; zero report exports run in 14 days following departure of their data analyst.',
      seatUtilizationRate: 33,
      activeSeats: 4,
      totalSeats: 12,
      renewalDaysLeft: 60,
      championLastActiveDays: 16
    },
    topFactors: [
      { factor: 'Seat utilization down 48% (4 of 12 seats active)', points: 32, description: 'Core analytics feature adoption stalled over the past two weeks.', category: 'usage' },
      { factor: 'Zero custom export reports run in 14 days', points: 24, description: 'Customer previously scheduled weekly automated digests; stopped completely.', category: 'usage' },
      { factor: 'Champion Amitesh Sen last logged in 16 days ago', points: 18, description: 'Lack of executive sponsor engagement.', category: 'engagement' }
    ],
    churnProbability: { day30: 55, day60: 72, day90: 84 },
    recommendedAction: 'CS Re-onboarding: Send customized interactive workflow video & offer team training session',
    retentionRecommendation: {
      action: 'CS Re-onboarding: Send customized interactive workflow video & offer team training session',
      emailScript: `Subject: MetricPulse + NoChurn: Personalized refresher for your analytics team\n\nHi Amitesh,\n\nI hope you're having a productive week in Gurugram! I noticed your team hasn't run their automated exports recently, and I wanted to make sure you weren't hitting any friction.\n\nWe recently introduced 1-click scheduled reports and direct webhook sync. I recorded a quick 3-minute Loom walkthrough specifically tailored to MetricPulse's setup: [Loom Link].\n\nI'd also be delighted to host a complimentary 20-minute re-onboarding session for your new team members this week. Would Thursday afternoon suit you?\n\nWarm regards,\nElena Rostova\nSenior Customer Success Manager`,
      recoveryProbability: 60,
      effortMinutes: 20,
      suggestedChannel: 'Email'
    },
    lastAnalyzedAt: '2026-09-15T15:30:00Z',
    isAiAnalyzed: true,
    supportTickets: [
      { id: 'TCK-4991', subject: 'Automated Slack alert integration silent', status: 'Open', priority: 'Medium', createdAt: '2026-09-04', category: 'Feature Request' }
    ],
    paymentHistory: [
      { id: 'INV-398', date: '2026-08-20', amount: 650, status: 'Succeeded', invoiceId: 'in_mp001' }
    ],
    loginHistory: [
      { week: 'W1', activeUsers: 12, sessionsCount: 94, durationMinutes: 280 },
      { week: 'W2', activeUsers: 8, sessionsCount: 52, durationMinutes: 160 },
      { week: 'W3', activeUsers: 5, sessionsCount: 26, durationMinutes: 80 },
      { week: 'W4', activeUsers: 4, sessionsCount: 14, durationMinutes: 42 }
    ],
    riskTrend: [
      { month: 'Apr', score: 15 },
      { month: 'May', score: 20 },
      { month: 'Jun', score: 32 },
      { month: 'Jul', score: 48 },
      { month: 'Aug', score: 62 },
      { month: 'Sep', score: 74 }
    ],
    status: 'active'
  },
  {
    id: 'cust-in-004',
    name: 'FinVenture Chennai',
    email: 'deepa.sundaram@finventure.co',
    companyDomain: 'finventure.co',
    adminName: 'Deepa Sundaram',
    companyCity: 'Chennai',
    owner: 'Elena Rostova',
    plan: 'Starter',
    mrr: 199,
    ltv: 1194,
    customerSince: '2024-04-12',
    lastLoginDays: 9,
    openTicketsCount: 2,
    paymentStatus: 'Current',
    usageTrendPercentage: -30,
    emailOpenRate: 15,
    riskScore: 68,
    riskCategory: 'High',
    renewalDaysLeft: 22,
    activeSeats: 3,
    totalSeats: 5,
    npsScore: 4,
    isDemo: true,
    healthPillars: {
      productScore: 58,
      billingScore: 45,
      supportScore: 78,
      relationshipScore: 84,
      engagementScore: 55,
      rootCauseDiagnosis: 'NPS rating given 4/10; expressed frustration regarding export latency and response times.',
      seatUtilizationRate: 60,
      activeSeats: 3,
      totalSeats: 5,
      renewalDaysLeft: 22,
      championLastActiveDays: 9
    },
    topFactors: [
      { factor: 'NPS feedback rating: 4/10 (Detractor)', points: 30, description: 'Customer cited export latency and requested higher rate limits.', category: 'engagement' },
      { factor: 'Renewal in 22 days on Starter tier', points: 22, description: 'Upcoming renewal date with low customer satisfaction sentiment.', category: 'payment' },
      { factor: '2 pending support questions regarding export speed', points: 16, description: 'Queries unanswered for > 48 hours.', category: 'support' }
    ],
    churnProbability: { day30: 48, day60: 65, day90: 75 },
    recommendedAction: 'Customer Care Call: Acknowledge feedback + grant speed booster + share v2.4 roadmap',
    retentionRecommendation: {
      action: 'Customer Care Call: Acknowledge feedback + grant speed booster + share v2.4 roadmap',
      emailScript: `Subject: FinVenture & NoChurn: A personal apology regarding export speed\n\nHi Deepa,\n\nI personally reviewed your recent NPS feedback regarding export latency. You are completely right—the export speeds you experienced last week fell short of our standard.\n\nWe have deployed a dedicated caching pipeline for Starter tier accounts this week that delivers 4x faster CSV exports. As an apology, I have upgraded FinVenture to priority background processing at no cost.\n\nI would love to make sure the fix is performing to your satisfaction. Could we chat briefly for 5 minutes tomorrow?\n\nWarmly,\nElena Rostova\nCustomer Success Lead`,
      recoveryProbability: 65,
      effortMinutes: 15,
      suggestedChannel: 'Email'
    },
    lastAnalyzedAt: '2026-09-15T14:00:00Z',
    isAiAnalyzed: true,
    supportTickets: [
      { id: 'TCK-4890', subject: 'CSV export takes > 45 seconds for 5,000 rows', status: 'Open', priority: 'Medium', createdAt: '2026-09-08', category: 'Performance' }
    ],
    paymentHistory: [
      { id: 'INV-395', date: '2026-08-12', amount: 199, status: 'Succeeded', invoiceId: 'in_fv001' }
    ],
    loginHistory: [
      { week: 'W1', activeUsers: 5, sessionsCount: 40, durationMinutes: 120 },
      { week: 'W2', activeUsers: 4, sessionsCount: 28, durationMinutes: 80 },
      { week: 'W3', activeUsers: 3, sessionsCount: 16, durationMinutes: 45 },
      { week: 'W4', activeUsers: 3, sessionsCount: 12, durationMinutes: 30 }
    ],
    riskTrend: [
      { month: 'Apr', score: 10 },
      { month: 'May', score: 18 },
      { month: 'Jun', score: 25 },
      { month: 'Jul', score: 40 },
      { month: 'Aug', score: 55 },
      { month: 'Sep', score: 68 }
    ],
    status: 'active'
  },
  {
    id: 'cust-in-005',
    name: 'ZetaFlow Logistics',
    email: 'vikram.rao@zetaflow.in',
    companyDomain: 'zetaflow.in',
    adminName: 'Vikram Rao',
    companyCity: 'Hyderabad',
    owner: 'Alex Vance (Founder)',
    plan: 'Enterprise',
    mrr: 1850,
    ltv: 22200,
    customerSince: '2023-09-10',
    lastLoginDays: 12,
    openTicketsCount: 0,
    paymentStatus: 'Current',
    usageTrendPercentage: -15,
    emailOpenRate: 22,
    riskScore: 38,
    riskCategory: 'Medium',
    renewalDaysLeft: 95,
    activeSeats: 16,
    totalSeats: 20,
    isDemo: true,
    healthPillars: {
      productScore: 35,
      billingScore: 20,
      supportScore: 15,
      relationshipScore: 65,
      engagementScore: 40,
      rootCauseDiagnosis: 'Original champion left company; new admin Vikram hasn\'t configured team integrations yet.',
      seatUtilizationRate: 80,
      activeSeats: 16,
      totalSeats: 20,
      renewalDaysLeft: 95,
      championLastActiveDays: 12
    },
    topFactors: [
      { factor: 'Key champion transition detected in workspace', points: 20, description: 'Previous technical sponsor departed ZetaFlow; new admin Vikram Rao active.', category: 'engagement' },
      { factor: 'API webhook integration disabled for 10 days', points: 12, description: 'Integration status turned offline during security credential rotation.', category: 'usage' }
    ],
    churnProbability: { day30: 20, day60: 32, day90: 45 },
    recommendedAction: 'Champion Succession: Schedule Admin Onboarding Workshop for Vikram & team',
    retentionRecommendation: {
      action: 'Champion Succession: Schedule Admin Onboarding Workshop for Vikram & team',
      emailScript: `Subject: ZetaFlow & NoChurn: Welcome & quick onboarding sync for Vikram\n\nHi Vikram,\n\nCongratulations on stepping into the engineering leadership role at ZetaFlow! I wanted to personally introduce myself as your dedicated contact at NoChurn.\n\nI noticed your team has 16 active members on the platform. To make sure your transition is seamless, our team would love to set up a dedicated 30-minute Admin Workshop for you to review your team's analytics and reconnect your webhook feed.\n\nWould next Tuesday at 11:30 AM IST work for you?\n\nWarm regards,\nAlex Vance\nFounder & CEO`,
      recoveryProbability: 80,
      effortMinutes: 30,
      suggestedChannel: 'Executive Call'
    },
    lastAnalyzedAt: '2026-09-15T12:00:00Z',
    isAiAnalyzed: true,
    supportTickets: [],
    paymentHistory: [
      { id: 'INV-390', date: '2026-09-10', amount: 1850, status: 'Succeeded', invoiceId: 'in_zf001' }
    ],
    loginHistory: [
      { week: 'W1', activeUsers: 18, sessionsCount: 140, durationMinutes: 480 },
      { week: 'W2', activeUsers: 17, sessionsCount: 130, durationMinutes: 440 },
      { week: 'W3', activeUsers: 16, sessionsCount: 115, durationMinutes: 390 },
      { week: 'W4', activeUsers: 16, sessionsCount: 105, durationMinutes: 360 }
    ],
    riskTrend: [
      { month: 'Apr', score: 12 },
      { month: 'May', score: 15 },
      { month: 'Jun', score: 20 },
      { month: 'Jul', score: 24 },
      { month: 'Aug', score: 32 },
      { month: 'Sep', score: 38 }
    ],
    status: 'active'
  },
  {
    id: 'cust-001',
    name: 'Acme Corp',
    email: 'sarah.connor@acmecorp.io',
    companyDomain: 'acmecorp.io',
    plan: 'Enterprise',
    mrr: 2400,
    ltv: 28800,
    customerSince: '2023-04-15',
    lastLoginDays: 31,
    openTicketsCount: 3,
    paymentStatus: 'Failed',
    usageTrendPercentage: -78,
    emailOpenRate: 4,
    riskScore: 92,
    riskCategory: 'Critical',
    topFactors: [
      { factor: 'Zero team logins in past 31 days', points: 40, description: 'Workspace activity plummeted to 0 sessions across all 18 seats.', category: 'usage' },
      { factor: 'Razorpay billing invoice failed on Aug 28', points: 30, description: 'Card ending in 4242 declined; automated dunning emails ignored.', category: 'payment' },
      { factor: '3 unresolved high-priority bugs', points: 22, description: 'Ticket #4912 regarding SSO auth has been pending for 14 days.', category: 'support' }
    ],
    churnProbability: { day30: 88, day60: 94, day90: 98 },
    recommendedAction: 'Executive Sponsor Outreach + Emergency Bug Fix',
    retentionRecommendation: {
      action: 'Executive Sponsor Outreach + Emergency Bug Fix',
      emailScript: `Subject: Acme Corp & NoChurn - Direct check-in from our founder\n\nHi Sarah,\n\nI noticed your team hasn't logged into your workspace in a few weeks, and I see our engineering team has kept ticket #4912 open longer than acceptable.\n\nFirst, I sincerely apologize. I've personally assigned our Lead Architect to deploy a hotfix today, and I'd like to credit your next two billing cycles while we verify everything is working smoothly for your team.\n\nCould we jump on a brief 10-minute call this Thursday to ensure you have what you need?\n\nBest regards,\nAlex Vance\nFounder & CEO`,
      recoveryProbability: 38,
      effortMinutes: 30,
      offerDiscount: '2 Months 100% Billing Credit + Dedicated Engineering Escalation',
      suggestedChannel: 'Executive Call'
    },
    lastAnalyzedAt: '2026-09-10T14:30:00Z',
    isAiAnalyzed: true,
    supportTickets: [
      { id: 'TCK-4912', subject: 'Okta SAML SSO redirect loop breaking user logins', status: 'Open', priority: 'Urgent', createdAt: '2026-08-28', category: 'Bug' },
      { id: 'TCK-4889', subject: 'Invoice receipt missing VAT details', status: 'Pending', priority: 'Medium', createdAt: '2026-08-22', category: 'Billing' },
      { id: 'TCK-4601', subject: 'Inquiry regarding webhook latency', status: 'Resolved', priority: 'Low', createdAt: '2026-07-15', category: 'Performance' }
    ],
    paymentHistory: [
      { id: 'INV-1092', date: '2026-08-28', amount: 2400, status: 'Failed', invoiceId: 'in_1Nx882' },
      { id: 'INV-1021', date: '2026-07-28', amount: 2400, status: 'Succeeded', invoiceId: 'in_1Mv991' },
      { id: 'INV-0955', date: '2026-06-28', amount: 2400, status: 'Succeeded', invoiceId: 'in_1Lt442' }
    ],
    loginHistory: [
      { week: 'W1', activeUsers: 14, sessionsCount: 120, durationMinutes: 450 },
      { week: 'W2', activeUsers: 9, sessionsCount: 65, durationMinutes: 210 },
      { week: 'W3', activeUsers: 3, sessionsCount: 14, durationMinutes: 40 },
      { week: 'W4', activeUsers: 0, sessionsCount: 0, durationMinutes: 0 }
    ],
    riskTrend: [
      { month: 'Apr', score: 18 },
      { month: 'May', score: 25 },
      { month: 'Jun', score: 42 },
      { month: 'Jul', score: 68 },
      { month: 'Aug', score: 85 },
      { month: 'Sep', score: 92 }
    ],
    status: 'active'
  },
  {
    id: 'cust-002',
    name: 'TechStart Inc',
    email: 'marcus.brooks@techstart.co',
    companyDomain: 'techstart.co',
    plan: 'Growth',
    mrr: 890,
    ltv: 7120,
    customerSince: '2024-01-10',
    lastLoginDays: 19,
    openTicketsCount: 2,
    paymentStatus: 'Retried',
    usageTrendPercentage: -65,
    emailOpenRate: 11,
    riskScore: 78,
    riskCategory: 'High',
    topFactors: [
      { factor: 'Login volume fell 65% over past 4 weeks', points: 35, description: 'Only 2 out of 8 users have accessed the platform in the last 20 days.', category: 'usage' },
      { factor: 'Recent Razorpay card charge retried twice', points: 25, description: 'Card expiration warning sent with no billing profile update.', category: 'payment' },
      { factor: 'Export feature feedback ticket unresolved', points: 18, description: 'Customer expressed frustration with CSV export schema limits.', category: 'support' }
    ],
    churnProbability: { day30: 64, day60: 79, day90: 88 },
    recommendedAction: 'Offer 20% Annual Contract Discount + Custom CSV Consultation',
    retentionRecommendation: {
      action: 'Offer 20% Annual Contract Discount + Custom CSV Consultation',
      emailScript: `Subject: TechStart + NoChurn: Quick check-in & personalized export help\n\nHi Marcus,\n\nI was looking through your account telemetry and noticed your usage dipped recently. I also saw your ticket about the CSV export constraints.\n\nWe just pushed an update enabling custom column mappings for your exact use case! I'd love to set up a quick 15-minute screen share with you or your ops team to configure it.\n\nAlso, if budget is tight ahead of Q4, I can lock in your Growth tier at 20% off for the next 12 months.\n\nWould later this week work for a quick demo?\n\nWarmly,\nElena Rostova\nCustomer Success Lead`,
      recoveryProbability: 44,
      effortMinutes: 20,
      offerDiscount: '20% off Annual Upgrade ($1,780 saved)',
      suggestedChannel: 'Email'
    },
    lastAnalyzedAt: '2026-09-10T12:15:00Z',
    isAiAnalyzed: true,
    supportTickets: [
      { id: 'TCK-4810', subject: 'Export to BigQuery failing on timestamp column', status: 'Open', priority: 'High', createdAt: '2026-08-30', category: 'Bug' },
      { id: 'TCK-4750', subject: 'Need updated invoice with company address', status: 'Resolved', priority: 'Low', createdAt: '2026-08-14', category: 'Billing' }
    ],
    paymentHistory: [
      { id: 'INV-1088', date: '2026-08-10', amount: 890, status: 'Succeeded', invoiceId: 'in_1Nu771' },
      { id: 'INV-1010', date: '2026-07-10', amount: 890, status: 'Succeeded', invoiceId: 'in_1Mt662' }
    ],
    loginHistory: [
      { week: 'W1', activeUsers: 8, sessionsCount: 45, durationMinutes: 180 },
      { week: 'W2', activeUsers: 5, sessionsCount: 22, durationMinutes: 90 },
      { week: 'W3', activeUsers: 3, sessionsCount: 11, durationMinutes: 40 },
      { week: 'W4', activeUsers: 1, sessionsCount: 3, durationMinutes: 12 }
    ],
    riskTrend: [
      { month: 'Apr', score: 28 },
      { month: 'May', score: 32 },
      { month: 'Jun', score: 48 },
      { month: 'Jul', score: 62 },
      { month: 'Aug', score: 71 },
      { month: 'Sep', score: 78 }
    ],
    status: 'active'
  },
  {
    id: 'cust-003',
    name: 'ScaleUp Co',
    email: 'dave.miller@scaleup.tech',
    companyDomain: 'scaleup.tech',
    plan: 'Enterprise',
    mrr: 1200,
    ltv: 14400,
    customerSince: '2024-03-01',
    lastLoginDays: 1,
    openTicketsCount: 0,
    paymentStatus: 'Current',
    usageTrendPercentage: 22,
    emailOpenRate: 68,
    riskScore: 18,
    riskCategory: 'Low',
    topFactors: [
      { factor: 'Healthy login frequency: logged in yesterday', points: 5, description: '24 team members active across all modules daily.', category: 'usage' },
      { factor: 'Pristine payment track record', points: 3, description: 'All monthly invoices settled instantly via ACH autodebit.', category: 'payment' },
      { factor: 'High product engagement (+22% usage trend)', points: 4, description: 'Customer activated 3 new webhook integrations this month.', category: 'engagement' }
    ],
    churnProbability: { day30: 4, day60: 8, day90: 12 },
    recommendedAction: 'Upsell to Annual Multi-Seat Addon + Request Case Study',
    retentionRecommendation: {
      action: 'Upsell to Annual Multi-Seat Addon + Request Case Study',
      emailScript: `Subject: ScaleUp Co's recent milestones + feature spotlight\n\nHi Dave,\n\nSaw your team crossed 100,000 processed events this week—congratulations on the rapid expansion!\n\nGiven your volume growth, would you be interested in being featured as a success story on our customer showcase page? It's great brand visibility and we can also lock in discounted volume rates for your next tier.\n\nLet me know if you have 10 minutes to review draft quotes.\n\nCheers,\nAlex Vance`,
      recoveryProbability: 95,
      effortMinutes: 15,
      offerDiscount: 'Volume Tier Discount Available',
      suggestedChannel: 'Email'
    },
    lastAnalyzedAt: '2026-09-09T09:00:00Z',
    isAiAnalyzed: true,
    supportTickets: [],
    paymentHistory: [
      { id: 'INV-1090', date: '2026-09-01', amount: 1200, status: 'Succeeded', invoiceId: 'in_1Nv881' },
      { id: 'INV-1015', date: '2026-08-01', amount: 1200, status: 'Succeeded', invoiceId: 'in_1Mt772' }
    ],
    loginHistory: [
      { week: 'W1', activeUsers: 20, sessionsCount: 140, durationMinutes: 620 },
      { week: 'W2', activeUsers: 22, sessionsCount: 160, durationMinutes: 710 },
      { week: 'W3', activeUsers: 24, sessionsCount: 185, durationMinutes: 840 },
      { week: 'W4', activeUsers: 25, sessionsCount: 195, durationMinutes: 910 }
    ],
    riskTrend: [
      { month: 'Apr', score: 24 },
      { month: 'May', score: 22 },
      { month: 'Jun', score: 19 },
      { month: 'Jul', score: 20 },
      { month: 'Aug', score: 18 },
      { month: 'Sep', score: 18 }
    ],
    status: 'active'
  }
];

// Generate remaining 47 customers to form exactly 50 SaaS accounts
const COMPANY_NAMES = [
  'HyperScale', 'DevFlow Systems', 'DataPulse Analytics', 'CloudMatrix', 'ApexMetrics',
  'PulseWave', 'CyberFortress', 'SynapseAI', 'OmniStack', 'LogixFleet',
  'FinVenture', 'StackBeacon', 'TalentGrid', 'BioNexus', 'MetricVibe',
  'AeroLogic', 'Quantify', 'VortexSaaS', 'ZenithOps', 'CodeCraft',
  'SwiftDeploy', 'Insignia Labs', 'SignalHive', 'OptimaCloud', 'NextWave CRM',
  'Veritas Data', 'PrimeSaaS', 'FlowState HQ', 'NeuralLoop', 'Skyward HR',
  'BrightLedger', 'NexusPoint', 'Stratify', 'CoreSync', 'Krypton Security',
  'EchoEngine', 'Ironclad Ops', 'Synthetix', 'TrueNorth IT', 'BeaconWorks',
  'ClearPath Health', 'AlphaMetrics', 'KiteFly Tech', 'NovaSphere', 'VenturePulse',
  'OmniChannel Co', 'ZeroFriction'
];

const DOMAIN_SUFFIXES = ['.io', '.com', '.co', '.dev', '.ai', '.net'];
const FIRST_NAMES = ['Jordan', 'Taylor', 'Morgan', 'Casey', 'Sam', 'Riley', 'Avery', 'Jamie', 'Logan', 'Quinn', 'Peyton', 'Reese', 'Cameron', 'Dakota', 'Hayden'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];

// Deterministic mock generation
COMPANY_NAMES.forEach((cName, idx) => {
  const custId = `cust-${String(idx + 4).padStart(3, '0')}`;
  const firstName = FIRST_NAMES[idx % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(idx * 3) % LAST_NAMES.length];
  const suffix = DOMAIN_SUFFIXES[idx % DOMAIN_SUFFIXES.length];
  const cleanDomain = cName.toLowerCase().replace(/[^a-z0-9]/g, '') + suffix;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${cleanDomain}`;

  // Distribute risk categories nicely:
  // ~8 Critical (86-100), ~12 High (61-85), ~15 Medium (31-60), ~15 Low (0-30)
  let score: number;
  let plan: 'Starter' | 'Growth' | 'Enterprise';
  let mrr: number;
  let lastLoginDays: number;
  let openTicketsCount: number;
  let paymentStatus: 'Current' | 'Retried' | 'Failed' | 'Disputed';
  let usageTrendPercentage: number;
  let emailOpenRate: number;

  if (idx < 7) {
    // Critical risk (86-100)
    score = 86 + (idx % 14);
    plan = idx % 2 === 0 ? 'Enterprise' : 'Growth';
    mrr = plan === 'Enterprise' ? 1800 + idx * 150 : 650 + idx * 80;
    lastLoginDays = 24 + (idx * 3);
    openTicketsCount = 2 + (idx % 3);
    paymentStatus = idx % 2 === 0 ? 'Failed' : 'Disputed';
    usageTrendPercentage = -(60 + (idx * 4));
    emailOpenRate = 3 + (idx % 5);
  } else if (idx < 18) {
    // High risk (61-85)
    score = 62 + ((idx * 2) % 23);
    plan = idx % 3 === 0 ? 'Enterprise' : idx % 2 === 0 ? 'Growth' : 'Starter';
    mrr = plan === 'Enterprise' ? 1500 : plan === 'Growth' ? 750 : 280;
    lastLoginDays = 14 + (idx % 12);
    openTicketsCount = 1 + (idx % 3);
    paymentStatus = idx % 3 === 0 ? 'Retried' : 'Current';
    usageTrendPercentage = -(30 + (idx * 3));
    emailOpenRate = 12 + (idx % 10);
  } else if (idx < 32) {
    // Medium risk (31-60)
    score = 33 + ((idx * 3) % 27);
    plan = idx % 2 === 0 ? 'Growth' : 'Starter';
    mrr = plan === 'Growth' ? 600 : 190;
    lastLoginDays = 5 + (idx % 8);
    openTicketsCount = idx % 2 === 0 ? 1 : 0;
    paymentStatus = 'Current';
    usageTrendPercentage = -(5 + (idx % 20));
    emailOpenRate = 28 + (idx % 15);
  } else {
    // Low risk (0-30)
    score = 8 + ((idx * 2) % 22);
    plan = idx % 3 === 0 ? 'Enterprise' : idx % 2 === 0 ? 'Growth' : 'Starter';
    mrr = plan === 'Enterprise' ? 2200 : plan === 'Growth' ? 850 : 350;
    lastLoginDays = 1 + (idx % 3);
    openTicketsCount = 0;
    paymentStatus = 'Current';
    usageTrendPercentage = 15 + (idx % 25);
    emailOpenRate = 55 + (idx % 25);
  }

  const riskCat = getCategory(score);
  const ltv = mrr * (8 + (idx % 18));
  const topFactors = createDefaultFactors(score, lastLoginDays, paymentStatus, usageTrendPercentage);

  let recAction = 'Send Monthly Value Recap & Tips';
  let emailScript = `Hi ${firstName},\n\nWe wanted to share your monthly performance report...`;
  let recoveryProb = 45;
  let effort = 20;

  if (riskCat === 'Critical') {
    recAction = 'Urgent Founder 1-on-1 Call + Resolve Billing';
    emailScript = `Subject: Urgent check-in regarding ${cName}'s account\n\nHi ${firstName},\n\nI noticed your account has faced some friction recently and wanted to personally step in. Can we connect today for 10 minutes?\n\nBest,\nAlex Vance`;
    recoveryProb = 28;
    effort = 45;
  } else if (riskCat === 'High') {
    recAction = 'Offer 20% Retention Discount + Re-onboarding Session';
    emailScript = `Subject: Special concession & workflow review for ${cName}\n\nHi ${firstName},\n\nWe'd love to help your team get maximum value from NoChurn. I've credited $200 to your next cycle and would love to review your latest goals.\n\nCheers,\nElena Rostova`;
    recoveryProb = 42;
    effort = 30;
  } else if (riskCat === 'Medium') {
    recAction = 'Send Proactive Feature Guide + Check In on Support';
    emailScript = `Subject: Quick tips for your team at ${cName}\n\nHi ${firstName},\n\nNoticed you haven't tried our new automated playbooks yet! Here is a 2-minute walkthrough.\n\nBest,\nNoChurn Team`;
    recoveryProb = 65;
    effort = 15;
  }

  SAMPLE_CUSTOMERS.push({
    id: custId,
    name: cName,
    email,
    companyDomain: cleanDomain,
    plan,
    mrr,
    ltv,
    customerSince: `202${3 + (idx % 2)}-0${1 + (idx % 9)}-15`,
    lastLoginDays,
    openTicketsCount,
    paymentStatus,
    usageTrendPercentage,
    emailOpenRate,
    riskScore: score,
    riskCategory: riskCat,
    topFactors,
    churnProbability: {
      day30: Math.min(99, Math.round(score * 0.9)),
      day60: Math.min(99, Math.round(score * 0.95 + 4)),
      day90: Math.min(99, Math.round(score + 6))
    },
    recommendedAction: recAction,
    retentionRecommendation: {
      action: recAction,
      emailScript,
      recoveryProbability: recoveryProb,
      effortMinutes: effort,
      offerDiscount: score > 60 ? '20% off for 6 months' : undefined,
      suggestedChannel: score > 85 ? 'Executive Call' : 'Email'
    },
    lastAnalyzedAt: '2026-09-10T10:00:00Z',
    isAiAnalyzed: false,
    supportTickets: openTicketsCount > 0 ? [
      {
        id: `TCK-${5000 + idx}`,
        subject: idx % 2 === 0 ? 'Export failure in reporting module' : 'Webhook event dropped under peak load',
        status: 'Open',
        priority: score > 80 ? 'Urgent' : 'Medium',
        createdAt: '2026-09-02',
        category: 'Bug'
      }
    ] : [],
    paymentHistory: [
      { id: `INV-${2000 + idx}`, date: '2026-09-01', amount: mrr, status: paymentStatus === 'Current' ? 'Succeeded' : paymentStatus, invoiceId: `in_${idx}abc` },
      { id: `INV-${1900 + idx}`, date: '2026-08-01', amount: mrr, status: 'Succeeded', invoiceId: `in_${idx}prev` }
    ],
    loginHistory: [
      { week: 'W1', activeUsers: Math.max(1, 10 + (usageTrendPercentage > 0 ? 4 : -4)), sessionsCount: 40, durationMinutes: 180 },
      { week: 'W2', activeUsers: Math.max(1, 8 + (usageTrendPercentage > 0 ? 6 : -5)), sessionsCount: 32, durationMinutes: 140 },
      { week: 'W3', activeUsers: Math.max(0, 6 + (usageTrendPercentage > 0 ? 8 : -6)), sessionsCount: 20, durationMinutes: 90 },
      { week: 'W4', activeUsers: Math.max(0, 5 + (usageTrendPercentage > 0 ? 10 : -7)), sessionsCount: 15, durationMinutes: 60 }
    ],
    riskTrend: [
      { month: 'Apr', score: Math.max(5, Math.round(score * 0.4)) },
      { month: 'May', score: Math.max(8, Math.round(score * 0.55)) },
      { month: 'Jun', score: Math.max(12, Math.round(score * 0.7)) },
      { month: 'Jul', score: Math.max(15, Math.round(score * 0.85)) },
      { month: 'Aug', score: Math.max(15, Math.round(score * 0.95)) },
      { month: 'Sep', score: score }
    ],
    status: 'active'
  });
});
