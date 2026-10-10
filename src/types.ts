export type RiskCategory = 'Low' | 'Medium' | 'High' | 'Critical' | 'Healthy' | 'Watch' | 'High Risk';

export interface RiskFactor {
  factor: string;
  points: number;
  description: string;
  category: 'payment' | 'usage' | 'support' | 'engagement';
}

export interface ChurnProbability {
  day30: number; // percentage e.g. 72%
  day60: number;
  day90: number;
}

export interface RetentionRecommendation {
  action: string;
  emailScript: string;
  recoveryProbability: number; // percentage 15-50%
  effortMinutes: number; // 15-60 min
  offerDiscount?: string;
  keyTalkingPoints?: string[];
  suggestedChannel?: 'Email' | 'Executive Call' | 'In-App Message' | 'Dedicated Slack';
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: 'Open' | 'Pending' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  createdAt: string;
  category: 'Billing' | 'Bug' | 'Feature Request' | 'Performance' | 'Onboarding';
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  status: 'Succeeded' | 'Failed' | 'Refunded' | 'Disputed' | 'Retried';
  invoiceId: string;
}

export interface LoginHistoryPoint {
  week: string;
  activeUsers: number;
  sessionsCount: number;
  durationMinutes: number;
}

export interface RiskTrendPoint {
  month: string;
  score: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  companyDomain: string;
  avatarUrl?: string;
  plan: 'Starter' | 'Growth' | 'Enterprise' | 'Pro';
  mrr: number;
  ltv: number;
  customerSince: string;
  lastLoginDays: number;
  openTicketsCount: number;
  paymentStatus: 'Current' | 'Retried' | 'Failed' | 'Disputed';
  usageTrendPercentage: number; // e.g. -65 means down 65%, +20 means up 20%
  emailOpenRate: number; // e.g. 12%
  
  // Gemini AI Analysis
  riskScore: number; // 0-100
  riskCategory: RiskCategory;
  topFactors: RiskFactor[];
  churnProbability: ChurnProbability;
  recommendedAction: string;
  retentionRecommendation?: RetentionRecommendation;
  lastAnalyzedAt: string;
  isAiAnalyzed: boolean;
  
  // Historical telemetry
  supportTickets: SupportTicket[];
  paymentHistory: PaymentRecord[];
  loginHistory: LoginHistoryPoint[];
  riskTrend: RiskTrendPoint[];
  
  // Status
  status: 'active' | 'saved' | 'churned';
  outcomeStatus?: 'recovered' | 'churned';
  churnReason?: ChurnReasonType;
  churnReasonDetail?: string;
  rescuePlaybookUsed?: string;
  mrrProtected?: number;
  savedDate?: string;
  savedNotes?: string;
  workspaceId?: string;
  customerId?: string; // alias/unique key in workspace
  startDate?: string;
  lastPaymentDate?: string;
  failedPaymentsCount?: number;
  loginFrequency14Days?: number;
  sessionDurationAvg?: number;
  featureUsageCount?: number;
  lastLoginDate?: string;
  tickets30Days?: number;
  avgResolutionTime?: number;
  lastTicketDate?: string;
  satisfactionScore?: number;
  clickRate30Days?: number;
  npsScore?: number;
  scoringSource?: 'gemini-3.1-flash-lite' | 'gemini-3.8-flash' | 'rule-based-fallback';
  
  // Canonical & CSV interoperability fields
  customer_id?: string;
  company_name?: string;
  phone?: string;
  last_purchase_date?: string;
  total_spent?: number;
  total_orders?: number;
  last_login_date?: string;
  support_tickets?: number;
  city?: string;
  country?: string;
  signup_date?: string;
  risk_score?: number;
  risk_level?: RiskCategory | string;
  last_login_days_ago?: number;
  last_activity_date?: string;
  active_users_7d?: number;
  usage_score_percent?: number;
  open_support_tickets?: number;
  payment_status?: string;
  renewal_date?: string;
  risk_reason?: string;
  recommended_action?: string;
  account_owner?: string;
  is_demo_data?: boolean;
  created_at?: string;
  updated_at?: string;

  // 5 Health Pillars & Action System
  healthPillars?: HealthPillars;
  owner?: string;
  adminName?: string;
  companyCity?: string;
  renewalDaysLeft?: number;
  activeSeats?: number;
  totalSeats?: number;
  isDemo?: boolean;
}

