import React, { useState } from 'react';
import {
  Users,
  AlertTriangle,
  Flame,
  Clock,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  CreditCard
} from 'lucide-react';
import { Customer, UserProfile } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { CustomerTableView } from './CustomerTableView';
import { TrialVerificationModal } from './TrialVerificationModal';
import {
  getTotalMRR,
  getAverageRiskScore,
  getHighRiskMRR,
  getMRRAtRisk,
  getROIInsights,
  getRiskDistribution
} from '../utils/customerSelectors';

interface DashboardViewProps {
  customers: Customer[];
  allCustomers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onLimitChange: (l: number) => void;
  onSearchChange: (s: string) => void;
  searchValue: string;
  onFilterChange: (key: string, value: string) => void;
  filters: {
    riskLevel: string;
    mrrRange: string;
    plan: string;
    factor: string;
  };
  onSortChange: (sortBy: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSelectCustomer: (cust: Customer) => void;
  onBatchAnalyze: () => void;
  isBatchAnalyzing: boolean;
  onMarkSaved: (id: string) => void;
  onNavigate: (view: string, params?: Record<string, string>) => void;
  currentUser?: UserProfile | null;
  onDeleteCustomer?: (id: string) => Promise<boolean> | void;
  onDeleteCustomers?: (ids: string[]) => Promise<boolean> | void;
  onClearDemoData?: () => Promise<number> | void;
  onUndoDelete?: () => Promise<boolean> | void;
  lastDeletedBatch?: { id: string; customers: Customer[]; timestamp: string } | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  customers,
  allCustomers,
  total,
  page,
  limit,
  totalPages,
  onPageChange,
  onLimitChange,
  onSearchChange,
  searchValue,
  onFilterChange,
  filters,
  onSortChange,
  sortBy,
  sortOrder,
  onSelectCustomer,
  onBatchAnalyze,
  isBatchAnalyzing,
  onMarkSaved,
  onNavigate,
  currentUser,
  onDeleteCustomer,
  onDeleteCustomers,
  onClearDemoData,
  onUndoDelete,
  lastDeletedBatch
}) => {
  // Aggregate Metrics strictly from canonical dataset
  const totalMrr = getTotalMRR(allCustomers);
  const avgChurnScore = getAverageRiskScore(allCustomers);
  const atRiskCustomers = allCustomers.filter((c) => (c.risk_score ?? c.riskScore) >= 60 && c.status !== 'saved');
  const atRiskMrr = getMRRAtRisk(allCustomers);

  const criticalCustomers = allCustomers.filter((c) => (c.risk_score ?? c.riskScore) >= 80 && c.status !== 'saved');
  const criticalMrr = getHighRiskMRR(allCustomers);

  // Predicted Churn 30 Days MRR Loss
  const predictedChurn30Mrr = Math.round(
    allCustomers.reduce((acc, c) => {
      if (c.status === 'saved' || c.outcomeStatus === 'recovered') return acc;
      const prob = (c.churnProbability?.day30 ?? ((c.risk_score ?? c.riskScore) * 0.8)) / 100;
      return acc + (c.mrr || 0) * prob;
    }, 0)
  );

  // Saved MRR this month strictly from real saved accounts
  const savedCustomers = allCustomers.filter((c) => c.status === 'saved' || c.outcomeStatus === 'recovered');
  const savedMrr = Math.round(savedCustomers.reduce((acc, c) => acc + (c.mrrProtected ?? c.mrr ?? 0), 0));
  const subscriptionCost = 299; // Growth plan
  const roiMultiplier = savedMrr > 0 ? Math.round((savedMrr / subscriptionCost) * 10) / 10 : 0;

  // ROI projection from live model
  const projectedRoi = getROIInsights(allCustomers, { monthlyCost: subscriptionCost });

  // Urgent top customer
  const topCritical = criticalCustomers[0] || allCustomers[0];

  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  // Billing status checks
  const isPendingVerification = currentUser?.billingStatus === 'pending_payment';
  const isTrialEnded = currentUser?.billingStatus === 'trial_ended' || currentUser?.billingStatus === 'expired';
  const isTrialing = currentUser?.billingStatus === 'trialing' || (!currentUser?.billingStatus && currentUser?.selectedPlan);

  const currentTier = (currentUser?.plan?.toLowerCase() || currentUser?.selectedPlan || 'growth') as 'starter' | 'growth' | 'pro';
  const currentCycle = (currentUser?.billingCycle || 'monthly') as 'monthly' | 'annual';

  const formattedTrialEndDate = currentUser?.trialEndDate
    ? new Date(currentUser.trialEndDate).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : new Date(Date.now() + 14 * 86400000).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

  const hasPaymentMethod =
    currentUser?.paymentStatus === 'paid' ||
    currentUser?.paymentStatus === 'active' ||
    Boolean(currentUser?.cardLast4);

  return (
    <div className="space-y-6">
      {/* 1. Pending Verification Alert Banner (Action Required) */}
      {isPendingVerification && (
        <div
          id="dashboard-pending-verification-banner"
          className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm transition-all"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-md">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-800" />
                  Verification Required
                </span>
                <span className="text-xs font-semibold text-amber-800">
                  Plan: {currentTier.toUpperCase()} ({currentCycle})
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-amber-950 leading-snug">
                Complete $1.00 Verification to Start Your 14-Day Free Trial
              </h2>
              <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                A $1.00 refundable/authorization charge verifies your payment method and prevents fraudulent signups. 
                <strong> You will not be billed the full plan price until day 14.</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                id="dashboard-verify-trial-btn"
                onClick={() => setVerificationModalOpen(true)}
                className="px-4 py-2.5 bg-[#1E3A8A] hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CreditCard className="w-4 h-4 text-emerald-300" />
                <span>Verify Card with $1 & Activate Trial</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('pricing')}
                className="px-3.5 py-2.5 bg-white hover:bg-gray-50 text-amber-950 border border-amber-300 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Change Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Trial Ended Alert Banner (Option A: Manual Activation Required) */}
      {isTrialEnded && (
        <div
          id="dashboard-trial-ended-banner"
          className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 shadow-sm transition-all"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-red-900 bg-red-200/80 px-2.5 py-0.5 rounded-md">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-800" />
                  Trial Ended
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-red-950 leading-snug">
                Your 14-Day Free Trial Has Ended
              </h2>
              <p className="text-xs text-red-800 leading-relaxed max-w-2xl">
                In accordance with our user-first policy (Option A), your card was not charged automatically. 
                Activate your subscription now to restore automated churn playbooks and daily account health monitoring.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                id="dashboard-activate-sub-btn"
                onClick={() => onNavigate('settings/billing')}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CreditCard className="w-4 h-4" />
                <span>Activate Subscription</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Active 14-Day Free Trial Banner */}
      {isTrialing && !isPendingVerification && !isTrialEnded && (
        <div
          id="dashboard-trial-banner"
          className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-50 border border-blue-200/90 rounded-2xl p-5 shadow-xs transition-all"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              {/* Badges / Labels */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-blue-900 bg-blue-100/80 px-2.5 py-0.5 rounded-md border border-blue-200">
                  <Sparkles className="w-3 h-3 text-blue-700" />
                  {currentTier.toUpperCase()} Plan
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  <Clock className="w-3 h-3 text-emerald-700" />
                  14-day free trial active
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-900 bg-blue-100/90 px-2.5 py-0.5 rounded-md border border-blue-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  $1 Card Verified
                </span>
              </div>

              {/* Banner Text */}
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                  14-Day Free Trial Active • {currentTier.toUpperCase()} Plan
                </h2>
                <p className="text-xs text-gray-600 mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-emerald-800">No charges will be made during your trial.</span>
                  <span className="text-gray-400">•</span>
                  <span>
                    Trial concludes on <strong className="text-gray-900 font-semibold">{formattedTrialEndDate}</strong>.
                    (Option A: manual activation required at trial end).
                  </span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                id="trial-manage-billing-btn"
                onClick={() => onNavigate('settings/billing')}
                className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Manage Billing</span>
              </button>

              <button
                type="button"
                id="trial-upgrade-plan-btn"
                onClick={() => onNavigate('pricing')}
                className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Switch Plan</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 4 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Customers & Total MRR */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Total Monitored Customers
            </span>
            <div className="text-2xl font-extrabold text-gray-900 mt-1">
              {allCustomers.length}
            </div>
            <div className="text-xs text-gray-700 mt-1 font-medium">
              Total MRR: <strong>{formatCurrency(totalMrr)}</strong>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Average Churn Score */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
              Average Churn Score
            </span>
            <div className="text-2xl font-extrabold text-blue-900 mt-1 flex items-baseline gap-1.5">
              <span>{avgChurnScore}</span>
              <span className="text-xs font-semibold text-gray-700">/ 100</span>
            </div>
            <div className="text-xs text-blue-800 mt-1 font-medium">
              Portfolio Health: <strong>{avgChurnScore < 40 ? 'Healthy' : avgChurnScore < 60 ? 'Moderate' : 'High Alert'}</strong>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: At-Risk Today (Score 61+) & At-Risk MRR */}
        <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-orange-800 uppercase tracking-wider">
              At-Risk Accounts (61+)
            </span>
            <div className="text-2xl font-extrabold text-orange-600 mt-1">
              {atRiskCustomers.length}
            </div>
            <div className="text-xs text-orange-700 mt-1 font-medium">
              At-Risk MRR: <strong>{formatCurrency(atRiskMrr)}</strong>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Critical Risk & Immediate Churn */}
        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-red-800 uppercase tracking-wider">
              Critical Risk (Score 86+)
            </span>
            <div className="text-2xl font-extrabold text-red-600 mt-1">
              {criticalCustomers.length}
            </div>
            <div className="text-xs text-red-700 mt-1 font-medium">
              Immediate Churn: <strong>{formatCurrency(criticalMrr)}</strong>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ROI Showcase Card */}
      <div className="bg-linear-to-r from-blue-900 to-blue-950 rounded-xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-700/20 to-transparent pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Verified SaaS Retention ROI
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white font-mono tabular-nums">
              {savedMrr > 0
                ? `${formatCurrency(savedMrr)} MRR saved this month · ${roiMultiplier}x ROI`
                : `${formatCurrency(projectedRoi.estimatedRecoveredMrr)} Projected Recoverable MRR · ${projectedRoi.multiplier}x ROI`}
            </h3>
            <p className="text-xs text-blue-200 leading-relaxed">
              {savedMrr > 0
                ? `Realized value from ${savedCustomers.length} saved customer account${savedCustomers.length > 1 ? 's' : ''} against your $299/mo subscription. Net ARR protected: ${formatCurrency(savedMrr * 12)} / yr.`
                : `Based on saving 20% of high-risk & 10% of medium-risk accounts from your active portfolio. Net projected gain: ${formatCurrency(projectedRoi.annualNetGain)} / yr.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('roi')}
              className="px-4 py-2 rounded-lg bg-white text-blue-950 text-xs font-bold hover:bg-blue-50 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              Open ROI Calculator & PDF Report <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigate('playbooks')}
              className="px-4 py-2 rounded-lg bg-blue-800/80 hover:bg-blue-800 text-white border border-blue-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              View {atRiskCustomers.length} At-Risk Playbooks
            </button>
          </div>
        </div>
      </div>

      {/* Critical Highlight Banner (e.g. top critical customer) */}
      {topCritical && (
        <div className="bg-red-50/90 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-red-950">Urgent Intervention Required: {topCritical.company_name || topCritical.name}</span>
                <span className="text-[11px] font-bold bg-red-600 text-white px-2 py-0.2 rounded-full font-mono tabular-nums">
                  Score {topCritical.risk_score ?? topCritical.riskScore}
                </span>
                <span className="text-xs font-semibold text-red-900 font-mono tabular-nums">{formatCurrency(topCritical.mrr)} MRR</span>
              </div>
              <p className="text-xs text-red-800 mt-0.5">
                {topCritical.topFactors?.[0]?.factor || topCritical.risk_reason || 'Inactivity or risk indicators flagged.'} Churn probability in 30 days: <strong>{topCritical.churnProbability?.day30 ?? Math.round((topCritical.riskScore || 50) * 0.8)}%</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={() => onSelectCustomer(topCritical)}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-xs cursor-pointer"
          >
            Review Playbook & Send Script →
          </button>
        </div>
      )}

      {/* Full Customer Retention Pipeline Table */}
      <CustomerTableView
        customers={customers}
        total={total}
        page={page}
        limit={limit}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
        onSearchChange={onSearchChange}
        searchValue={searchValue}
        onFilterChange={onFilterChange}
        filters={filters}
        onSortChange={onSortChange}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSelectCustomer={onSelectCustomer}
        onBatchAnalyze={onBatchAnalyze}
        isBatchAnalyzing={isBatchAnalyzing}
        onMarkSaved={onMarkSaved}
        onDeleteCustomer={onDeleteCustomer}
        onDeleteCustomers={onDeleteCustomers}
        onClearDemoData={onClearDemoData}
        onUndoDelete={onUndoDelete}
        lastDeletedBatch={lastDeletedBatch}
      />

      {/* Trial Verification Modal */}
      <TrialVerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        tier={currentTier}
        billingCycle={currentCycle}
        onSuccess={(result) => {
          if (currentUser) {
            currentUser.billingStatus = 'trialing';
            currentUser.trialEndDate = result.trialEndDate;
          }
          window.location.reload();
        }}
      />
    </div>
  );
};
