import { Customer, IntegrationStatus, DailyAlert, RetentionRecommendation } from '../types';

export async function fetchHealth(): Promise<{ status: string; geminiConfigured: boolean; model: string; totalCustomers: number }> {
  const res = await fetch('/api/health');
  return res.json();
}

export async function fetchCustomers(params?: {
  search?: string;
  riskLevel?: string;
  mrrRange?: string;
  plan?: string;
  factor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): Promise<{
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.riskLevel) query.set('riskLevel', params.riskLevel);
  if (params?.mrrRange) query.set('mrrRange', params.mrrRange);
  if (params?.plan) query.set('plan', params.plan);
  if (params?.factor) query.set('factor', params.factor);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`/api/customers?${query.toString()}`);
  return res.json();
}

export async function fetchCustomerById(id: string): Promise<Customer> {
  const res = await fetch(`/api/customers/${id}`);
  return res.json();
}

export async function updateCustomerStatus(
  id: string,
  payload: {
    status?: 'active' | 'saved' | 'churned';
    savedNotes?: string;
    recommendedAction?: string;
    retentionRecommendation?: RetentionRecommendation;
  }
): Promise<Customer> {
  const res = await fetch(`/api/customers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function predictCustomerChurn(customerId: string): Promise<{
  success: boolean;
  analysis: any;
  source: string;
  warning?: string;
}> {
  const res = await fetch('/api/churn/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId })
  });
  return res.json();
}

export async function recommendCustomerRetention(customerId: string): Promise<{
  success: boolean;
  recommendation: RetentionRecommendation;
  source: string;
}> {
  const res = await fetch('/api/churn/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId })
  });
  return res.json();
}

export async function batchPredictChurn(customerIds?: string[]): Promise<{
  success: boolean;
  analyzedCount: number;
  message: string;
}> {
  const res = await fetch('/api/churn/batch-predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerIds })
  });
  return res.json();
}

export async function fetchIntegrations(): Promise<IntegrationStatus[]> {
  const res = await fetch('/api/integrations');
  return res.json();
}

export async function syncIntegration(integrationId?: string): Promise<{ success: boolean; integrations: IntegrationStatus[] }> {
  const res = await fetch('/api/integrations/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ integrationId })
  });
  return res.json();
}

export async function toggleIntegration(integrationId: string, isConnected: boolean): Promise<{ success: boolean; integrations: IntegrationStatus[] }> {
  const res = await fetch('/api/integrations/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ integrationId, isConnected })
  });
  return res.json();
}

export async function importCustomers(customers: any[]): Promise<{ success: boolean; importedCount: number; totalCount: number }> {
  const res = await fetch('/api/customers/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customers })
  });
  return res.json();
}

export async function fetchAlerts(): Promise<DailyAlert[]> {
  const res = await fetch('/api/alerts');
  return res.json();
}

export async function triggerDailyAlert(): Promise<{ success: boolean; alert: DailyAlert }> {
  const res = await fetch('/api/alerts/trigger-daily', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

export async function testSlackAlert(channel?: string): Promise<{ success: boolean; message: string; payload: any }> {
  const res = await fetch('/api/alerts/test-slack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel })
  });
  return res.json();
}

export async function fetchRoiMetrics(): Promise<{
  savedCustomersCount: number;
  savedMrr: number;
  subscriptionCost: number;
  netGain: number;
  roiMultiplier: number;
  summaryText: string;
}> {
  const res = await fetch('/api/roi');
  return res.json();
}

export async function requestAccountDeletion(): Promise<{ success: boolean; message: string; scheduledDeletionDate: string }> {
  const res = await fetch('/api/auth/delete-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

// Auth API Calls
export async function signupUser(payload: {
  fullName: string;
  companyName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  agreedToTerms: boolean;
  selectedPlan?: string;
  billingCycle?: 'monthly' | 'annual';
  isFreeTrial?: boolean;
}) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    const err: any = new Error(data.error || data.message || 'Failed to sign up');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function cancelTrial(email?: string) {
  const res = await fetch('/api/billing/cancel-trial', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return res.json();
}

export async function upgradePlan(plan: string, email?: string) {
  const res = await fetch('/api/billing/upgrade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, email })
  });
  return res.json();
}

export async function addPaymentMethod(payload: {
  cardNumber: string;
  cardholderName?: string;
  expMonth?: number;
  expYear?: number;
  cvc?: string;
  zip?: string;
  email?: string;
  isDefault?: boolean;
}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('cs_auth_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch('/api/billing/payment-method', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to add payment method');
  }
  return data;
}

export async function fetchPaymentMethods() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('cs_auth_token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch('/api/billing/payment-methods', { headers });
  return res.json();
}

export async function deletePaymentMethod(id: string) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('cs_auth_token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`/api/billing/payment-method/${id}`, {
    method: 'DELETE',
    headers
  });
  return res.json();
}

export async function setDefaultPaymentMethod(id: string) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('cs_auth_token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`/api/billing/payment-method/${id}/default`, {
    method: 'POST',
    headers
  });
  return res.json();
}

export async function loginUser(payload: {
  email: string;
  password: string;
  rememberMe?: boolean;
}) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Invalid credentials');
  }
  return data;
}

export async function fetchCurrentUser(token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch('/api/auth/me', { headers });
  if (!res.ok) return null;
  return res.json();
}

export async function logoutUser(token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch('/api/auth/logout', { method: 'POST', headers });
  return res.json();
}

export async function forgotPassword(email: string) {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return res.json();
}

export async function resetPassword(token: string, newPassword: string) {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reset password');
  }
  return data;
}

export async function setupWorkspace(payload: {
  fullName?: string;
  companyName?: string;
  selectedPlan?: string;
  billingCycle?: string;
}) {
  const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('cs_auth_token') || localStorage.getItem('churnshield_auth_token')) : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch('/api/auth/setup-workspace', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function setPendingPlan(payload: {
  tier: string;
  billing_cycle: string;
}) {
  const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('cs_auth_token') || localStorage.getItem('churnshield_auth_token')) : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch('/api/auth/pending-plan', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function resolvePostLoginRedirect(next?: string): Promise<{
  redirectTo: string;
  pendingPlan?: { tier: string; billing_cycle: string };
}> {
  const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('cs_auth_token') || localStorage.getItem('churnshield_auth_token')) : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const query = next ? `?next=${encodeURIComponent(next)}` : '';
  const res = await fetch(`/api/auth/resolve-redirect${query}`, { headers });
  if (!res.ok) {
    return { redirectTo: '/dashboard' };
  }
  return res.json();
}

export async function getAuthConfig(): Promise<{
  isConfigured: boolean;
  oauthProviders: { google: boolean; microsoft: boolean };
  developerError: string | null;
  siteUrl?: string;
}> {
  try {
    const res = await fetch('/api/auth/config');
    if (res.ok) {
      const data = await res.json();
      return {
        isConfigured: !!data.configured,
        oauthProviders: data.oauthProviders || { google: false, microsoft: false },
        developerError: data.error || null,
        siteUrl: data.siteUrl
      };
    }
  } catch (e) {
    console.warn('Failed to fetch /api/auth/config:', e);
  }
  return {
    isConfigured: false,
    oauthProviders: { google: false, microsoft: false },
    developerError: null
  };
}

// Razorpay Subscriptions Checkout API Call
export async function createRazorpaySubscription(payload: {
  tier: 'starter' | 'growth' | 'pro';
  billing_cycle: 'monthly' | 'annual';
}): Promise<{
  success: boolean;
  subscriptionId: string;
  planId: string;
  keyId: string;
  tier: string;
  billing_cycle: string;
  amountPaise: number;
  amountInr: number;
  status: string;
  error?: string;
}> {
  const token = localStorage.getItem('churnshield_auth_token');
  const res = await fetch('/api/razorpay/create-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to initiate Razorpay subscription');
  }
  return data;
}

// Admin Billing Plans API Calls
export async function fetchAdminBillingPlans(): Promise<{
  success: boolean;
  plans: any[];
  keyId: string;
  mode: string;
}> {
  const token = localStorage.getItem('churnshield_auth_token');
  const res = await fetch('/api/admin/billing/plans', {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  return res.json();
}

export async function createMissingRazorpayTestPlans(confirmationText: string): Promise<{
  success: boolean;
  message: string;
  createdCount: number;
  plans: any[];
  error?: string;
}> {
  const token = localStorage.getItem('churnshield_auth_token');
  const res = await fetch('/api/admin/billing/plans/create-missing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ confirmationText })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create missing Razorpay plans');
  }
  return data;
}

// CSV & Manual Data Ingestion Calls
export async function fetchImportHistory() {
  const res = await fetch('/api/imports/history');
  return res.json();
}

export async function clearImportHistory(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/imports/history', { method: 'DELETE' });
  return res.json();
}

export async function deleteCustomer(id: string): Promise<{ success: boolean; message: string; deletedCustomer?: Customer }> {
  const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete customer');
  }
  return data;
}

export async function deleteCustomers(ids: string[]): Promise<{ success: boolean; deletedCount: number; message: string; deletedCustomers?: Customer[] }> {
  const res = await fetch('/api/customers/bulk-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to bulk delete customers');
  }
  return data;
}

export async function clearDemoData(): Promise<{ success: boolean; removedCount: number; message: string }> {
  const res = await fetch('/api/customers/clear-demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to clear demo data');
  }
  return data;
}

export async function loadDemoData(): Promise<{ success: boolean; count: number; message: string }> {
  const res = await fetch('/api/customers/load-demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load demo data');
  }
  return data;
}

export async function restoreDeletedCustomers(customers: Customer[]): Promise<{ success: boolean; restoredCount: number; message: string; restored?: Customer[] }> {
  const res = await fetch('/api/customers/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customers })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to restore customers');
  }
  return data;
}

export async function importCustomersData(payload: {
  rawCsv?: string;
  rawPdfBase64?: string;
  fileType?: 'csv' | 'pdf';
  customers?: any[];
  fileName?: string;
  deduplicationMode?: 'overwrite' | 'skip';
  validateOnly?: boolean;
  importValidOnly?: boolean;
}) {
  const res = await fetch('/api/customers/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    const err: any = new Error(data.error || 'Failed to import customer telemetry');
    err.missingColumns = data.missingColumns;
    err.errors = data.errors;
    throw err;
  }
  return data;
}

export const importCustomersCsv = importCustomersData;

export async function addCustomerManual(payload: {
  customerName: string;
  customerId: string;
  email?: string;
  plan?: string;
  mrr: number;
  lastLoginDate?: string;
  paymentStatus?: string;
  failedPaymentsCount?: number;
  ticketsLast30Days?: number;
  satisfactionScore?: number;
  emailOpenRate?: number;
}) {
  const res = await fetch('/api/customers/manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to add customer manually');
  }
  return data;
}

export async function fetchRazorpayConfig(): Promise<{
  success: boolean;
  isConfigured: boolean;
  keyId: string;
  currency: string;
  mode: string;
  plans: Record<string, { monthly: number; annual: number; currency: string; display: string }>;
}> {
  const res = await fetch('/api/razorpay/config');
  return res.json();
}

export async function fetchExchangeRate(): Promise<{
  success: boolean;
  base: string;
  target: string;
  rate: number;
  displayRate: string;
  source: string;
  updatedAt: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/billing/exchange-rate');
    return res.json();
  } catch (err: any) {
    return {
      success: false,
      base: 'USD',
      target: 'INR',
      rate: 86.85,
      displayRate: '1 USD = ₹86.85',
      source: 'offline',
      updatedAt: new Date().toISOString(),
      error: err?.message
    };
  }
}

export async function createRazorpayOrder(payload: {
  plan: string;
  billingCycle: string;
  customerName?: string;
  customerEmail?: string;
}): Promise<{
  success: boolean;
  orderId: string;
  amount: number;
  amountInr: number;
  amountUsd?: number;
  exchangeRate?: number;
  displayExchangeRate?: string;
  exchangeRateNotice?: string;
  currency: string;
  keyId: string;
  receipt: string;
  plan: string;
  planName?: string;
  billingCycle: string;
  formattedUsd?: string;
  error?: string;
}> {
  const res = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function verifyRazorpayPayment(payload: {
  razorpay_order_id?: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
  razorpay_subscription_id?: string;
  plan?: string;
  tier?: string;
  billingCycle?: string;
  billing_cycle?: string;
  amount?: number;
  currency?: string;
  email?: string;
}): Promise<{
  success: boolean;
  verified: boolean;
  message: string;
  paymentId?: string;
  orderId?: string;
  subscriptionId?: string;
  plan?: string;
  billingStatus?: string;
  error?: string;
}> {
  const res = await fetch('/api/razorpay/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function verifyRazorpaySubscription(payload: {
  razorpay_subscription_id: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
  tier?: string;
  plan?: string;
  billing_cycle?: string;
  billingCycle?: string;
  amount?: number;
  currency?: string;
  email?: string;
}): Promise<{
  success: boolean;
  verified: boolean;
  message: string;
  subscriptionId?: string;
  paymentId?: string;
  tier?: string;
  billingStatus?: string;
  error?: string;
}> {
  const res = await fetch('/api/razorpay/verify-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

// $1 Trial Verification API Calls (Authoritative server-side flow)
export async function createTrialVerificationOrder(payload: {
  tier: 'starter' | 'growth' | 'pro';
  billing_cycle: 'monthly' | 'annual';
}): Promise<{
  success: boolean;
  keyId: string;
  orderId: string;
  amount: number;
  amountCents?: number;
  amountUsd?: number;
  currency: string;
  tier: string;
  billing_cycle: string;
  plan_name: string;
  formatted_amount: string;
  future_plan_price: number;
  trial_days: number;
  error?: string;
}> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('cs_auth_token') || localStorage.getItem('churnshield_auth_token') : null;
  const res = await fetch('/api/billing/trial-verification-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to initialize trial verification order');
  }
  return data;
}

export async function verifyTrialPayment(payload: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}): Promise<{
  success: boolean;
  verified: boolean;
  message: string;
  trial_started: boolean;
  tier: string;
  billing_cycle: string;
  trial_ends_at: string;
  subscription?: any;
  error?: string;
}> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('cs_auth_token') || localStorage.getItem('churnshield_auth_token') : null;
  const res = await fetch('/api/billing/verify-trial-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Trial verification payment failed to verify');
  }
  return data;
}

export async function activateSubscription(payload: {
  tier?: 'starter' | 'growth' | 'pro';
  billing_cycle?: 'monthly' | 'annual';
}): Promise<{
  success: boolean;
  message: string;
  subscriptionId?: string;
  plan?: any;
  error?: string;
}> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('cs_auth_token') || localStorage.getItem('churnshield_auth_token') : null;
  const res = await fetch('/api/billing/activate-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function fetchSubscriptionDetails(): Promise<{
  success: boolean;
  workspaceId: string;
  subscription: any;
  trialVerification: any;
  currentPlan: any;
  trialEndBehavior: string;
  plans: any[];
}> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('cs_auth_token') || localStorage.getItem('churnshield_auth_token') : null;
  const res = await fetch('/api/billing/subscription-details', {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  return res.json();
}

export async function fetchSupabaseStatus(): Promise<{
  success: boolean;
  url: string;
  isConfigured: boolean;
  isConnected: boolean;
  responseCode: number;
  statusText: string;
  tables: { name: string; recordsCount: number; lastSync: string }[];
}> {
  const res = await fetch('/api/supabase/status');
  return res.json();
}

export async function syncSupabase(action = 'export', table = 'customers'): Promise<{
  success: boolean;
  action: string;
  table: string;
  syncedRecordsCount: number;
  timestamp: string;
  message: string;
}> {
  const res = await fetch('/api/supabase/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, table })
  });
  return res.json();
}

export async function testSupabase(): Promise<{
  success: boolean;
  url: string;
  status: string;
  latencyMs: number;
  message: string;
}> {
  const res = await fetch('/api/supabase/test', {
    method: 'POST'
  });
  return res.json();
}

// ----------------------------------------------------
// Real Outbound Integrations (WhatsApp & Resend Email)
// ----------------------------------------------------

export interface OutboundStatusResponse {
  whatsapp: {
    configured: boolean;
    status: 'connected' | 'not_configured' | 'error';
    provider: string;
    maskedIdentifier?: string | null;
    phoneNumberIdMasked?: string | null;
    businessAccountIdMasked?: string | null;
    error?: string | null;
    requiredEnvVars: string[];
    lastCheckedAt: string;
  };
  email: {
    configured: boolean;
    status: 'connected' | 'not_configured' | 'error';
    provider: string;
    maskedIdentifier?: string | null;
    fromEmail: string;
    error?: string | null;
    requiredEnvVars: string[];
    lastCheckedAt: string;
  };
}

export interface TestOutboundConfigResponse {
  channel: 'whatsapp' | 'email';
  verified: boolean;
  status: 'connected' | 'not_configured' | 'error';
  message: string;
  distinction: 'CONFIGURATION_VERIFIED_ONLY_NO_MESSAGE_SENT';
  requiredEnvVars?: string[];
  safeDetails?: string;
}

export interface SendMessagePayload {
  messageId: string;
  channel: 'whatsapp' | 'email';
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  content: string;
  customerId?: string;
  customerName?: string;
  isApproved: boolean;
}

export interface SendMessageResponse {
  success: boolean;
  status: 'SENT' | 'FAILED';
  messageId?: string;
  channel?: 'whatsapp' | 'email';
  providerMessageId?: string;
  sentAt?: string;
  message?: string;
  error?: string;
  requiredEnvVars?: string[];
  providerResponse?: any;
}

export async function fetchOutboundStatus(): Promise<OutboundStatusResponse> {
  const res = await fetch('/api/integrations/outbound-status');
  if (!res.ok) {
    throw new Error('Failed to fetch outbound integrations status');
  }
  return res.json();
}

export async function testOutboundConfig(channel: 'whatsapp' | 'email'): Promise<TestOutboundConfigResponse> {
  const res = await fetch('/api/integrations/test-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel })
  });
  return res.json();
}

export async function sendRetentionMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
  const res = await fetch('/api/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return data;
}

// Outbound Sending Queue
export async function enqueueRetentionMessages(messages: any[]): Promise<{
  success: boolean;
  enqueuedCount: number;
  duplicatesBlocked: number;
  items: any[];
  queueStatus: any;
  message: string;
}> {
  const res = await fetch('/api/queue/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });
  return res.json();
}

export async function fetchQueueStatus(): Promise<any> {
  const res = await fetch('/api/queue/status');
  return res.json();
}

export async function processQueueNow(): Promise<any> {
  const res = await fetch('/api/queue/process', { method: 'POST' });
  return res.json();
}

export async function fetchQueueItems(): Promise<any> {
  const res = await fetch('/api/queue/items');
  return res.json();
}

// Scheduler & Daily Retention Briefs
export async function fetchSchedulerStatus(): Promise<any> {
  const res = await fetch('/api/scheduler/status');
  return res.json();
}

export async function updateSchedulerSettings(payload: any): Promise<any> {
  const res = await fetch('/api/scheduler/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function triggerDailyCronScan(ownerEmail?: string): Promise<any> {
  const res = await fetch('/api/cron/daily-scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerEmail })
  });
  return res.json();
}

export async function fetchRetentionBriefs(): Promise<any> {
  const res = await fetch('/api/scheduler/briefs');
  return res.json();
}

export const apiService = {
  fetchHealth,
  fetchCustomers,
  fetchCustomerById,
  updateCustomerStatus,

  async predictChurn(customerId: string): Promise<Customer> {
    const res = await predictCustomerChurn(customerId);
    if (res.analysis?.customer) {
      return res.analysis.customer;
    }
    return fetchCustomerById(customerId);
  },

  async recommendRetention(customerId: string): Promise<Customer> {
    const res = await recommendCustomerRetention(customerId);
    return fetchCustomerById(customerId);
  },

  async markCustomerSaved(customerId: string, notes?: string): Promise<Customer> {
    const updated = await updateCustomerStatus(customerId, {
      status: 'saved',
      savedNotes: notes || 'Retained via NoChurn intervention'
    });
    return updated;
  },

  async batchAnalyze(customerIds?: string[]) {
    return batchPredictChurn(customerIds);
  },

  async fetchIntegrations(): Promise<{ integrations: IntegrationStatus[] }> {
    const integrations = await fetchIntegrations();
    return { integrations };
  },

  async syncAllIntegrations(): Promise<{ integrations: IntegrationStatus[] }> {
    return syncIntegration();
  },

  async syncIntegration(id: string): Promise<{ integration: IntegrationStatus }> {
    const res = await syncIntegration(id);
    const found = res.integrations.find((item) => item.id === id) || res.integrations[0];
    return { integration: found };
  },

  async toggleIntegration(id: string, isConnected: boolean): Promise<{ integration: IntegrationStatus }> {
    const res = await toggleIntegration(id, isConnected);
    const found = res.integrations.find((item) => item.id === id) || res.integrations[0];
    return { integration: found };
  },

  async importCustomers(customers: any[]) {
    return importCustomers(customers);
  },

  async fetchAlerts(): Promise<{ alerts: DailyAlert[] }> {
    const alerts = await fetchAlerts();
    return { alerts };
  },

  async sendTestAlert(email: string, slackWebhook?: string) {
    return testSlackAlert();
  },

  fetchRoiMetrics,
  requestAccountDeletion,
  signupUser,
  cancelTrial,
  upgradePlan,
  addPaymentMethod,
  fetchPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  loginUser,
  fetchCurrentUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  createRazorpaySubscription,
  fetchAdminBillingPlans,
  createMissingRazorpayTestPlans,
  fetchRazorpayConfig,
  fetchExchangeRate,
  createRazorpayOrder,
  verifyRazorpayPayment,
  verifyRazorpaySubscription,
  createTrialVerificationOrder,
  verifyTrialPayment,
  activateSubscription,
  fetchSubscriptionDetails,
  fetchSupabaseStatus,
  syncSupabase,
  testSupabase,
  fetchImportHistory,
  clearImportHistory,
  deleteCustomer,
  deleteCustomers,
  clearDemoData,
  loadDemoData,
  restoreDeletedCustomers,
  importCustomersCsv,
  importCustomersData,
  addCustomerManual,
  getAuthConfig,
  setPendingPlan,
  resolvePostLoginRedirect,
  fetchOutboundStatus,
  testOutboundConfig,
  sendRetentionMessage,
  enqueueRetentionMessages,
  fetchQueueStatus,
  processQueueNow,
  fetchQueueItems,
  fetchSchedulerStatus,
  updateSchedulerSettings,
  triggerDailyCronScan,
  fetchRetentionBriefs
};