export interface HealthPillars {
  productScore: number;      // 0-100 (35% weight)
  billingScore: number;      // 0-100 (25% weight)
  supportScore: number;      // 0-100 (15% weight)
  relationshipScore: number; // 0-100 (15% weight)
  engagementScore: number;   // 0-100 (10% weight)
  rootCauseDiagnosis: string;
  seatUtilizationRate?: number;
  activeSeats?: number;
  totalSeats?: number;
  renewalDaysLeft?: number;
  unresolvedBugDays?: number;
  championLastActiveDays?: number;
}

export type ActionStatus = 'pending' | 'contacted' | 'followed_up' | 'recovered' | 'churned' | 'false_alert';

export type ChurnReasonType =
  | 'pricing'
  | 'missing_feature'
  | 'poor_onboarding'
  | 'support_issue'
  | 'competitor'
  | 'company_closed'
  | 'payment_failure'
  | 'unknown';

export interface ActionEmailDraft {
  subject: string;
  body: string;
  channel: string;
  effortMinutes?: number;
}

export interface CustomerRetentionAction {
  id: string;
  customerId: string;
  customerName: string;
  companyCity?: string;
  adminName?: string;
  ownerEmail: string;
  priorityRank: number;
  priorityScore: number;
  mrr: number;
  riskScore: number;
  whyAtRisk: string;
  recommendedAction: string;
  actionEmailDraft?: ActionEmailDraft;
  status: ActionStatus;
  assignedTo: string;
  dueDate?: string;
  followUpDate?: string;
  outcomeRecordedAt?: string;
  mrrProtected?: number;
  churnReason?: ChurnReasonType;
  churnNotes?: string;
  interventionUsed?: string;
  competitorName?: string;
  contactAttempts?: number;
}

export interface CohortMonthRecord {
  month: string;
  highRiskCount: number;
  actionedCount: number;
  rescuedCount: number;
  churnedCount: number;
  savedMrr: number;
  winRate: number;
}

export interface ChurnReasonStats {
  reason: ChurnReasonType;
  label: string;
  percentage: number;
  count: number;
  mrrLost: number;
  preventiveFix: string;
}

export interface OnboardingState {
  currentStep: 1 | 2 | 3 | 4;
  completedAt?: string;
  hasImportedData: boolean;
  importedSource: 'csv' | 'demo' | 'razorpay';
  importedRecordsCount: number;
  firstActionTaken: boolean;
  firstActionCustomerId?: string;
  productTourCompleted: boolean;
  isOpen: boolean;
}

export interface ImportHistoryRecord {
  importId: string;
  workspaceId: string;
  source: 'CSV' | 'PDF' | 'Razorpay' | 'Mixpanel' | 'Intercom' | 'Manual';
  fileName: string;
  startedAt: string;
  completedAt: string;
  totalRows: number;
  validRows: number;
  failedRows: number;
  newCustomersAdded?: number;
  customersUpdated?: number;
  duplicatesSkipped?: number;
  totalMrrAddedOrUpdated?: number;
  status: 'completed' | 'failed' | 'processing' | 'partial success' | 'success';
  errorSummary?: string;
  invalidRows?: Array<{ row: number; field?: string; reason?: string; data?: Record<string, string>; errorReason?: string }>;
  documentSummary?: string;
  fileType?: 'csv' | 'pdf';

  // Snake_case aliases
  import_id?: string;
  file_name?: string;
  imported_at?: string;
  total_rows?: number;
  valid_rows?: number;
  invalid_rows?: number;
  new_customers_added?: number;
  customers_updated?: number;
  duplicates_skipped?: number;
  total_mrr_added_or_updated?: number;
}

export interface ManualCustomerInput {
  name: string;
  customerId: string;
  email?: string;
  plan?: 'Starter' | 'Growth' | 'Enterprise';
  mrr: number;
  lastLoginDate?: string;
  paymentStatus: 'Current' | 'Failed' | 'Retried';
  failedPaymentsCount?: number;
  ticketsLast30Days?: number;
  satisfactionScore?: number;
  emailOpenRate?: number;
}

export interface IntegrationStatus {
  id: 'razorpay' | 'mixpanel' | 'intercom' | 'sendgrid' | 'supabase' | string;
  name: string;
  category: 'billing' | 'usage' | 'support' | 'engagement' | 'database';
  icon: string;
  description: string;
  isConnected: boolean;
  lastSyncAt: string | null;
  syncedRecordsCount: number;
  syncFrequency: 'Every 24 Hours' | 'Real-time' | 'Manual';
  apiKeyMasked?: string;
  statusText: string;
}

