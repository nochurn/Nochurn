import React, { useState, useMemo } from 'react';
import { Customer, Top5CustomerPriority, RetentionMessage } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  Sparkles,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Mail,
  Send,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  UploadCloud,
  Check,
  Clock,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Copy,
  LifeBuoy,
  TrendingDown,
  Info
} from 'lucide-react';
import { aiEmployeeService } from '../services/aiEmployeeService';
import { fetchOutboundStatus, OutboundStatusResponse } from '../services/api';
import { ImportCustomerDataModal } from './ImportCustomerDataModal';
import { generatePlainEnglishRiskExplanation } from '../utils/aiEmployeeEngine';

interface HomeDashboardViewProps {
  customers: Customer[];
  top5: Top5CustomerPriority[];
  messages: RetentionMessage[];
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onRunScan: () => Promise<void>;
  isScanning: boolean;
  onSelectCustomer: (customer: Customer) => void;
  onApproveMessage?: (messageId: string) => Promise<void>;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onImportCustomers?: (payload: { rawCsv?: string; rawPdfBase64?: string; fileType?: 'csv' | 'pdf'; fileName?: string }) => Promise<any>;
  onLoadDemoData?: () => Promise<number | void>;
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  customers,
  top5,
  messages,
  onNavigate,
  onRunScan,
  isScanning,
  onSelectCustomer,
  onApproveMessage,
  onShowToast,
  onImportCustomers,
  onLoadDemoData
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [approvingMsgId, setApprovingMsgId] = useState<string | null>(null);

  // Core KPIs strictly derived from live data (No fake data)
  const customersAtRisk = useMemo(() => {
    return customers.filter(c => (c.risk_score ?? c.riskScore ?? 0) >= 60 && c.status !== 'saved');
  }, [customers]);

  const revenueAtRisk = useMemo(() => {
    return customersAtRisk.reduce((sum, c) => sum + (c.mrr || 0), 0);
  }, [customersAtRisk]);

  const messagesReady = useMemo(() => {
    return messages.filter(m => m.status === 'ready' || m.status === 'review');
  }, [messages]);

  const actionsPendingCount = useMemo(() => {
    return top5.filter(p => p.messageStatus !== 'sent').length || messagesReady.length;
  }, [top5, messagesReady]);

  const employeeStatus = isScanning ? 'WORKING' : aiEmployeeService.getStatus();
  const lastScan = aiEmployeeService.getLastScanAt();

  const isDemoMode = useMemo(() => {
    return customers.some(c => c.is_demo_data === true || (c as any).isDemo === true);
  }, [customers]);

