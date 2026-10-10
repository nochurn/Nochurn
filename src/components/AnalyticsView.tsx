import React from 'react';
import {
  BarChart3,
  TrendingDown,
  Flame,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  Layers,
  ArrowRight,
  Database,
  UploadCloud
} from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import {
  getTotalCustomers,
  getTotalMRR,
  getRiskDistribution,
  getHighRiskMRR,
  getMediumRiskMRR,
  getPlanDistribution,
  getPaymentStatusDistribution
} from '../utils/customerSelectors';

interface AnalyticsViewProps {
  customers: Customer[];
  onNavigate?: (view: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ customers, onNavigate }) => {
  const totalCustomers = getTotalCustomers(customers);
  const totalMrr = getTotalMRR(customers);
  const riskDist = getRiskDistribution(customers);
  const planDist = getPlanDistribution(customers);
  const paymentDist = getPaymentStatusDistribution(customers);

  // Exact 4 cohorts from live customer dataset
  const critical = customers.filter(c => (c.risk_score ?? c.riskScore) >= 80);
  const high = customers.filter(c => {
    const s = c.risk_score ?? c.riskScore;
    return s >= 60 && s < 80;
  });
  const medium = customers.filter(c => {
    const s = c.risk_score ?? c.riskScore;
    return s >= 30 && s < 60;
  });
  const low = customers.filter(c => {
    const s = c.risk_score ?? c.riskScore;
    return s < 30;
  });

  const criticalMrr = Math.round(critical.reduce((sum, c) => sum + (c.mrr || 0), 0));
  const highMrr = Math.round(high.reduce((sum, c) => sum + (c.mrr || 0), 0));
  const mediumMrr = Math.round(medium.reduce((sum, c) => sum + (c.mrr || 0), 0));
  const lowMrr = Math.round(low.reduce((sum, c) => sum + (c.mrr || 0), 0));

  const criticalPct = totalMrr > 0 ? Math.round((criticalMrr / totalMrr) * 100) : 0;
  const highPct = totalMrr > 0 ? Math.round((highMrr / totalMrr) * 100) : 0;
  const mediumPct = totalMrr > 0 ? Math.round((mediumMrr / totalMrr) * 100) : 0;
  const lowPct = totalMrr > 0 ? Math.max(0, 100 - (criticalPct + highPct + mediumPct)) : 0;

  // Top churn factors calculation across all live accounts
  const factorMap: Record<string, { count: number; points: number }> = {};
  customers.forEach((c) => {
    if (c.topFactors && Array.isArray(c.topFactors)) {
      c.topFactors.forEach((f) => {
        if (!f || !f.factor) return;
        if (!factorMap[f.factor]) {
          factorMap[f.factor] = { count: 0, points: 0 };
        }
        factorMap[f.factor].count += 1;
        factorMap[f.factor].points += f.points || 10;
      });
    } else if (c.risk_reason) {
      if (!factorMap[c.risk_reason]) {
        factorMap[c.risk_reason] = { count: 0, points: 0 };
      }
      factorMap[c.risk_reason].count += 1;
      factorMap[c.risk_reason].points += 15;
    }
  });

  const sortedFactors = Object.entries(factorMap)
    .map(([factor, data]) => ({ factor, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (totalCustomers === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
          <h2 className="text-xl font-bold text-gray-900">Portfolio Churn Analytics</h2>
          <p className="text-xs text-gray-600 mt-1">
            Macro cohort trends, revenue at risk distributions, and systemic factor diagnostics.
          </p>
        </div>

        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
            <PieChart className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-bold text-gray-900 text-base">No Customer Telemetry Available</h3>
            <p className="text-xs text-gray-600 mt-1">
              Your canonical customer store is currently empty. Import a CSV or connect an integration to generate live analytics.
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('integrations')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Customer CSV</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Portfolio Churn Analytics</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Macro cohort trends, revenue at risk distributions, and systemic factor diagnostics across <span className="font-mono tabular-nums font-semibold text-gray-900">{totalCustomers}</span> accounts.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg shrink-0">
          <span className="text-gray-500">Total Monitored MRR:</span>
          <span className="font-mono tabular-nums font-bold text-gray-900">{formatCurrency(totalMrr)}</span>
        </div>
      </div>

      {/* 4 Risk Cohort Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical Red */}
        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-red-700">Critical (80-100)</span>
              <Flame className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-black text-red-600 font-mono tabular-nums mt-2">
              {critical.length} <span className="text-xs font-medium text-gray-500">accounts</span>
            </div>
          </div>
          <div className="text-xs text-gray-600 mt-3 pt-2 border-t border-red-100 flex items-center justify-between">
            <span>MRR at stake:</span>
            <span className="font-mono tabular-nums font-bold text-red-700">{formatCurrency(criticalMrr)} ({criticalPct}%)</span>
          </div>
        </div>

        {/* High Orange */}
        <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-orange-700">High Risk (60-79)</span>
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-black text-orange-600 font-mono tabular-nums mt-2">
              {high.length} <span className="text-xs font-medium text-gray-500">accounts</span>
            </div>
          </div>
          <div className="text-xs text-gray-600 mt-3 pt-2 border-t border-orange-100 flex items-center justify-between">
            <span>MRR at stake:</span>
            <span className="font-mono tabular-nums font-bold text-orange-700">{formatCurrency(highMrr)} ({highPct}%)</span>
          </div>
        </div>

        {/* Medium Yellow */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-amber-800">Medium Risk (30-59)</span>
              <TrendingDown className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 font-mono tabular-nums mt-2">
              {medium.length} <span className="text-xs font-medium text-gray-500">accounts</span>
            </div>
          </div>
          <div className="text-xs text-gray-600 mt-3 pt-2 border-t border-amber-100 flex items-center justify-between">
            <span>MRR at stake:</span>
            <span className="font-mono tabular-nums font-bold text-amber-800">{formatCurrency(mediumMrr)} ({mediumPct}%)</span>
          </div>
        </div>

        {/* Low Green */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-emerald-800">Low Risk (&lt; 30)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono tabular-nums mt-2">
              {low.length} <span className="text-xs font-medium text-gray-500">accounts</span>
            </div>
          </div>
          <div className="text-xs text-gray-600 mt-3 pt-2 border-t border-emerald-100 flex items-center justify-between">
            <span>Healthy MRR:</span>
            <span className="font-mono tabular-nums font-bold text-emerald-700">{formatCurrency(lowMrr)} ({lowPct}%)</span>
          </div>
        </div>
      </div>

      {/* Visual Proportion Breakdown Bar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-gray-900">
          <span>MRR Distribution by Churn Risk Tier</span>
          <span className="text-gray-600 font-mono tabular-nums">Total: {formatCurrency(totalMrr)}</span>
        </div>

        {/* Visual Bar */}
        <div className="w-full h-7 rounded-xl overflow-hidden flex shadow-inner bg-gray-100">
          {criticalPct > 0 && (
            <div
              style={{ width: `${criticalPct}%` }}
              className="bg-red-500 hover:opacity-90 transition-opacity flex items-center justify-center text-[10px] font-bold text-white font-mono tabular-nums"
              title={`Critical: ${formatCurrency(criticalMrr)} (${criticalPct}%)`}
            >
              {criticalPct}%
            </div>
          )}
          {highPct > 0 && (
            <div
              style={{ width: `${highPct}%` }}
              className="bg-orange-500 hover:opacity-90 transition-opacity flex items-center justify-center text-[10px] font-bold text-white font-mono tabular-nums"
              title={`High: ${formatCurrency(highMrr)} (${highPct}%)`}
            >
              {highPct}%
            </div>
          )}
          {mediumPct > 0 && (
            <div
              style={{ width: `${mediumPct}%` }}
              className="bg-amber-400 hover:opacity-90 transition-opacity flex items-center justify-center text-[10px] font-bold text-gray-900 font-mono tabular-nums"
              title={`Medium: ${formatCurrency(mediumMrr)} (${mediumPct}%)`}
            >
              {mediumPct}%
            </div>
          )}
          {lowPct > 0 && (
            <div
              style={{ width: `${lowPct}%` }}
              className="bg-emerald-500 hover:opacity-90 transition-opacity flex items-center justify-center text-[10px] font-bold text-white font-mono tabular-nums"
              title={`Low: ${formatCurrency(lowMrr)} (${lowPct}%)`}
            >
              {lowPct}%
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 shrink-0"></span>
            <span className="text-gray-700">Critical ({formatCurrency(criticalMrr)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0"></span>
            <span className="text-gray-700">High ({formatCurrency(highMrr)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0"></span>
            <span className="text-gray-700">Medium ({formatCurrency(mediumMrr)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="text-gray-700">Low ({formatCurrency(lowMrr)})</span>
          </div>
        </div>
      </div>

      {/* Grid: Systematic Churn Drivers & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top 5 Root Causes Diagnostic */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-900" />
            Top Systematic Churn Drivers Across Accounts
          </h3>

          {sortedFactors.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">No risk factors identified across accounts.</p>
          ) : (
            <div className="space-y-3">
              {sortedFactors.map((f, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800">{f.factor}</span>
                    <span className="text-gray-600 font-mono tabular-nums">
                      {f.count} account{f.count > 1 ? 's' : ''} (avg +{Math.round(f.points / f.count)} pts)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-900 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (f.count / totalCustomers) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subscription Plan Distribution */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-900" />
            Subscription Plan & MRR Breakdown
          </h3>

          {planDist.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">No plan data available.</p>
          ) : (
            <div className="space-y-3">
              {planDist.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800">{item.plan}</span>
                    <span className="text-gray-600 font-mono tabular-nums">
                      {item.count} account{item.count > 1 ? 's' : ''} · {formatCurrency(item.mrr)} ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all"
                      style={{ width: `${item.percent}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