export interface DailyAlert {
  id: string;
  timestamp: string;
  title: string;
  customersCount: number;
  mrrAtRisk: number;
  customers: {
    id: string;
    name: string;
    score: number;
    mrr: number;
    action: string;
  }[];
  sentViaEmail: boolean;
  sentViaSlack: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  type: 'ai_analysis' | 'retention_action' | 'data_sync' | 'security' | 'billing';
}

export interface UserSession {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
  createdAt?: string;
  browser?: string;
  os?: string;
}

export interface PaymentMethod {
  id: string;
  brand: string; // 'visa' | 'mastercard' | 'rupay' | 'upi'
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  cardholderName?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  company: string;
  phone?: string;
  role: 'Admin' | 'Analyst' | 'Viewer';
  plan: 'Starter' | 'Growth' | 'Pro';
  selectedPlan?: string;
  billingCycle?: 'monthly' | 'annual';
  planPrice?: number;
  billingStatus?: 'trialing' | 'pending_payment' | 'active' | 'cancelled' | 'trial_expired' | 'halted';
  trialStartDate?: string;
  trialEndDate?: string;
  paymentStatus?: 'pending' | 'paid' | 'not_added' | 'failed' | 'active';
  cardLast4?: string;
  cardBrand?: string;
  cardExp?: string;
  cardholderName?: string;
  paymentMethods?: PaymentMethod[];
  razorpayCustomerId?: string;
  razorpaySubscriptionId?: string;
  subscriptionStartDate?: string;
  currentPeriodEnd?: string;
  workspaceId?: string;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'authenticator' | 'sms';
  twoFactorSecret?: string;
  backupCodes: string[];
  failedLoginAttempts: number;
  lockoutUntil?: string | null;
  lastLoginAt: string;
  createdAt: string;
  rememberMe?: boolean;
  referralCode?: string;
  earnedRewardDays?: number;
}

export type ReferralStatus = 'CLICKED' | 'SIGNED_UP' | 'TRIALING' | 'QUALIFIED' | 'REWARDED' | 'REJECTED';

