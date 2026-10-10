import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Customer, ImportHistoryRecord, ChurnReasonType } from '../types';
import { apiService } from '../services/api';
import { authService } from '../services/authService';
import {
  getTotalCustomers,
  getTotalMRR,
  getRiskDistribution,
  getHighRiskCustomers,
  getMediumRiskCustomers,
  getLowRiskCustomers,
  getMRRAtRisk,
  getHighRiskMRR,
  getMediumRiskMRR,
  getAverageRiskScore,
  getCustomersNeedingAction,
  getTopRiskAccounts,
  getPlanDistribution,
  getPaymentStatusDistribution,
  getUpcomingRenewals,
  getROIInsights,
  RiskDistribution,
  ROIInsights,
  ROIConfig,
  deduplicateCustomers
} from '../utils/customerSelectors';

export interface CustomerContextValue {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  importHistory: ImportHistoryRecord[];
  lastDeletedBatch: { id: string; customers: Customer[]; timestamp: string } | null;
  
  // Core Actions
  importCustomers: (payload: {
    rawCsv?: string;
    rawPdfBase64?: string;
    fileType?: 'csv' | 'pdf';
    customers?: any[];
    fileName?: string;
    deduplicationMode?: 'overwrite' | 'skip';
    validateOnly?: boolean;
    importValidOnly?: boolean;
  }) => Promise<any>;
  deleteCustomer: (customerId: string) => Promise<boolean>;
  deleteCustomers: (customerIds: string[]) => Promise<boolean>;
  clearDemoData: () => Promise<number>;
  loadDemoData: () => Promise<number>;
  restoreDeletedCustomers: (records?: Customer[] | string) => Promise<boolean>;
  undoLastDelete: () => Promise<boolean>;
  clearImportHistory: () => Promise<void>;
  refreshCustomerData: () => Promise<void>;
  markCustomerSaved: (customerId: string, notes?: string) => Promise<Customer>;
  recordOutcome: (data: {
    customerId: string;
    status: 'recovered' | 'churned';
    churnReason?: ChurnReasonType;
    churnReasonDetail?: string;
    rescuePlaybookUsed?: string;
    mrrProtected?: number;
    notes?: string;
  }) => Promise<void>;
  predictCustomerRisk: (customerId: string) => Promise<Customer>;
  recommendRetention: (customerId: string) => Promise<Customer>;
  batchScoreCustomers: () => Promise<{ success: boolean; message: string }>;

  // Memoized Derived Metrics (Live Single Source of Truth)
  totalCustomers: number;
  totalMRR: number;
  riskDistribution: RiskDistribution;
  highRiskCustomers: Customer[];
  mediumRiskCustomers: Customer[];
  lowRiskCustomers: Customer[];
  mrrAtRisk: number;
  highRiskMRR: number;
  mediumRiskMRR: number;
  averageRiskScore: number;
  customersNeedingAction: Customer[];
  topRiskAccounts: Customer[];
  planDistribution: { plan: string; count: number; mrr: number; percent: number }[];
  paymentStatusDistribution: { status: string; count: number; mrr: number; percent: number }[];
  upcomingRenewals: Customer[];
  getROIWithConfig: (config?: Partial<ROIConfig>) => ROIInsights;
  roiInsights: ROIInsights;
}

const LOCAL_STORAGE_KEY = 'nochurn_canonical_customers';
const LOCAL_STORAGE_HISTORY_KEY = 'nochurn_import_history';