  const handleApprove = async (msgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setApprovingMsgId(msgId);
    try {
      if (onApproveMessage) {
        await onApproveMessage(msgId);
      } else {
        await aiEmployeeService.approveMessage(msgId);
      }
      onShowToast('Message approved and enqueued for delivery.', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to approve message', 'error');
    } finally {
      setApprovingMsgId(null);
    }
  };

  // If no customers exist, show empty state
  if (customers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-2xl mx-auto shadow-xs space-y-5 my-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-blue-900" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">No customer data yet.</h2>
            <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
              Your AI Retention Employee is ready. Upload your customer data via CSV to identify at-risk accounts, review why they are at risk, and approve personalized retention actions.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Customers (CSV)</span>
            </button>
            {onLoadDemoData && (
              <button
                onClick={onLoadDemoData}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 transition-colors cursor-pointer"
              >
                <span>Load Demo Dataset</span>
              </button>
            )}
          </div>
        </div>

        {isImportModalOpen && (
          <ImportCustomerDataModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImportSuccess={() => {
              setIsImportModalOpen(false);
              onRunScan();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 0. DEMO MODE BANNER (Requirement 9) */}
      {isDemoMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2 font-medium">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Demo Data</strong> — Synthetic customer data used for demonstration.
            </span>
          </div>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="text-amber-950 font-bold hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
          >
            <span>Import real customer data</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 1. PRIMARY WORKFLOW BANNER (Requirement 1) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-900" />
          <span>NoChurn Retention Pipeline</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none text-gray-700">
          <span className="bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg shrink-0">Customer Data</span>
          <span className="text-gray-300">→</span>
          <span className="bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg shrink-0">Risk Detection</span>
          <span className="text-gray-300">→</span>
          <span className="bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg shrink-0">Why At Risk</span>
          <span className="text-gray-300">→</span>
          <span className="bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg shrink-0">Recommended Action</span>
          <span className="text-gray-300">→</span>
          <span className="bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg shrink-0">AI Message</span>
          <span className="text-gray-300">→</span>
          <span className="bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg shrink-0 font-bold border border-amber-200/60">Human Approval</span>
          <span className="text-gray-300">→</span>
          <span className="bg-emerald-50 text-emerald-900 px-2.5 py-1 rounded-lg shrink-0">Send</span>
          <span className="text-gray-300">→</span>
          <span className="bg-gray-100 text-gray-800 px-2.5 py-1 rounded-lg shrink-0">Track</span>
        </div>
      </div>

      {/* 2. TOP GREETING & SCAN CONTROLS */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span className="font-semibold text-gray-900">NoChurn AI Employee</span>
            <span>·</span>
            <span>Last scan: {lastScan ? new Date(lastScan).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ready'}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            {isScanning
              ? 'Analyzing telemetry & risk indicators...'
              : top5.length > 0
              ? `Good morning. ${top5.length} priority customers need attention today.`
              : 'Good morning. Your retention pipeline is up to date.'}
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Evaluated behavior and telemetry signals across <strong className="text-gray-900 font-bold">{customers.length.toLocaleString()}</strong> active customer accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-900" />
            <span>Import Data</span>
          </button>

          <button
            onClick={onRunScan}
            disabled={isScanning || customers.length === 0}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Analyzing...' : 'Run Daily Scan'}</span>
          </button>
        </div>
      </div>

      {/* 3. 5 KEY DASHBOARD METRIC CARDS (Requirement 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Customers at Risk */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Customers at Risk</span>
            <Flame className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-red-600 font-mono">
              {customersAtRisk.length}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Risk score 60+ detected
            </p>
          </div>
        </div>

        {/* Metric 2: Revenue at Risk */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Revenue at Risk</span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-orange-600 font-mono">
              {formatCurrency(revenueAtRisk)}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              MRR across at-risk accounts
            </p>
          </div>
        </div>

        {/* Metric 3: Messages Ready */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Messages Ready</span>
            <Mail className="w-4 h-4 text-blue-900" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-blue-900 font-mono">
              {messagesReady.length}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Awaiting human approval
            </p>
          </div>
        </div>

        {/* Metric 4: Actions Pending */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Actions Pending</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-amber-600 font-mono">
              {actionsPendingCount}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Priority outreach needed
            </p>
          </div>
        </div>

        {/* Metric 5: AI Employee Status */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">AI Employee</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${employeeStatus === 'WORKING' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
              <span className="text-lg font-bold text-gray-900">
                {employeeStatus}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Automated daily scanner active
            </p>
          </div>
        </div>
      </div>

      {/* 4. DAILY RETENTION BRIEF (Requirement 6) */}
      {top5.length > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400">
                Daily Retention Brief
              </span>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Good Morning. {top5.length} customers need attention today.
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {top5.map((p, idx) => {
              const cust = p.customer;
              const custName = cust.company_name || cust.name || 'Account';
              const reasonText = generatePlainEnglishRiskExplanation(cust);

              return (
                <div
                  key={cust.id || idx}
                  onClick={() => onSelectCustomer(cust)}
                  className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3.5 space-y-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-300">
                      Priority {idx + 1}
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">
                      {formatCurrency(p.revenueAtRisk)}/mo
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-sm truncate">{custName}</h3>
                    <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                      {reasonText}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-amber-300 font-medium">
                      Action: {p.recommendedAction}
                    </span>
                    <span className="text-blue-300 font-semibold hover:underline flex items-center gap-0.5 text-[11px]">
                      <span>Review</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. TODAY'S TOP 5 AT-RISK CUSTOMERS TABLE / CARDS (Requirement 1) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Today's Top 5 At-Risk Customers</h2>
            <p className="text-xs text-gray-600">
              Accounts requiring immediate attention based on observed friction and risk metrics.
            </p>
          </div>
          <button
            onClick={() => onNavigate('messages')}
            className="text-xs font-bold text-blue-900 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>View All Prepared Messages</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {top5.length === 0 ? (
          <div className="p-8 text-center text-gray-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-gray-900">All Accounts Active and Healthy</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              No at-risk customers flagged in the latest scan. Click "Run Daily Scan" anytime to re-evaluate.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {top5.map((p, idx) => {
              const cust = p.customer;
              const custName = cust.company_name || cust.name || 'Account';
              const isCritical = p.riskScore >= 80;
              const reasonText = generatePlainEnglishRiskExplanation(cust);
              const lastLoginDays = cust.lastLoginDays ?? (cust as any).last_login_days_ago ?? 0;
              const openTickets = cust.openTicketsCount ?? cust.supportTickets?.length ?? 0;

              // Associated message if exists
              const relatedMsg = messages.find(m => m.customerId === cust.id);

              return (
                <div
                  key={cust.id || idx}
                  className="p-5 hover:bg-gray-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                >
                  {/* Left Column: Customer Details, Risk & Reason */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-gray-100 text-gray-700 font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <strong className="text-sm font-bold text-gray-900 truncate">
                        {custName}
                      </strong>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-600 font-medium">{cust.email}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500">{cust.plan || 'Growth'} Tier</span>
                    </div>

                    {/* Plain English Main Risk Reason */}
                    <p className="text-gray-700 text-xs leading-relaxed max-w-3xl">
                      <strong className="text-gray-900 font-semibold">Why at risk: </strong>
                      {reasonText}
                    </p>

                    {/* Telemetry metadata: last activity, tickets, revenue, risk level */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600 pt-1">
                      <span className="font-semibold text-gray-900">
                        Risk Level:{' '}
                        <span className={isCritical ? 'text-red-700 font-bold' : 'text-orange-700 font-bold'}>
                          {isCritical ? 'Critical' : 'High'} ({p.riskScore}/100)
                        </span>
                      </span>
                      <span className="text-gray-300">|</span>
                      <span>Revenue: <strong className="text-gray-900 font-mono font-bold">{formatCurrency(p.revenueAtRisk)}/mo</strong></span>
                      <span className="text-gray-300">|</span>
                      <span>Last login: <strong className="text-gray-800">{lastLoginDays > 0 ? `${lastLoginDays} days ago` : 'Active recently'}</strong></span>
                      <span className="text-gray-300">|</span>
                      <span>Tickets: <strong className="text-gray-800">{openTickets} open</strong></span>
                      <span className="text-gray-300">|</span>
                      <span className="text-blue-900 font-medium">Recommended: <strong>{p.recommendedAction}</strong></span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
                    {relatedMsg && relatedMsg.status === 'ready' && (
                      <button
                        type="button"
                        onClick={(e) => handleApprove(relatedMsg.id, e)}
                        disabled={approvingMsgId === relatedMsg.id}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{approvingMsgId === relatedMsg.id ? 'Approving...' : 'Approve & Send'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectCustomer(cust)}
                      className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Review</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isImportModalOpen && (
        <ImportCustomerDataModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={() => {
            setIsImportModalOpen(false);
            onRunScan();
          }}
        />
      )}
    </div>
  );
};