export interface ReferralRecord {
  id: string;
  referrerUserId: string;
  referrerWorkspaceId: string;
  referralCode: string;
  referredUserId?: string;
  referredWorkspaceId?: string;
  referredEmailMasked?: string;
  status: ReferralStatus;
  rewardDays: number;
  rewardApplied: boolean;
  rewardAppliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralDashboardData {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  signedUpCount: number;
  trialingCount: number;
  qualifiedCount: number;
  rewardsEarnedDays: number;
  referrals: ReferralRecord[];
}

export interface BillingPlan {
  id: string;
  tier: 'starter' | 'growth' | 'pro';
  billing_cycle: 'monthly' | 'annual';
  name: string;
  amount_usd: number;
  amount_cents: number;
  currency: 'USD';
  period: 'monthly' | 'yearly';
  interval: number;
  discount_percentage: number;
  razorpay_plan_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRecord {
  id: string;
  user_id?: string;
  tier: 'starter' | 'growth' | 'pro';
  billing_cycle: 'monthly' | 'annual';
  billing_plan_id: string;
  razorpay_plan_id: string;
  razorpay_subscription_id: string;
  status: 'pending' | 'incomplete' | 'active' | 'halted' | 'cancelled' | 'past_due';
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  token?: string;
  requiresTwoFactor?: boolean;
  pendingTwoFactorUser?: UserProfile | null;
}

export interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: number;
  customersIncluded: string;
  isPopular?: boolean;
  features: string[];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 49,
    customersIncluded: '1,000 customers',
    features: [
      '1,000 customers monitored',
      '1 AI scan / day (1,000 analyzed)',
      'Top 5 priorities identified daily',
      '50 AI retention messages / month',
      '50 WhatsApp & 50 Email messages / month',
      '10 CSV & 5 PDF imports / month',
      '90 days customer history',
      '1 team member & 1 workspace',
      'Daily Retention Brief & basic reports'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 149,
    customersIncluded: '10,000 customers',
    isPopular: true,
    features: [
      '10,000 customers monitored',
      '3 AI scans / day (10,000 analyzed)',
      'Top 10 priorities identified daily',
      '500 AI retention messages / month',
      '500 WhatsApp & 500 Email messages / month',
      '50 CSV & 25 PDF imports / month',
      '1 year customer history',
      '5 team members & 3 workspaces',
      'API access & Webhooks',
      'Advanced automation & priority support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 499,
    customersIncluded: 'Unlimited customers',
    features: [
      'Unlimited customers monitored',
      'Unlimited AI scans & analyses',
      'Top 25 priorities identified daily',
      '2,500 AI retention messages / month',
      '2,500 WhatsApp & 2,500 Email messages / month',
      'Unlimited CSV & PDF imports',
      'Unlimited customer history',
      '20 team members & 10 workspaces',
      'Full API, Webhooks & integrations',
      'Custom risk rules & dedicated onboarding'
    ]
  }
];

// ==========================================
// AI RETENTION EMPLOYEE MVP TYPES
// ==========================================

export type AiRetentionActionType =
  | 'Personal Check-in'
  | 'Support Recovery'
  | 'Re-engagement'
  | 'Product Education'
  | 'VIP Outreach'
  | 'Feedback Request'
  | 'Renewal Reminder';

export type AiEmployeeStatus = 'READY' | 'WORKING' | 'COMPLETED' | 'ERROR';

export interface AiEmployeeSettings {
  dailyScanEnabled: boolean;
  scanTime: string; // e.g. "09:00"
  timezone: string;
  messageTone: 'Empathetic' | 'Professional' | 'Direct';
  minimumRisk: number; // default 70
  dailyPriorityCount: number; // default 5
  ownerNotificationEmail?: string;
}

export type MessageStatus = 'ready' | 'approved' | 'queued' | 'sending' | 'copied' | 'sent' | 'failed' | 'rejected';

export interface RetentionMessage {
  id: string;
  customerId: string;
  customerName: string;
  companyName?: string;
  customerEmail: string;
  customerPhone?: string;
  channel: 'whatsapp' | 'email';
  subject?: string; // For Email
  content: string;
  reason: string;
  status: MessageStatus;
  createdAt: string;
  approvedAt?: string;
  queuedAt?: string;
  copiedAt?: string;
  sentAt?: string;
  failedAt?: string;
  providerMessageId?: string;
  deliveryStatus?: 'queued' | 'delivered' | 'read' | 'failed' | 'not_connected';
  failureReason?: string;
  mrrProtected?: number;
  attempts?: number;
  idempotencyKey?: string;
}

export interface Top5CustomerPriority {
  customer: Customer;
  priorityScore: number; // 0-100
  riskScore: number;
  riskLevel?: string;
  revenueAtRisk: number;
  whyAtRisk: string;
  recommendedAction: AiRetentionActionType;
  whatsappDraft: string;
  whatsappDraftStatus?: 'ready' | 'approved' | 'queued' | 'sending' | 'copied' | 'sent' | 'failed';
  emailSubject: string;
  emailDraft: string;
  emailDraftStatus?: 'ready' | 'approved' | 'queued' | 'sending' | 'copied' | 'sent' | 'failed';
  messageStatus: 'ready' | 'approved' | 'queued' | 'sending' | 'copied' | 'sent' | 'failed';
}

export interface OutboundChannelStatus {
  configured: boolean;
  status: 'connected' | 'not_configured' | 'error';
  provider: string;
  maskedIdentifier?: string | null;
  fromEmail?: string | null;
  error?: string | null;
  lastCheckedAt?: string;
}

export interface OutboundIntegrationsStatus {
  whatsapp: OutboundChannelStatus;
  email: OutboundChannelStatus;
}

export interface OutboundQueueStatus {
  totalItems: number;
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  duplicateProtectionActive: boolean;
  duplicateSuppressedCount: number;
  lastProcessedAt?: string;
}

export interface SchedulerStatus {
  active: boolean;
  scheduledTime: string;
  timezone: string;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  cronEndpoint: string;
  statusMessage: string;
}

export interface TestOutboundConfigResult {
  channel: 'whatsapp' | 'email';
  verified: boolean;
  status: 'connected' | 'not_configured' | 'error';
  message: string;
  distinction: 'CONFIGURATION_VERIFIED_ONLY_NO_MESSAGE_SENT';
  requiredEnvVars?: string[];
  safeDetails?: string;
}

export interface DailyRetentionBrief {
  id: string;
  date: string;
  status: AiEmployeeStatus;
  customersAnalyzed: number;
  customersAtRisk: number;
  revenueAtRisk: number;
  top5: Top5CustomerPriority[];
  messagesReady: number;
  messagesAwaitingApproval?: number;
  messagesQueued?: number;
  messagesSent: number;
  messagesFailed?: number;
  customersRecovered: number;
  ownerNotified: boolean;
  ownerNotificationEmail?: string;
  ownerNotificationStatus?: string;
  createdAt: string;
}

