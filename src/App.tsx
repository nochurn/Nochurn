import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useCustomerStore } from './context/CustomerContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { HomeDashboardView } from './components/HomeDashboardView';
import { AiEmployeeView } from './components/AiEmployeeView';
import { MessagesView } from './components/MessagesView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { DashboardView } from './components/DashboardView';
import { CustomerTableView } from './components/CustomerTableView';
import { RetentionPlaybooksView } from './components/RetentionPlaybooksView';
import { DataIntegrationView } from './components/DataIntegrationView';
import { AnalyticsView } from './components/AnalyticsView';
import { RoiCalculatorView } from './components/RoiCalculatorView';
import { DailyAlertsView } from './components/DailyAlertsView';
import { PricingView } from './components/PricingView';
import { SecurityView } from './components/SecurityView';
import { BillingSettingsView } from './components/BillingSettingsView';
import { AdminBillingPlansView } from './components/AdminBillingPlansView';
import { AdminDatabaseTestView } from './components/AdminDatabaseTestView';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { SuccessView } from './components/SuccessView';
import { ActionQueueView } from './components/ActionQueueView';
import { ClosedLoopLearningView } from './components/ClosedLoopLearningView';
import { RoadmapMetricsView } from './components/RoadmapMetricsView';
import { OnboardingModal } from './components/OnboardingModal';
import { ChurnReasonType, Top5CustomerPriority, RetentionMessage } from './types';
import { aiEmployeeService } from './services/aiEmployeeService';
import { identifyTop5Priorities } from './utils/aiEmployeeEngine';

// Auth Components
import { LoginView } from './components/auth/LoginView';
import { SignupView } from './components/auth/SignupView';
import { TwoFactorPromptView } from './components/auth/TwoFactorPromptView';
import { ForgotPasswordView } from './components/auth/ForgotPasswordView';
import { ResetPasswordView } from './components/auth/ResetPasswordView';
import { BillingVerifyView } from './components/BillingVerifyView';

// Legal & Security Pages
import { SecurityTermsView } from './components/legal/SecurityTermsView';
import { PrivacyPolicyView } from './components/legal/PrivacyPolicyView';
import { LegalPagesView } from './components/legal/LegalPagesView';

import { apiService } from './services/api';
import { authService } from './services/authService';
import { Customer, IntegrationStatus, DailyAlert, UserProfile } from './types';
import { Sparkles, CheckCircle2, AlertCircle, RefreshCw, UploadCloud } from 'lucide-react';