const CustomerContext = createContext<CustomerContextValue | undefined>(undefined);

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial State from localStorage if present
  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return deduplicateCustomers(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to parse cached customers from localStorage:', e);
      }
    }
    return [];
  });

  const [importHistory, setImportHistory] = useState<ImportHistoryRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        // ignore
      }
    }
    return [];
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDeletedBatch, setLastDeletedBatch] = useState<{ id: string; customers: Customer[]; timestamp: string } | null>(null);

  // Synchronize canonical dataset to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && customers.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customers));
      } catch (e) {
        console.warn('Failed to write customers to localStorage:', e);
      }
    } else if (typeof window !== 'undefined' && customers.length === 0) {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (e) {
        // ignore
      }
    }
  }, [customers]);

  // Synchronize import history to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(importHistory));
      } catch (e) {
        // ignore
      }
    }
  }, [importHistory]);

  // Load customer data & import history from authoritative backend API
  const refreshCustomerData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all customers for canonical store
      const [custRes, histRes] = await Promise.allSettled([
        apiService.fetchCustomers({ limit: 1000 }),
        apiService.fetchImportHistory()
      ]);

      if (custRes.status === 'fulfilled' && custRes.value && Array.isArray(custRes.value.customers)) {
        const deduped = deduplicateCustomers(custRes.value.customers);
        setCustomers(deduped);
      }

      if (histRes.status === 'fulfilled' && histRes.value && Array.isArray(histRes.value.history)) {
        setImportHistory(histRes.value.history);
      }
    } catch (err: any) {
      console.error('[NoChurn Store] Failed to refresh customer dataset:', err);
      setError(err?.message || 'Failed to sync with customer database');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshCustomerData();
  }, [refreshCustomerData]);

  // Import customers
  const importCustomers = useCallback(async (payload: {
    rawCsv?: string;
    rawPdfBase64?: string;
    fileType?: 'csv' | 'pdf';
    customers?: any[];
    fileName?: string;
    deduplicationMode?: 'overwrite' | 'skip';
    validateOnly?: boolean;
    importValidOnly?: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.importCustomersData(payload);

      // If not validateOnly, refresh authoritative state
      if (!payload.validateOnly) {
        await refreshCustomerData();
      }
      return res;
    } catch (err: any) {
      setError(err?.message || 'Import failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshCustomerData]);

  // Single customer deletion (optimistic with rollback)
  const deleteCustomer = useCallback(async (customerId: string): Promise<boolean> => {
    const target = customers.find(c => c.id === customerId || c.customerId === customerId || c.customer_id === customerId);
    if (!target) return false;

    // Optimistic removal
    const previous = [...customers];
    const newCustomers = customers.filter(c => c.id !== customerId && c.customerId !== customerId && c.customer_id !== customerId);
    setCustomers(newCustomers);

    const batchId = `del-${Date.now()}`;
    setLastDeletedBatch({
      id: batchId,
      customers: [target],
      timestamp: new Date().toISOString()
    });

    try {
      await apiService.deleteCustomer(customerId);
      return true;
    } catch (err: any) {
      console.error('[NoChurn Store] Failed to delete customer on server, rolling back:', err);
      setCustomers(previous);
      setError(err?.message || 'Failed to delete customer');
      return false;
    }
  }, [customers]);

  // Bulk customer deletion (optimistic with rollback)
  const deleteCustomers = useCallback(async (customerIds: string[]): Promise<boolean> => {
    if (!customerIds || customerIds.length === 0) return false;
    const idSet = new Set(customerIds);
    const toDelete = customers.filter(c => idSet.has(c.id) || (c.customerId && idSet.has(c.customerId)) || (c.customer_id && idSet.has(c.customer_id)));
    if (toDelete.length === 0) return false;

    const previous = [...customers];
    const newCustomers = customers.filter(c => !idSet.has(c.id) && (!c.customerId || !idSet.has(c.customerId)) && (!c.customer_id || !idSet.has(c.customer_id)));
    setCustomers(newCustomers);

    const batchId = `bulk-del-${Date.now()}`;
    setLastDeletedBatch({
      id: batchId,
      customers: toDelete,
      timestamp: new Date().toISOString()
    });

    try {
      await apiService.deleteCustomers(customerIds);
      return true;
    } catch (err: any) {
      console.error('[NoChurn Store] Failed to bulk delete on server, rolling back:', err);
      setCustomers(previous);
      setError(err?.message || 'Failed to bulk delete customers');
      return false;
    }
  }, [customers]);

  // Clear demo data only
  const clearDemoData = useCallback(async (): Promise<number> => {
    const demoCustomers = customers.filter(c => c.is_demo_data === true || c.isDemo === true);
    if (demoCustomers.length === 0) return 0;

    const previous = [...customers];
    const realCustomers = customers.filter(c => c.is_demo_data !== true && c.isDemo !== true);
    setCustomers(realCustomers);

    const batchId = `demo-clear-${Date.now()}`;
    setLastDeletedBatch({
      id: batchId,
      customers: demoCustomers,
      timestamp: new Date().toISOString()
    });

    try {
      const res = await apiService.clearDemoData();
      return res.removedCount ?? demoCustomers.length;
    } catch (err: any) {
      console.error('[NoChurn Store] Failed to clear demo data on server, rolling back:', err);
      setCustomers(previous);
      setError(err?.message || 'Failed to clear demo data');
      return 0;
    }
  }, [customers]);

  // Load demo data
  const loadDemoData = useCallback(async (): Promise<number> => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.loadDemoData();
      await refreshCustomerData();
      return res.count ?? 15;
    } catch (err: any) {
      console.error('[NoChurn Store] Failed to load demo data on server:', err);
      try {
        const { SAMPLE_CUSTOMERS } = await import('../data/sampleCustomers');
        const currentWs = authService.getCurrentUser()?.workspaceId || '';
        const demoRecords = JSON.parse(JSON.stringify(SAMPLE_CUSTOMERS)).map((c: any) => ({
          ...c,
          workspaceId: currentWs,
          is_demo_data: true,
          isDemo: true
        }));
        setCustomers(demoRecords);
        return demoRecords.length;
      } catch (fallbackErr) {
        setError('Failed to load demo data');
        return 0;
      }
    } finally {
      setLoading(false);
    }
  }, [refreshCustomerData]);

  // Restore deleted customers (undo)
  const restoreDeletedCustomers = useCallback(async (records?: Customer[] | string): Promise<boolean> => {
    let targets: Customer[] = [];
    if (Array.isArray(records) && records.length > 0) {
      targets = records;
    } else if (lastDeletedBatch && lastDeletedBatch.customers.length > 0) {
      targets = lastDeletedBatch.customers;
    }

    if (targets.length === 0) return false;

    // Optimistically prepend/merge
    const map = new Map<string, Customer>();
    targets.forEach(c => map.set(c.id || c.customerId || c.customer_id || '', c));
    customers.forEach(c => {
      const key = c.id || c.customerId || c.customer_id || '';
      if (!map.has(key)) map.set(key, c);
    });

    const restoredList = Array.from(map.values());
    setCustomers(restoredList);
    setLastDeletedBatch(null);

    try {
      await apiService.restoreDeletedCustomers(targets);
      await refreshCustomerData();
      return true;
    } catch (err: any) {
      console.error('[NoChurn Store] Failed to restore customers on server:', err);
      setError(err?.message || 'Failed to restore customers');
      return false;
    }
  }, [customers, lastDeletedBatch, refreshCustomerData]);

  const undoLastDelete = useCallback(async (): Promise<boolean> => {
    return restoreDeletedCustomers();
  }, [restoreDeletedCustomers]);

  // Clear Import History
  const clearImportHistory = useCallback(async (): Promise<void> => {
    setImportHistory([]);
    try {
      await apiService.clearImportHistory();
    } catch (err: any) {
      console.warn('[NoChurn Store] Failed to clear import history on server:', err);
    }
  }, []);

  // Mark Customer Saved
  const markCustomerSaved = useCallback(async (customerId: string, notes?: string): Promise<Customer> => {
    const updated = await apiService.markCustomerSaved(customerId, notes);
    setCustomers(prev => prev.map(c => (c.id === customerId || c.customerId === customerId ? updated : c)));
    return updated;
  }, []);

  // Record outcome for Closed-Loop Learning
  const recordOutcome = useCallback(async (data: {
    customerId: string;
    status: 'recovered' | 'churned';
    churnReason?: ChurnReasonType;
    churnReasonDetail?: string;
    rescuePlaybookUsed?: string;
    mrrProtected?: number;
    notes?: string;
  }): Promise<void> => {
    const target = customers.find(c => c.id === data.customerId || c.customerId === data.customerId);
    const mrrVal = data.mrrProtected ?? target?.mrr ?? 1200;

    const updatedFields: Partial<Customer> = {
      status: data.status === 'recovered' ? 'saved' : 'churned',
      outcomeStatus: data.status,
      churnReason: data.churnReason,
      churnReasonDetail: data.churnReasonDetail,
      rescuePlaybookUsed: data.rescuePlaybookUsed,
      mrrProtected: data.status === 'recovered' ? mrrVal : 0,
      savedNotes: data.notes || (data.status === 'recovered' ? 'Recovered via retention playbook' : 'Lost to churn')
    };

    setCustomers(prev =>
      prev.map(c => (c.id === data.customerId || c.customerId === data.customerId ? { ...c, ...updatedFields } : c))
    );

    try {
      await apiService.updateCustomerStatus(data.customerId, {
        status: data.status === 'recovered' ? 'saved' : 'churned',
        savedNotes: data.notes,
        recommendedAction: data.rescuePlaybookUsed
      });
    } catch (e) {
      console.warn('Failed to persist outcome status to backend:', e);
    }
  }, [customers]);

  // Predict churn risk with Gemini
  const predictCustomerRisk = useCallback(async (customerId: string): Promise<Customer> => {
    const updated = await apiService.predictChurn(customerId);
    setCustomers(prev => prev.map(c => (c.id === customerId || c.customerId === customerId ? updated : c)));
    return updated;
  }, []);

  // Recommend retention playbook
  const recommendRetention = useCallback(async (customerId: string): Promise<Customer> => {
    const updated = await apiService.recommendRetention(customerId);
    setCustomers(prev => prev.map(c => (c.id === customerId || c.customerId === customerId ? updated : c)));
    return updated;
  }, []);

  // Batch score all customers
  const batchScoreCustomers = useCallback(async () => {
    const res = await apiService.batchAnalyze();
    await refreshCustomerData();
    return res;
  }, [refreshCustomerData]);

  // Derived Selectors (Canonical Dataset Single Source of Truth)
  const totalCustomers = useMemo(() => getTotalCustomers(customers), [customers]);
  const totalMRR = useMemo(() => getTotalMRR(customers), [customers]);
  const riskDistribution = useMemo(() => getRiskDistribution(customers), [customers]);
  const highRiskCustomers = useMemo(() => getHighRiskCustomers(customers), [customers]);
  const mediumRiskCustomers = useMemo(() => getMediumRiskCustomers(customers), [customers]);
  const lowRiskCustomers = useMemo(() => getLowRiskCustomers(customers), [customers]);
  const mrrAtRisk = useMemo(() => getMRRAtRisk(customers), [customers]);
  const highRiskMRR = useMemo(() => getHighRiskMRR(customers), [customers]);
  const mediumRiskMRR = useMemo(() => getMediumRiskMRR(customers), [customers]);
  const averageRiskScore = useMemo(() => getAverageRiskScore(customers), [customers]);
  const customersNeedingAction = useMemo(() => getCustomersNeedingAction(customers), [customers]);
  const topRiskAccounts = useMemo(() => getTopRiskAccounts(customers, 10), [customers]);
  const planDistribution = useMemo(() => getPlanDistribution(customers), [customers]);
  const paymentStatusDistribution = useMemo(() => getPaymentStatusDistribution(customers), [customers]);
  const upcomingRenewals = useMemo(() => getUpcomingRenewals(customers, 30), [customers]);
  
  const getROIWithConfig = useCallback((config?: Partial<ROIConfig>) => {
    return getROIInsights(customers, config);
  }, [customers]);

  const roiInsights = useMemo(() => getROIInsights(customers), [customers]);

  const contextValue: CustomerContextValue = {
    customers,
    loading,
    error,
    importHistory,
    lastDeletedBatch,
    importCustomers,
    deleteCustomer,
    deleteCustomers,
    clearDemoData,
    loadDemoData,
    restoreDeletedCustomers,
    undoLastDelete,
    clearImportHistory,
    refreshCustomerData,
    markCustomerSaved,
    recordOutcome,
    predictCustomerRisk,
    recommendRetention,
    batchScoreCustomers,
    totalCustomers,
    totalMRR,
    riskDistribution,
    highRiskCustomers,
    mediumRiskCustomers,
    lowRiskCustomers,
    mrrAtRisk,
    highRiskMRR,
    mediumRiskMRR,
    averageRiskScore,
    customersNeedingAction,
    topRiskAccounts,
    planDistribution,
    paymentStatusDistribution,
    upcomingRenewals,
    getROIWithConfig,
    roiInsights
  };

  return (
    <CustomerContext.Provider value={contextValue}>
      {children}
    </CustomerContext.Provider>
  );
};

export function useCustomerStore(): CustomerContextValue {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomerStore must be used within a CustomerProvider');
  }
  return context;
}
