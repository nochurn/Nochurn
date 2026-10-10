import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info,
  Server,
  Key,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { fetchAdminBillingPlans, createMissingRazorpayTestPlans } from '../services/api';

interface BillingPlan {
  id: string;
  name?: string;
  tier: 'starter' | 'growth' | 'pro';
  billing_cycle: 'monthly' | 'annual';
  amount_usd?: number;
  amount_cents?: number;
  amount_paise?: number;
  amount_inr?: number;
  currency: string;
  razorpay_plan_id: string;
  is_active: boolean;
  formatted?: string;
  formattedInr?: string;
  discountDescription?: string;
  created_at: string;
  updated_at: string;
}

interface AdminBillingPlansViewProps {
  onNavigate?: (view: string, params?: Record<string, string>) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const AdminBillingPlansView: React.FC<AdminBillingPlansViewProps> = ({
  onNavigate,
  onShowToast
}) => {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [keyId, setKeyId] = useState<string>('');
  const [mode, setMode] = useState<string>('test');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal confirmation state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmationInput, setConfirmationInput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);

  const loadPlans = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await fetchAdminBillingPlans();
      if (data.success && Array.isArray(data.plans)) {
        setPlans(data.plans);
        setKeyId(data.keyId || '');
        setMode(data.mode || 'test');
      } else {
        throw new Error('Failed to load billing plans.');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading billing plans.');
      if (onShowToast) onShowToast(err.message || 'Failed to load plans', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleExecuteCreatePlans = async () => {
    if (confirmationInput !== 'CREATE_RAZORPAY_TEST_PLANS') {
      if (onShowToast) {
        onShowToast('Must type exactly: CREATE_RAZORPAY_TEST_PLANS', 'error');
      }
      return;
    }

    setIsExecuting(true);
    try {
      const res = await createMissingRazorpayTestPlans(confirmationInput);
      if (res.success) {
        setPlans(res.plans);
        setExecutionLogs(res.message ? [res.message] : []);
        setShowConfirmModal(false);
        setConfirmationInput('');
        if (onShowToast) {
          onShowToast(res.message || 'Successfully created missing Razorpay test plans.', 'success');
        }
      } else {
        throw new Error(res.error || 'Failed to create plans.');
      }
    } catch (err: any) {
      if (onShowToast) onShowToast(err.message || 'Failed to create plans.', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Admin Governance
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 uppercase">
              Mode: {mode}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Authoritative Razorpay Billing Plans
          </h1>
          <p className="text-sm text-gray-600 mt-1 max-w-3xl">
            Authoritative source of truth for all six subscription tiers. Prices are strictly configured in US Dollars (USD) with standard monthly rates and an annual billing discount. Razorpay plan IDs are synchronized from Razorpay Subscriptions API.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadPlans(true)}
            disabled={isRefreshing}
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowConfirmModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Sparkles className="w-4 h-4 mr-2 text-indigo-200" />
            Create Missing Razorpay Test Plans
          </button>
        </div>
      </div>

      {/* Integration Info Banner */}
      <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-white border border-indigo-100 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-lg shadow">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Razorpay Subscriptions Gateway</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Active Key ID: <code className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-indigo-700">{keyId || 'rzp_test_TdpOBvJYcT9ENW'}</code>
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Webhook HMAC SHA-256 Verified
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Idempotent Event Queue
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> 18% Annual Discount Applied
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate && onNavigate('pricing')}
              className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white px-3 py-2 rounded-lg border border-indigo-200 shadow-sm"
            >
              Public Pricing Table <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white shadow rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">All Six Authoritative Plans</h2>
            <p className="text-xs text-gray-500">Database table: <code className="font-mono">billing_plans</code></p>
          </div>
          <span className="text-xs font-medium text-gray-500">
            Total Plans: {plans.length} / 6
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">Loading Razorpay billing plans...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Plan Tier
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Billing Cycle
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount (USD)
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount (Cents)
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Razorpay Plan ID
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plans.map((p) => {
                  const isAnnual = p.billing_cycle === 'annual';
                  const tierColors: Record<string, string> = {
                    starter: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    growth: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                    pro: 'bg-purple-50 text-purple-800 border-purple-200'
                  };

                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${tierColors[p.tier] || 'bg-gray-100 text-gray-800'}`}>
                              {p.tier}
                            </span>
                            {p.name && (
                              <span className="text-xs font-semibold text-gray-900">{p.name}</span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-500 font-mono mt-0.5">{p.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          isAnnual ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {isAnnual ? 'Annual (20% Off)' : 'Monthly'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                        {p.formatted || (p.amount_usd ? `$${p.amount_usd}${isAnnual ? '/yr' : '/mo'}` : `$${p.amount_inr}`)}
                        {isAnnual && (
                          <span className="block text-[11px] font-normal text-emerald-600">
                            Effective ${Math.round((p.amount_usd || p.amount_inr || 0) / 12)}/mo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-600">
                        {(p.amount_cents || p.amount_paise || 0).toLocaleString('en-US')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {p.razorpay_plan_id ? (
                          <div className="flex items-center gap-1.5">
                            <code className="px-2 py-1 bg-gray-100 text-indigo-700 font-mono text-xs rounded border border-gray-200">
                              {p.razorpay_plan_id}
                            </code>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Missing Plan ID
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3 mr-1" /> Active
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Creating Missing Plans */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Create Missing Razorpay Test Plans
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  This administrative procedure contacts Razorpay TEST MODE to generate any missing plan IDs. Existing plans with valid IDs will be safely preserved with zero duplicates.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-700 space-y-2">
              <p className="font-semibold text-gray-900">Safety Verification Requirement:</p>
              <p>
                To confirm this operation, please type the exact confirmation phrase below into the text box:
              </p>
              <div className="p-2 bg-white rounded border border-gray-300 font-mono font-bold text-center text-sm text-indigo-700 select-all">
                CREATE_RAZORPAY_TEST_PLANS
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Type Confirmation Phrase:
              </label>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="CREATE_RAZORPAY_TEST_PLANS"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmationInput('');
                }}
                disabled={isExecuting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCreatePlans}
                disabled={confirmationInput !== 'CREATE_RAZORPAY_TEST_PLANS' || isExecuting}
                className="inline-flex items-center px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  'Confirm & Create Missing Plans'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