// Helper to parse hash and query parameters
function parseRouteHash(hashString: string): { view: string; params: Record<string, string> } {
  const params: Record<string, string> = {};

  // Check window.location.search first (for /signup?plan=growth&price=299)
  if (typeof window !== 'undefined' && window.location.search) {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.forEach((val, key) => {
      params[key] = val;
    });
  }

  // Also check pathname (for /pricing, /signup, /settings/billing, /success)
  let pathnameView = '';
  if (typeof window !== 'undefined' && window.location.pathname) {
    const rawPath = window.location.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    if (rawPath && rawPath !== 'index.html') {
      pathnameView = rawPath;
    }
  }

  const clean = hashString.replace(/^#\/?/, '');
  const [viewPart, queryPart] = clean.split('?');
  if (queryPart) {
    const searchParams = new URLSearchParams(queryPart);
    searchParams.forEach((val, key) => {
      params[key] = val;
    });
  }
  let resolvedView = viewPart || pathnameView || 'home';
  if (resolvedView === 'dashboard' || resolvedView === 'action-queue') {
    resolvedView = 'home';
  }
  if (resolvedView === 'billing/verify' || resolvedView === 'billing-verify') {
    resolvedView = 'billing_verify';
  }
  return { view: resolvedView, params };
}

export default function App() {
  const initialRoute = parseRouteHash(window.location.hash);
  // Navigation & View state
  const [activeView, setActiveView] = useState<string>(initialRoute.view);
  const [routeParams, setRouteParams] = useState<Record<string, string>>(initialRoute.params);

  // Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [userAwaiting2FA, setUserAwaiting2FA] = useState<UserProfile | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);

  // Canonical Customer Store (Single Source of Truth)
  const customerStore = useCustomerStore();
  const allCustomers = customerStore.customers;
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);

  // Search & Filter state
  const [searchValue, setSearchValue] = useState<string>('');
  const [filters, setFilters] = useState({
    riskLevel: 'all',
    mrrRange: 'all',
    plan: 'all',
    factor: 'all'
  });
  const [sortBy, setSortBy] = useState<string>('riskScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtered & Paginated customer subset (strictly derived in real-time)
  const filteredCustomers = useMemo(() => {
    let result = [...allCustomers];

    if (searchValue.trim()) {
      const q = searchValue.toLowerCase();
      result = result.filter(
        c =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.company_name || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          ((c as any).domain || '').toLowerCase().includes(q) ||
          (c.id || '').toLowerCase().includes(q)
      );
    }

    if (filters.riskLevel !== 'all') {
      result = result.filter(c => {
        const score = c.risk_score ?? c.riskScore ?? 0;
        if (filters.riskLevel === 'critical') return score >= 80;
        if (filters.riskLevel === 'high') return score >= 60 && score < 80;
        if (filters.riskLevel === 'medium') return score >= 30 && score < 60;
        if (filters.riskLevel === 'low') return score < 30;
        return true;
      });
    }

    if (filters.mrrRange !== 'all') {
      result = result.filter(c => {
        const m = c.mrr || 0;
        if (filters.mrrRange === '<500') return m < 500;
        if (filters.mrrRange === '500-1500') return m >= 500 && m <= 1500;
        if (filters.mrrRange === '>1500') return m > 1500;
        return true;
      });
    }

    if (filters.plan !== 'all') {
      result = result.filter(c => (c.plan || '').toLowerCase() === filters.plan.toLowerCase());
    }

    if (filters.factor !== 'all') {
      result = result.filter(c => {
        const factorStr = (c.topFactors?.[0]?.factor || c.risk_reason || '').toLowerCase();
        if (filters.factor === 'payment') return factorStr.includes('payment') || factorStr.includes('billing') || ['Failed', 'Retried', 'Disputed'].includes(c.paymentStatus || '');
        if (filters.factor === 'usage') return factorStr.includes('usage') || factorStr.includes('login') || factorStr.includes('inactive');
        if (filters.factor === 'support') return factorStr.includes('support') || factorStr.includes('ticket');
        if (filters.factor === 'email') return factorStr.includes('email');
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;
      if (sortBy === 'name') {
        valA = (a.company_name || a.name || '').toLowerCase();
        valB = (b.company_name || b.name || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortBy === 'riskScore') {
        valA = a.risk_score ?? a.riskScore ?? 0;
        valB = b.risk_score ?? b.riskScore ?? 0;
      } else if (sortBy === 'mrr') {
        valA = a.mrr || 0;
        valB = b.mrr || 0;
      } else if (sortBy === 'lastLogin') {
        valA = a.lastLoginDays ?? a.last_login_days_ago ?? 0;
        valB = b.lastLoginDays ?? b.last_login_days_ago ?? 0;
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [allCustomers, searchValue, filters, sortBy, sortOrder]);

  const total = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const customers = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredCustomers.slice(start, start + limit);
  }, [filteredCustomers, page, limit]);
  const isLoading = customerStore.loading;

  // Selected customer for modal
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Secondary data
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [alerts, setAlerts] = useState<DailyAlert[]>([]);
  const [geminiReady, setGeminiReady] = useState<boolean>(true);

  // Retention OS State: Onboarding & Demo banner
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [dismissDemoBanner, setDismissDemoBanner] = useState<boolean>(false);

  // Operation states
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // AI Employee Core Retention State
  const [top5Priorities, setTop5Priorities] = useState<Top5CustomerPriority[]>(() => aiEmployeeService.getLatestTop5());
  const [retentionMessages, setRetentionMessages] = useState<RetentionMessage[]>(() => aiEmployeeService.getMessages());
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Run AI Employee Morning Scan
  const handleRunScan = useCallback(async () => {
    if (allCustomers.length === 0) {
      showToast('Please import customers before running a scan.', 'info');
      return;
    }
    setIsScanning(true);
    try {
      const res = await aiEmployeeService.runScan(allCustomers, currentUser?.email);
      setTop5Priorities(res.top5);
      setRetentionMessages(res.messages);
      showToast(`Scan complete. Analyzed ${allCustomers.length} customers, prepared today's Top 5.`, 'success');
    } catch (err) {
      showToast('Your AI Employee could not complete today’s scan. Click to retry.', 'error');
    } finally {
      setIsScanning(false);
    }
  }, [allCustomers, currentUser?.email, showToast]);

  // Message approval action
  const handleApproveMessage = useCallback(async (msgId: string) => {
    try {
      await aiEmployeeService.approveMessage(msgId);
      setRetentionMessages(aiEmployeeService.getMessages());
      showToast('Message approved. Now ready to send.', 'success');
    } catch (err) {
      showToast('Failed to approve message', 'error');
    }
  }, [showToast]);

  // Derive initial Top 5 if not yet calculated
  useEffect(() => {
    if (allCustomers.length > 0 && top5Priorities.length === 0) {
      const settings = aiEmployeeService.getSettings();
      const priorities = identifyTop5Priorities(allCustomers, settings.messageTone, retentionMessages);
      setTop5Priorities(priorities);
    }
  }, [allCustomers, retentionMessages, top5Priorities.length]);

  // Keep messages synced with aiEmployeeService
  useEffect(() => {
    const unsub = aiEmployeeService.subscribe(() => {
      setRetentionMessages(aiEmployeeService.getMessages());
      setTop5Priorities(aiEmployeeService.getLatestTop5());
    });
    return unsub;
  }, []);

  // Synchronize hash with activeView
  const handleNavigate = useCallback((view: string, params?: Record<string, string>) => {
    const normalizedView = view === 'billing/verify' || view === 'billing-verify' ? 'billing_verify' : view;
    setActiveView(normalizedView);
    setRouteParams(params || {});
    const query = params && Object.keys(params).length > 0
      ? `?${new URLSearchParams(params).toString()}`
      : '';
    window.location.hash = `#${view}${query}`;
    try {
      window.history.pushState(null, '', `/${view}${query}`);
    } catch (e) {
      // Ignored in sandboxed iframes
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle URL hash changes from browser back/forward
  useEffect(() => {
    const handleHashChange = () => {
      const { view, params } = parseRouteHash(window.location.hash);
      setActiveView(view);
      setRouteParams(params);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Subscribe to authService state changes & handle initial session load
  useEffect(() => {
    const unsub = authService.subscribe((user) => {
      setCurrentUser(user);
      setAuthInitialized(true);
    });
    // Initial sync
    setCurrentUser(authService.getCurrentUser());
    setAuthInitialized(true);

    return () => unsub();
  }, []);

  // Public views that do not require an active authenticated subscription
  const PUBLIC_VIEWS = new Set([
    'login',
    'signup',
    '2fa-prompt',
    'forgot-password',
    'reset-password',
    'pricing',
    'security',
    'privacy',
    'terms',
    'dpa',
    'cookies',
    'acceptable-use',
    'contact',
    'help',
    'success',
    'payment-success'
  ]);

  // Route protection and post-auth redirect enforcement
  useEffect(() => {
    if (!authInitialized) return;

    const isPublic = PUBLIC_VIEWS.has(activeView);

    // 1. Unauthenticated users trying to access protected views
    if (!isPublic && !currentUser) {
      handleNavigate('login');
      return;
    }

    // 2. Billing verification route handling - redirect to dashboard if trialing/active
    if (activeView === 'billing_verify') {
      if (!currentUser) {
        handleNavigate('login');
        return;
      }
      if (currentUser.billingStatus === 'trialing' || currentUser.billingStatus === 'active') {
        handleNavigate('dashboard');
        return;
      }
      handleNavigate('pricing', { expired: 'true' });
      return;
    }

    // 3. Authenticated users accessing protected app routes (dashboard, customers, etc.)
    if (!isPublic) {
      const isTrialingOrActive = currentUser?.billingStatus === 'trialing' || currentUser?.billingStatus === 'active';

      if (!isTrialingOrActive) {
        handleNavigate('pricing', { expired: 'true' });
        return;
      }
    }
  }, [authInitialized, currentUser, activeView, handleNavigate]);

  // Fetch integrations
  const loadIntegrations = async () => {
    try {
      const res = await apiService.fetchIntegrations();
      setIntegrations(res.integrations);
    } catch (err) {
      console.error('Failed to load integrations', err);
    }
  };

  // Fetch alerts
  const loadAlerts = async () => {
    try {
      const res = await apiService.fetchAlerts();
      setAlerts(res.alerts);
    } catch (err) {
      console.error('Failed to load alerts', err);
    }
  };

  // Health check for Gemini
  const checkHealth = async () => {
    try {
      const res = await apiService.fetchHealth();
      setGeminiReady(res.geminiConfigured);
    } catch (err) {
      setGeminiReady(false);
    }
  };

  // Initial load for integrations, alerts, health and customer data
  useEffect(() => {
    customerStore.refreshCustomerData();
    loadIntegrations();
    loadAlerts();
    checkHealth();
  }, []);

  // Handle Search
  const handleSearchChange = (val: string) => {
    setSearchValue(val);
    setPage(1);
  };

  // Handle Filters
  const handleFilterChange = (key: string, val: string) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
    setPage(1);
  };

  // Handle Sort
  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Customer Deletion Handlers (Single Source of Truth + Immediate UI Update)
  const handleDeleteCustomer = async (id: string) => {
    const target = allCustomers.find(c => c.id === id);
    const targetName = target?.company_name || target?.name || 'Customer';
    const success = await customerStore.deleteCustomer(id);
    if (success) {
      showToast(`Account "${targetName}" deleted. Click Undo in the top banner to restore.`, 'info');
    } else {
      showToast('Failed to delete customer', 'error');
    }
  };

  const handleDeleteCustomers = async (ids: string[]) => {
    const count = ids.length;
    const success = await customerStore.deleteCustomers(ids);
    if (success) {
      showToast(`Deleted ${count} customer accounts. Click Undo in the banner to restore.`, 'info');
    } else {
      showToast('Failed to delete accounts', 'error');
    }
  };

  const handleClearDemoData = async () => {
    const count = await customerStore.clearDemoData();
    showToast(`Removed ${count} sample demo accounts. Real customer data preserved.`);
  };

  const handleUndoDelete = async () => {
    const success = await customerStore.undoLastDelete();
    if (success) {
      showToast('Restored deleted customer accounts successfully!', 'success');
    } else {
      showToast('Could not restore accounts', 'error');
    }
  };

  // Gemini AI Score recalculation
  const handleRunAiPredict = async (customerId: string) => {
    try {
      setIsAiLoading(true);
      const updatedCust = await customerStore.predictCustomerRisk(customerId);
      showToast(`AI Recalculated Churn Risk: ${updatedCust.riskScore} (${updatedCust.riskCategory})`);
    } catch (err: any) {
      showToast(err.message || 'AI prediction failed', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Gemini AI Retention Playbook recommendation
  const handleRunAiRecommend = async (customerId: string) => {
    try {
      setIsAiLoading(true);
      const updatedCust = await customerStore.recommendRetention(customerId);
      showToast(`Generated retention playbook for ${updatedCust.company_name || updatedCust.name}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to generate recommendation', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Mark customer saved
  const handleMarkSaved = async (customerId: string) => {
    try {
      const updatedCust = await customerStore.markCustomerSaved(customerId);
      showToast(`Marked ${updatedCust.company_name || updatedCust.name} as Saved! MRR preserved.`);
    } catch (err: any) {
      showToast('Failed to update customer status', 'error');
    }
  };

  // Record outcome for Closed-Loop Learning
  const handleRecordOutcome = async (data: {
    customerId: string;
    status: 'recovered' | 'churned';
    churnReason?: ChurnReasonType;
    churnReasonDetail?: string;
    rescuePlaybookUsed?: string;
    mrrProtected?: number;
    notes?: string;
  }) => {
    try {
      await customerStore.recordOutcome(data);
      const targetCust = allCustomers.find((c) => c.id === data.customerId);
      const customerName = targetCust?.company_name || targetCust?.name || 'Customer';
      const mrrValue = data.mrrProtected ?? targetCust?.mrr ?? 1200;

      if (data.status === 'recovered') {
        showToast(`🎉 Protected $${mrrValue.toLocaleString('en-US')} MRR for ${customerName}! Logged to closed-loop analytics.`, 'success');
      } else {
        showToast(`Attribution logged: ${data.churnReason || 'Churn'} recorded for ${customerName}. Recalibrating health weights.`, 'info');
      }
    } catch (err) {
      showToast('Failed to log outcome', 'error');
    }
  };

  // Batch Analyze All At-Risk Customers
  const handleBatchAnalyze = async () => {
    try {
      setIsBatchAnalyzing(true);
      showToast('Running Gemini batch churn prediction on all active customers...', 'info');
      const res = await customerStore.batchScoreCustomers();
      showToast(res.message);
    } catch (err: any) {
      showToast('Batch analysis encountered an issue', 'error');
    } finally {
      setIsBatchAnalyzing(false);
    }
  };

  // Sync All Data Sources
  const handleSyncAll = async () => {
    try {
      setIsSyncing(true);
      showToast('Syncing integrations: Razorpay, Mixpanel, Intercom, SendGrid, Supabase...', 'info');
      const res = await apiService.syncAllIntegrations();
      setIntegrations(res.integrations);
      await customerStore.refreshCustomerData();
      showToast('All data integrations synced successfully! Models refreshed.');
    } catch (err) {
      showToast('Sync failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync One Data Source
  const handleSyncOne = async (id: string) => {
    try {
      setIsSyncing(true);
      const res = await apiService.syncIntegration(id);
      setIntegrations((prev) => prev.map((item) => (item.id === id ? res.integration : item)));
      await customerStore.refreshCustomerData();
      showToast(`Synced ${res.integration.name} (${res.integration.syncedRecordsCount} records).`);
    } catch (err) {
      showToast('Sync failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle Integration
  const handleToggleIntegration = async (id: string, enabled: boolean) => {
    try {
      const res = await apiService.toggleIntegration(id, enabled);
      setIntegrations((prev) => prev.map((item) => (item.id === id ? res.integration : item)));
      showToast(`${res.integration.name} is now ${enabled ? 'Connected' : 'Disconnected'}`);
    } catch (err) {
      showToast('Failed to update integration state', 'error');
    }
  };

  // Import custom CSV, PDF, or mock JSON customers
  const handleImportCustomers = async (payload: {
    rawCsv?: string;
    rawPdfBase64?: string;
    fileType?: 'csv' | 'pdf';
    customers?: any[];
    fileName?: string;
    deduplicationMode?: 'overwrite' | 'skip';
    validateOnly?: boolean;
    importValidOnly?: boolean;
  }) => {
    const res = await customerStore.importCustomers(payload);
    showToast('Customer dataset successfully refreshed!', 'success');
    return res;
  };

  // Send Test Digest
  const handleSendTestDigest = async (email: string, slackWebhook?: string) => {
    const res = await apiService.sendTestAlert(email, slackWebhook);
    showToast('Dispatched morning test digest via email & webhook!');
    return res;
  };

  // Auth Handlers
  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setUserAwaiting2FA(null);
    showToast('You have been signed out successfully.', 'info');
    handleNavigate('login');
  };

  const handleAuthSuccess = () => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    setUserAwaiting2FA(null);
    showToast('Welcome back! NoChurn is active.', 'success');
    const redirectUrl = authService.resolvePostLoginRedirect();
    if (redirectUrl === '/billing/verify') {
      handleNavigate('billing_verify');
    } else if (redirectUrl === '/pricing') {
      handleNavigate('pricing');
    } else {
      handleNavigate('dashboard');
    }
  };

  const handleRequireTwoFactor = (user: UserProfile) => {
    setUserAwaiting2FA(user);
    handleNavigate('2fa-prompt');
  };

  // Currently selected customer object
  const activeCustomer = selectedCustomerId
    ? allCustomers.find((c) => c.id === selectedCustomerId) ||
      customers.find((c) => c.id === selectedCustomerId) ||
      null
    : null;

  const atRiskCount = allCustomers.filter((c) => c.riskScore >= 61 && c.status !== 'saved').length;

  // Check if current view is a standalone Auth or Checkout View
  const isAuthView = [
    'login',
    'signup',
    '2fa-prompt',
    'forgot-password',
    'reset-password',
    'billing_verify',
    'billing/verify',
    'success'
  ].includes(activeView);

  // Check if current view is a standalone Legal View
  const isLegalView = [
    'security',
    'privacy',
    'terms',
    'dpa',
    'cookies',
    'acceptable-use',
    'contact',
    'help'
  ].includes(activeView);

  // Loading state guard: prevent brief flash of protected data while checking session
  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-blue-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-gray-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-blue-900 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 ${
              toastMessage.type === 'error'
                ? 'bg-red-900 text-white border-red-800'
                : 'bg-blue-900 text-white border-blue-800'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-300" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <Navbar
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onNavigate={handleNavigate}
        alerts={alerts}
        onOpenCustomer={(id) => setSelectedCustomerId(id)}
        onOpenPricing={() => handleNavigate('pricing')}
        onOpenSecurity={() => handleNavigate('settings/security')}
        geminiReady={geminiReady}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenOnboarding={() => setShowOnboarding(true)}
      />

      {/* Demo Sandbox Alert Banner */}
      {!dismissDemoBanner && !isAuthView && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-b border-amber-200/90 px-4 py-2.5 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-200/90 font-black text-[10px] uppercase tracking-wider text-amber-950 border border-amber-300">
              Demo Sandbox Active
            </span>
            <span className="font-medium text-amber-900">
              Operating on sample B2B SaaS accounts (Indian SaaS & global cohorts). Real client data is logically isolated.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOnboarding(true)}
              className="px-2.5 py-1 bg-amber-900 hover:bg-amber-800 text-white rounded-lg font-bold text-[11px] transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-amber-200" />
              <span>4-Step Setup Flow</span>
            </button>
            <button
              onClick={() => handleNavigate('integrations')}
              className="px-2.5 py-1 bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
            >
              Connect Real APIs
            </button>
            <button
              onClick={() => setDismissDemoBanner(true)}
              className="text-amber-700 hover:text-amber-950 text-xs px-1 cursor-pointer"
              title="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* RENDER VIEW ACCORDING TO ROUTE */}
      {/* 1. AUTH & CHECKOUT SUCCESS VIEWS */}
      {isAuthView && (
        <div className="flex-1 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
          {activeView === 'login' && (
            <LoginView
              onNavigate={handleNavigate}
              onShowToast={showToast}
              onAuthenticated={handleAuthSuccess}
              onRequireTwoFactor={handleRequireTwoFactor}
              initialEmail={routeParams.email}
              verifiedMessage={routeParams.verified === 'true'}
            />
          )}

          {activeView === 'signup' && (
            <SignupView
              onNavigate={handleNavigate}
              onShowToast={showToast}
              onAuthenticated={handleAuthSuccess}
              initialPlan={routeParams.plan || 'growth'}
              routeParams={routeParams}
            />
          )}

          {(activeView === 'success' || activeView === 'payment-success') && (
            <SuccessView
              sessionId={routeParams.session_id}
              plan={routeParams.plan || 'growth'}
              billing={routeParams.billing === 'annual' ? 'annual' : 'monthly'}
              amount={routeParams.amount}
              onNavigate={handleNavigate}
            />
          )}

          {activeView === '2fa-prompt' && (
            <TwoFactorPromptView
              user={userAwaiting2FA || currentUser || authService.getCurrentUser()!}
              onNavigate={handleNavigate}
              onShowToast={showToast}
              onAuthenticated={handleAuthSuccess}
            />
          )}

          {activeView === 'forgot-password' && (
            <ForgotPasswordView
              onNavigate={handleNavigate}
              onShowToast={showToast}
            />
          )}

          {activeView === 'reset-password' && (
            <ResetPasswordView
              token={routeParams.token || 'demo-token-123'}
              onNavigate={handleNavigate}
              onShowToast={showToast}
            />
          )}

          {(activeView === 'billing_verify' || activeView === 'billing/verify') && (
            <BillingVerifyView
              onNavigate={handleNavigate}
              onShowToast={showToast}
            />
          )}
        </div>
      )}

      {/* 2. LEGAL & COMPLIANCE VIEWS */}
      {!isAuthView && isLegalView && (
        <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          {activeView === 'security' && (
            <SecurityTermsView onNavigate={handleNavigate} onShowToast={showToast} />
          )}

          {activeView === 'privacy' && (
            <PrivacyPolicyView onNavigate={handleNavigate} onShowToast={showToast} />
          )}

          {['terms', 'dpa', 'cookies', 'acceptable-use', 'contact', 'help'].includes(activeView) && (
            <LegalPagesView
              page={activeView as 'terms' | 'dpa' | 'cookies' | 'acceptable-use' | 'contact' | 'help'}
              onNavigate={handleNavigate}
              onShowToast={showToast}
            />
          )}
        </div>
      )}

      {/* 3. CORE APP VIEWS (WITH SIDEBAR) */}
      {!isAuthView && !isLegalView && (
        <div className="flex-1 flex w-full max-w-[1700px] mx-auto">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <Sidebar
              activeView={activeView}
              onNavigate={handleNavigate}
              totalCustomers={allCustomers.length || total}
              atRiskCount={atRiskCount}
              messagesReadyCount={retentionMessages.filter(m => m.status === 'ready').length}
              onOpenPricing={() => handleNavigate('billing')}
            />
          </div>

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
            {/* Mobile Tab Bar (Strict 7 MVP Items) */}
            <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none text-xs font-semibold">
              {[
                { id: 'home', label: 'Home' },
                { id: 'customers', label: `Customers (${allCustomers.length})` },
                { id: 'ai-employee', label: 'AI Employee' },
                { id: 'messages', label: `Messages (${retentionMessages.filter(m => m.status === 'ready').length})` },
                { id: 'reports', label: 'Reports' },
                { id: 'billing', label: 'Billing' },
                { id: 'settings', label: 'Settings' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleNavigate(tab.id)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    activeView === tab.id
                      ? 'bg-blue-900 text-white font-bold'
                      : 'bg-white border border-gray-200 text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 1. Home Dashboard */}
            {(activeView === 'home' || activeView === 'dashboard' || activeView === 'action-queue') && (
              <HomeDashboardView
                customers={allCustomers}
                top5={top5Priorities}
                messages={retentionMessages}
                onNavigate={handleNavigate}
                onRunScan={handleRunScan}
                isScanning={isScanning}
                onSelectCustomer={(c) => setSelectedCustomerId(c.id)}
                onApproveMessage={handleApproveMessage}
                onShowToast={showToast}
                onImportCustomers={handleImportCustomers}
                onLoadDemoData={customerStore.loadDemoData}
              />
            )}

            {/* 2. Customers Page */}
            {activeView === 'customers' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Customers ({allCustomers.length})</h2>
                    <p className="text-xs text-gray-600">Search, filter by risk and revenue, or upload customer data.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleNavigate('integrations')}
                      className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Import CSV</span>
                    </button>
                  </div>
                </div>

                <CustomerTableView
                  customers={customers}
                  total={total}
                  page={page}
                  limit={limit}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  onLimitChange={setLimit}
                  onSearchChange={handleSearchChange}
                  searchValue={searchValue}
                  onFilterChange={handleFilterChange}
                  filters={filters}
                  onSortChange={handleSortChange}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSelectCustomer={(cust) => setSelectedCustomerId(cust.id)}
                  onBatchAnalyze={handleBatchAnalyze}
                  isBatchAnalyzing={isBatchAnalyzing}
                  onMarkSaved={handleMarkSaved}
                  onDeleteCustomer={handleDeleteCustomer}
                  onDeleteCustomers={handleDeleteCustomers}
                  onClearDemoData={handleClearDemoData}
                  onUndoDelete={handleUndoDelete}
                  lastDeletedBatch={customerStore.lastDeletedBatch}
                />
              </div>
            )}

            {/* 3. AI Employee Page (Main Product Page) */}
            {activeView === 'ai-employee' && (
              <AiEmployeeView
                customers={allCustomers}
                top5={top5Priorities}
                messages={retentionMessages}
                onNavigate={handleNavigate}
                onRunScan={handleRunScan}
                isScanning={isScanning}
                onShowToast={showToast}
                onImportCustomers={handleImportCustomers}
                onLoadDemoData={customerStore.loadDemoData}
              />
            )}

            {/* 4. Messages Page */}
            {activeView === 'messages' && (
              <MessagesView
                customers={allCustomers}
                messages={retentionMessages}
                onShowToast={showToast}
                onNavigate={handleNavigate}
                onRefreshMessages={() => setRetentionMessages(aiEmployeeService.getMessages())}
              />
            )}

            {/* 5. Reports Page (Your Daily Retention Brief) */}
            {activeView === 'reports' && (
              <ReportsView
                customers={allCustomers}
                onNavigate={handleNavigate}
                onShowToast={showToast}
              />
            )}

            {/* 6. Billing Page (Razorpay) */}
            {(activeView === 'billing' || activeView === 'pricing' || activeView === 'settings/billing') && (
              <div className="space-y-6">
                <PricingView
                  onSelectPlan={(id) => showToast(`Selected ${id.toUpperCase()} tier plan`)}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                  initialPlan={routeParams.plan || 'growth'}
                  routeParams={routeParams}
                />
                <BillingSettingsView
                  currentUser={currentUser}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                  onUpdateUser={(updated) => setCurrentUser(updated)}
                  initialAction={routeParams.action}
                />
              </div>
            )}

            {/* 7. Settings Page */}
            {(activeView === 'settings' || activeView === 'settings/security' || activeView === 'settings/sessions' || activeView === 'security-settings') && (
              <SettingsView
                currentUser={currentUser}
                onNavigate={handleNavigate}
                onShowToast={showToast}
                onLoggedOut={handleLogout}
              />
            )}

            {/* CSV / Data Import Page (Accessible via "Import CSV" button) */}
            {activeView === 'integrations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleNavigate('customers')}
                    className="text-xs font-semibold text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    ← Back to Customers
                  </button>
                </div>
                <DataIntegrationView
                  integrations={integrations}
                  onSyncAll={handleSyncAll}
                  onSyncOne={handleSyncOne}
                  onToggleIntegration={handleToggleIntegration}
                  onImportCustomers={handleImportCustomers}
                  isSyncing={isSyncing}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                />
              </div>
            )}
            {(activeView === 'admin/billing/plans' || activeView === 'admin-plans' || activeView === 'admin/plans') && (
              <AdminBillingPlansView
                onNavigate={handleNavigate}
                onShowToast={showToast}
              />
            )}

            {/* Settings Views: 2FA, Active Sessions, and Governance */}
            {(activeView === 'settings/security' || activeView === 'security-settings') && (
              <SecurityView
                initialTab="2fa"
                onNavigate={handleNavigate}
                onShowToast={showToast}
                onLoggedOut={handleLogout}
              />
            )}

            {activeView === 'settings/sessions' && (
              <SecurityView
                initialTab="sessions"
                onNavigate={handleNavigate}
                onShowToast={showToast}
                onLoggedOut={handleLogout}
              />
            )}

            {activeView === 'settings/governance' && (
              <SecurityView
                initialTab="governance"
                onNavigate={handleNavigate}
                onShowToast={showToast}
                onLoggedOut={handleLogout}
              />
            )}

            {(activeView === 'admin/db-test' || activeView === 'admin-db-test') && (
              <AdminDatabaseTestView />
            )}
          </main>
        </div>
      )}

      {/* Global Comprehensive Footer with all compliance & support links */}
      <Footer onNavigate={handleNavigate} />

      {/* Customer Detail & AI Playbook Modal */}
      {activeCustomer && (
        <CustomerDetailModal
          customer={activeCustomer}
          onClose={() => setSelectedCustomerId(null)}
          onRunAiPredict={handleRunAiPredict}
          onRunAiRecommend={handleRunAiRecommend}
          onMarkSaved={handleMarkSaved}
          isAiLoading={isAiLoading}
        />
      )}

      {/* 4-Step Retention OS First-Value Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        currentUser={currentUser}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          setShowOnboarding(false);
          handleNavigate('action-queue');
          showToast('First-value onboarding complete! First retention action queue unlocked.', 'success');
        }}
        onLoadDemoData={async () => {
          await customerStore.refreshCustomerData();
          showToast('Loaded 50 curated SaaS B2B retention records!', 'success');
        }}
        onImportCsv={async (file: File) => {
          const text = await file.text();
          await handleImportCustomers({
            rawCsv: text,
            fileType: 'csv',
            fileName: file.name,
            deduplicationMode: 'overwrite'
          });
          showToast(`Successfully imported ${file.name}!`, 'success');
        }}
        onFirstActionTaken={(cust) => {
          handleMarkSaved(cust.id);
        }}
        topCustomer={allCustomers.find((c) => c.riskCategory === 'Critical') || allCustomers[0] || null}
        customers={allCustomers}
      />
    </div>
  );
}
