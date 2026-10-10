import React, { useState, useMemo } from 'react';
import { Customer, ChurnReasonType } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Award,
  Sparkles,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  BarChart3,
  Layers,
  ArrowUpRight,
  HelpCircle,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

interface ClosedLoopLearningViewProps {
  customers: Customer[];
  onSelectCustomer?: (customer: Customer) => void;
  onRecordOutcome?: (data: {
    customerId: string;
    status: 'recovered' | 'churned';
    churnReason?: ChurnReasonType;
    churnReasonDetail?: string;
    rescuePlaybookUsed?: string;
    mrrProtected?: number;
    notes?: string;
  }) => void;
}

export const ClosedLoopLearningView: React.FC<ClosedLoopLearningViewProps> = ({
  customers,
  onSelectCustomer,
  onRecordOutcome
}) => {
  // Live outcomes computed directly from canonical customer store
  const rescuedCustomers = useMemo(() => {
    return customers.filter(c => c.status === 'saved' || c.outcomeStatus === 'recovered');
  }, [customers]);

  const churnedCustomers = useMemo(() => {
    return customers.filter(c => c.status === 'churned' || c.outcomeStatus === 'churned');
  }, [customers]);

  const totalRescued = rescuedCustomers.length;
  const totalChurned = churnedCustomers.length;
  const totalDecided = totalRescued + totalChurned;

  const totalSavedMrr = useMemo(() => {
    return Math.round(rescuedCustomers.reduce((acc, c) => acc + (c.mrrProtected ?? c.mrr ?? 0), 0));
  }, [rescuedCustomers]);

  const totalLostMrr = useMemo(() => {
    return Math.round(churnedCustomers.reduce((acc, c) => acc + (c.mrr || 0), 0));
  }, [churnedCustomers]);

  const winRate = totalDecided > 0 ? Math.round((totalRescued / totalDecided) * 100) : 0;

  // Root cause breakdown from live churned/saved customers
  const reasonMap: Record<string, { count: number; lostMrr: number }> = {};
  churnedCustomers.forEach(c => {
    const reason = c.churnReason || c.risk_reason || 'Product value perception gap';
    if (!reasonMap[reason]) {
      reasonMap[reason] = { count: 0, lostMrr: 0 };
    }
    reasonMap[reason].count += 1;
    reasonMap[reason].lostMrr += c.mrr || 0;
  });

  const sortedReasons = Object.entries(reasonMap)
    .map(([reason, stats]) => ({ reason, ...stats }))
    .sort((a, b) => b.lostMrr - a.lostMrr);

  // Playbook effectiveness breakdown
  const playbookMap: Record<string, { count: number; protectedMrr: number }> = {};
  rescuedCustomers.forEach(c => {
    const pb = c.rescuePlaybookUsed || c.recommendedAction || c.recommended_action || 'Executive Check-In & Value Alignment';
    if (!playbookMap[pb]) {
      playbookMap[pb] = { count: 0, protectedMrr: 0 };
    }
    playbookMap[pb].count += 1;
    playbookMap[pb].protectedMrr += c.mrrProtected ?? c.mrr ?? 0;
  });

  const sortedPlaybooks = Object.entries(playbookMap)
    .map(([playbook, stats]) => ({ playbook, ...stats }))
    .sort((a, b) => b.protectedMrr - a.protectedMrr);

  const handleExportOutcomes = () => {
    const header = 'customer_id,account_name,email,plan,mrr,outcome_status,churn_reason,rescue_playbook,mrr_protected\n';
    const rows = [...rescuedCustomers, ...churnedCustomers].map(c =>
      `"${c.id}","${c.company_name || c.name}","${c.email}","${c.plan}",${c.mrr},"${c.outcomeStatus || c.status}","${c.churnReason || ''}","${c.rescuePlaybookUsed || ''}",${c.mrrProtected || 0}`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nochurn_retention_outcomes_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Closed-Loop AI OS */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Closed-Loop Learning System
              </span>
              <span className="text-xs text-slate-300 font-medium">Auto-Tuning Active</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Retention Outcomes & Churn Attribution
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Don't just predict churn—measure exactly what works. Every rescued account logs the successful playbook; every churned account captures root-cause feedback that re-calibrates risk weights and improves future AI recommendations.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 shrink-0">
            <div className="text-center p-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">MRR Protected</span>
              <span className="text-xl font-black text-emerald-400 font-mono tabular-nums">
                +{formatCurrency(totalSavedMrr)}
              </span>
            </div>
            <div className="text-center p-2 border-l border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Rescued / Decided</span>
              <span className="text-xl font-black text-white font-mono tabular-nums">
                {totalRescued} <span className="text-xs font-normal text-slate-400">/ {totalDecided}</span>
              </span>
            </div>
            <div className="text-center p-2 border-l border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Win Rate</span>
              <span className="text-xl font-black text-amber-300 font-mono tabular-nums">{winRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Playbook Winners & Churn Causes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Most Effective Retention Playbooks */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              Effective Rescue Playbooks
            </h3>
            <span className="text-xs text-emerald-700 font-semibold font-mono tabular-nums">
              {totalRescued} account{totalRescued !== 1 ? 's' : ''} saved
            </span>
          </div>

          {sortedPlaybooks.length === 0 ? (
            <div className="py-8 text-center text-gray-500 space-y-2">
              <Lightbulb className="w-6 h-6 text-gray-400 mx-auto" />
              <p className="text-xs font-semibold text-gray-800">No rescued accounts logged yet.</p>
              <p className="text-xs text-gray-500">Record outcomes from the Action Queue to discover which playbooks save the most MRR.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedPlaybooks.map((p, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-900">{p.playbook}</span>
                    <span className="font-bold text-emerald-700 font-mono tabular-nums">
                      +{formatCurrency(p.protectedMrr)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Used in {p.count} successful intervention{p.count > 1 ? 's' : ''}</span>
                    <span className="text-emerald-700 font-semibold font-mono tabular-nums">
                      Avg +{formatCurrency(Math.round(p.protectedMrr / p.count))} / account
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Churn Attribution & Root Causes */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Churn Root-Cause Attribution
            </h3>
            <span className="text-xs text-red-700 font-semibold font-mono tabular-nums">
              {totalChurned} lost ({formatCurrency(totalLostMrr)})
            </span>
          </div>

          {sortedReasons.length === 0 ? (
            <div className="py-8 text-center text-gray-500 space-y-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="text-xs font-semibold text-gray-800">No churned accounts recorded.</p>
              <p className="text-xs text-gray-500">All customer accounts in your active portfolio are currently retained or under monitoring.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedReasons.map((r, idx) => (
                <div key={idx} className="p-3 bg-red-50/50 rounded-lg border border-red-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-red-950">{r.reason}</span>
                    <span className="font-bold text-red-700 font-mono tabular-nums">
                      −{formatCurrency(r.lostMrr)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-600">
                    <span>{r.count} account{r.count > 1 ? 's' : ''} lost</span>
                    <span className="text-red-600 font-mono tabular-nums">
                      Avg −{formatCurrency(Math.round(r.lostMrr / r.count))} / account
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Outcome Audit Log */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-gray-900">Retention Outcome Audit Log</h3>
            <p className="text-xs text-gray-500">Comprehensive log of accounts marked rescued or churned.</p>
          </div>
          <button
            onClick={handleExportOutcomes}
            disabled={totalDecided === 0}
            className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Account</th>
                <th className="py-2.5 px-3">Plan</th>
                <th className="py-2.5 px-3">Outcome</th>
                <th className="py-2.5 px-3">Impact MRR</th>
                <th className="py-2.5 px-3">Attribution Details</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {totalDecided === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No decided outcomes logged yet. Execute playbooks from the Action Queue or Customer Table.
                  </td>
                </tr>
              ) : (
                [...rescuedCustomers, ...churnedCustomers].map(c => {
                  const isSaved = c.status === 'saved' || c.outcomeStatus === 'recovered';
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {c.company_name || c.name}
                        <div className="text-[11px] font-mono text-gray-500 font-normal">{c.email}</div>
                      </td>
                      <td className="py-3 px-3 text-gray-600">{c.plan}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSaved
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {isSaved ? 'Recovered' : 'Churned'}
                        </span>
                      </td>
                      <td className={`py-3 px-3 font-mono tabular-nums font-bold ${isSaved ? 'text-emerald-700' : 'text-red-700'}`}>
                        {isSaved ? `+${formatCurrency(c.mrrProtected ?? c.mrr)}` : `−${formatCurrency(c.mrr)}`}
                      </td>
                      <td className="py-3 px-3 text-gray-600 truncate max-w-xs">
                        {isSaved
                          ? (c.rescuePlaybookUsed || c.savedNotes || 'Playbook executed')
                          : (c.churnReason || c.churnReasonDetail || 'Churn recorded')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {onSelectCustomer && (
                          <button
                            onClick={() => onSelectCustomer(c)}
                            className="text-blue-900 hover:underline font-semibold text-xs"
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
