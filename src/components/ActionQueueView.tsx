import React, { useState, useMemo } from 'react';
import { Customer, CustomerRetentionAction, ChurnReasonType } from '../types';
import {
  calculatePriorityScore,
  calculateUrgencyMultiplier,
  calculateHealthPillars
} from '../utils/retentionEngine';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { HealthPillarsCard } from './HealthPillarsCard';
import { QuickEmailModal } from './QuickEmailModal';
import { RecordOutcomeModal } from './RecordOutcomeModal';
import {
  Flame,
  AlertTriangle,
  Clock,
  Send,
  Mail,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Building2,
  Calendar,
  Sparkles,
  Info,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Check,
  RefreshCw
} from 'lucide-react';

interface ActionQueueViewProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onUpdateCustomerStatus?: (customerId: string, status: 'active' | 'saved' | 'churned') => void;
  onRecordOutcome: (data: {
    customerId: string;
    status: 'recovered' | 'churned';
    mrrProtected?: number;
    churnReason?: ChurnReasonType;
    churnNotes?: string;
    interventionUsed?: string;
    competitorName?: string;
  }) => void;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
  onNavigate?: (view: string) => void;
}

export const ActionQueueView: React.FC<ActionQueueViewProps> = ({
  customers,
  onSelectCustomer,
  onUpdateCustomerStatus,
  onRecordOutcome,
  onShowToast,
  onNavigate
}) => {
  // Local state
  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'recovered' | 'churned'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [expandedPillarsId, setExpandedPillarsId] = useState<string | null>(null);

  // Modals state
  const [emailModalCustomer, setEmailModalCustomer] = useState<Customer | null>(null);
  const [outcomeModalData, setOutcomeModalData] = useState<{
    customer: Customer;
    mode: 'recovered' | 'churned';
  } | null>(null);

  // Local map to track in-memory action statuses if not yet persisted in customer object
  const [statusOverrides, setStatusOverrides] = useState<Record<string, 'pending' | 'in_progress' | 'recovered' | 'churned'>>({});

  // Rank customers using priority formula
  const rankedItems = useMemo(() => {
    return customers.map((c) => {
      const priorityScore = calculatePriorityScore(c);
      const urgencyInfo = calculateUrgencyMultiplier(c);
      const currentStatus =
        statusOverrides[c.id] ||
        (c.status === 'saved' ? 'recovered' : c.status === 'churned' ? 'churned' : 'pending');

      return {
        customer: c,
        priorityScore,
        urgencyMultiplier: urgencyInfo.multiplier,
        urgencyReason: urgencyInfo.reason,
        status: currentStatus
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [customers, statusOverrides]);

  // Filter items based on active tab and dropdown filters
  const filteredItems = useMemo(() => {
    return rankedItems.filter((item) => {
      // Tab filter
      if (activeTab === 'pending' && item.status !== 'pending') return false;
      if (activeTab === 'in_progress' && item.status !== 'in_progress') return false;
      if (activeTab === 'recovered' && item.status !== 'recovered') return false;
      if (activeTab === 'churned' && item.status !== 'churned') return false;

      // Plan filter
      if (selectedPlan !== 'all' && item.customer.plan.toLowerCase() !== selectedPlan.toLowerCase()) {
        return false;
      }

      // Urgency filter
      if (selectedUrgency === 'renewal' && (item.customer.renewalDaysLeft || 999) > 30) return false;
      if (selectedUrgency === 'payment' && !['Failed', 'Retried', 'Disputed'].includes(item.customer.paymentStatus)) return false;
      if (selectedUrgency === 'inactive' && (item.customer.lastLoginDays || 0) <= 21) return false;

      // Owner filter
      if (selectedOwner !== 'all' && item.customer.owner !== selectedOwner) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.customer.name.toLowerCase().includes(q);
        const matchAdmin = (item.customer.adminName || '').toLowerCase().includes(q);
        const matchCity = (item.customer.companyCity || '').toLowerCase().includes(q);
        const matchAction = (item.customer.recommendedAction || '').toLowerCase().includes(q);
        if (!matchName && !matchAdmin && !matchCity && !matchAction) return false;
      }

      return true;
    });
  }, [rankedItems, activeTab, selectedPlan, selectedUrgency, selectedOwner, searchQuery]);

  // Summary Metrics for top banner
  const pendingCount = rankedItems.filter((i) => i.status === 'pending').length;
  const inProgressCount = rankedItems.filter((i) => i.status === 'in_progress').length;
  const recoveredCount = rankedItems.filter((i) => i.status === 'recovered').length;
  const churnedCount = rankedItems.filter((i) => i.status === 'churned').length;

  const totalAtRiskMrr = rankedItems
    .filter((i) => i.status === 'pending' || i.status === 'in_progress')
    .reduce((acc, curr) => acc + curr.customer.mrr, 0);

  const totalRecoveredMrr = rankedItems
    .filter((i) => i.status === 'recovered')
    .reduce((acc, curr) => acc + (curr.customer.mrrProtected ?? curr.customer.mrr ?? 0), 0);

  const handleMarkContacted = (customerId: string) => {
    setStatusOverrides((prev) => ({ ...prev, [customerId]: 'in_progress' }));
  };

  const handleFalseAlert = (customerId: string) => {
    // Demote risk score by 35 points
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      cust.riskScore = Math.max(5, cust.riskScore - 35);
      setStatusOverrides((prev) => ({ ...prev, [customerId]: 'recovered' }));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner: Formula & Metrics */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white rounded-2xl p-6 shadow-md border border-blue-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-full bg-blue-700/60 text-blue-200 border border-blue-400/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                Revenue-Prioritized Action Queue
              </div>
              <span className="text-xs text-blue-200 font-medium">Updated 4m ago</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Today's High-Impact Retention Actions
            </h1>
            <p className="text-xs text-blue-200/90 max-w-2xl leading-relaxed">
              Every customer is ranked using the dynamic priority algorithm:{' '}
              <code className="bg-blue-950/80 px-2 py-0.5 rounded text-amber-300 font-mono font-bold">
                Priority = Risk Score × MRR Weight × Urgency Multiplier
              </code>
              . Focus your customer success effort on the accounts that safeguard the highest recurring revenue.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-950/60 p-3 rounded-xl border border-blue-700/40">
            <div className="text-center p-2">
              <span className="text-[10px] uppercase font-bold text-blue-300 block">At-Risk MRR Today</span>
              <span className="text-lg font-black text-amber-300">{formatCurrency(totalAtRiskMrr)}</span>
            </div>
            <div className="text-center p-2 border-l border-blue-800">
              <span className="text-[10px] uppercase font-bold text-blue-300 block">Urgent Actions</span>
              <span className="text-lg font-black text-white">{pendingCount}</span>
            </div>
            <div className="text-center p-2 border-l border-blue-800">
              <span className="text-[10px] uppercase font-bold text-blue-300 block">In Progress</span>
              <span className="text-lg font-black text-blue-200">{inProgressCount}</span>
            </div>
            <div className="text-center p-2 border-l border-blue-800">
              <span className="text-[10px] uppercase font-bold text-blue-300 block">Saved MRR (MoM)</span>
              <span className="text-lg font-black text-emerald-300">+{formatCurrency(totalRecoveredMrr)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Filters Control Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-white text-blue-950 shadow-xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Active Queue ({pendingCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('in_progress')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'in_progress'
                  ? 'bg-white text-blue-950 shadow-xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Contacted ({inProgressCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('recovered')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'recovered'
                  ? 'bg-white text-emerald-950 shadow-xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rescued ($ Saved) ({recoveredCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('churned')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'churned'
                  ? 'bg-white text-red-950 shadow-xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 text-red-600" />
              <span>Churned Post-Mortems ({churnedCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search company, admin, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-gray-500 font-semibold">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span>Filter by:</span>
          </div>

          {/* Plan filter */}
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Plans</option>
            <option value="enterprise">Enterprise</option>
            <option value="growth">Growth</option>
            <option value="starter">Starter</option>
          </select>

          {/* Urgency Trigger */}
          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Urgency Triggers</option>
            <option value="renewal">Contract Renewal &lt; 30 Days</option>
            <option value="payment">Razorpay Payment Failed / Retried</option>
            <option value="inactive">User Inactive &gt; 21 Days</option>
          </select>

          {/* Owner Filter */}
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Account Owners</option>
            <option value="Alex Vance (Founder)">Alex Vance (Founder)</option>
            <option value="Elena Rostova">Elena Rostova (CS Lead)</option>
          </select>

          {(selectedPlan !== 'all' || selectedUrgency !== 'all' || selectedOwner !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedPlan('all');
                setSelectedUrgency('all');
                setSelectedOwner('all');
                setSearchQuery('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Action Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-28">Priority</th>
                <th className="py-3 px-4">Customer Account</th>
                <th className="py-3 px-4">Plan & MRR</th>
                <th className="py-3 px-4">Risk & 5 Pillars</th>
                <th className="py-3 px-4 max-w-xs">Primary Driver</th>
                <th className="py-3 px-4 max-w-sm">Recommended Action</th>
                <th className="py-3 px-4 text-right">Execute Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <h4 className="font-bold text-gray-800 text-sm">No accounts match this filter</h4>
                      <p className="text-xs text-gray-500">
                        Try resetting your search query or selecting a different status tab.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const c = item.customer;
                  const isExpanded = expandedPillarsId === c.id;

                  return (
                    <React.Fragment key={c.id}>
                      <tr className="hover:bg-blue-50/30 transition-colors">
                        {/* Priority Rank & Score Pill */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black text-xs bg-red-100 text-red-800 border border-red-200 w-fit">
                              P{index + 1} • {item.priorityScore}
                            </span>
                            <span className="text-[10px] text-gray-500 font-semibold">
                              Urgency: <strong className="text-gray-900">{item.urgencyMultiplier}x</strong>
                            </span>
                          </div>
                        </td>

                        {/* Customer Info */}
                        <td className="py-3.5 px-4 align-top">
                          <div>
                            <button
                              onClick={() => onSelectCustomer(c)}
                              className="font-bold text-gray-900 hover:text-blue-600 text-sm transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>{c.name}</span>
                              {c.companyCity && (
                                <span className="text-[10px] font-medium text-gray-400">
                                  ({c.companyCity})
                                </span>
                              )}
                            </button>
                            <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                              <span>Admin: <strong>{c.adminName || c.email}</strong></span>
                              <span>•</span>
                              <span className="text-gray-400">{c.companyDomain}</span>
                            </div>
                            <div className="text-[10px] text-gray-600 mt-0.5">
                              Owner: {c.owner || 'Alex Vance (Founder)'}
                            </div>
                          </div>
                        </td>

                        {/* Plan & MRR */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-gray-900 text-xs">
                              {formatCurrency(c.mrr)} <span className="text-[10px] text-gray-500 font-normal">/mo</span>
                            </div>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                              {c.plan}
                            </span>
                            {c.renewalDaysLeft && (
                              <div className="text-[10px] text-amber-700 font-medium">
                                Renews in {c.renewalDaysLeft}d
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Risk Score & 5 Pillars Toggle */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  c.riskScore > 75
                                    ? 'bg-red-500'
                                    : c.riskScore > 50
                                    ? 'bg-orange-500'
                                    : 'bg-emerald-500'
                                }`}
                              />
                              <span className="font-black text-gray-900 text-xs">
                                {c.riskScore}/100
                              </span>
                              <span className="text-[10px] text-gray-500 font-medium">
                                ({c.riskCategory})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setExpandedPillarsId(isExpanded ? null : c.id)}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide Pillars' : 'View 5 Pillars'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Primary Driver */}
                        <td className="py-3.5 px-4 align-top max-w-xs">
                          <p className="text-[11px] text-gray-700 line-clamp-2">
                            {c.topFactors?.[0]?.factor || item.urgencyReason}
                          </p>
                          <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1">
                            {item.urgencyReason}
                          </span>
                        </td>

                        {/* Recommended Action */}
                        <td className="py-3.5 px-4 align-top max-w-sm">
                          <p className="text-[11px] font-medium text-gray-800 line-clamp-2">
                            {c.recommendedAction || 'Schedule executive check-in to verify system performance.'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Recovery: {c.retentionRecommendation?.recoveryProbability || 45}%
                            </span>
                            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5 text-gray-400" />
                              {c.retentionRecommendation?.effortMinutes || 20}m
                            </span>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            {/* Primary Action Button */}
                            <button
                              type="button"
                              onClick={() => setEmailModalCustomer(c)}
                              className="px-2.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Contact Today</span>
                            </button>

                            {/* Secondary Action row */}
                            <div className="flex items-center gap-1">
                              {item.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkContacted(c.id)}
                                  className="px-2 py-1 text-[11px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
                                  title="Mark outreach sent"
                                >
                                  Contacted
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setOutcomeModalData({ customer: c, mode: 'recovered' })}
                                className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer flex items-center gap-0.5"
                                title="Record successful customer recovery and saved MRR"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Recovered</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setOutcomeModalData({ customer: c, mode: 'churned' })}
                                className="px-2 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors cursor-pointer"
                                title="Record churn outcome and cancellation reason"
                              >
                                Churned
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleFalseAlert(c.id)}
                              className="text-[10px] text-gray-600 hover:text-gray-700 underline cursor-pointer"
                            >
                              Flag as False Alert
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable 5-Pillar Health Card */}
                      {isExpanded && (
                        <tr className="bg-gray-50/60 border-b border-gray-200">
                          <td colSpan={7} className="p-4">
                            <HealthPillarsCard customer={c} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Email Modal */}
      {emailModalCustomer && (
        <QuickEmailModal
          customer={emailModalCustomer}
          onClose={() => setEmailModalCustomer(null)}
          onMarkContacted={handleMarkContacted}
        />
      )}

      {/* Record Outcome Modal */}
      {outcomeModalData && (
        <RecordOutcomeModal
          customer={outcomeModalData.customer}
          mode={outcomeModalData.mode}
          onClose={() => setOutcomeModalData(null)}
          onSaveOutcome={onRecordOutcome}
        />
      )}
    </div>
  );
};
