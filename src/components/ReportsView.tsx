import React, { useState, useEffect } from 'react';
import { Customer, DailyRetentionBrief } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  FileText,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Flame,
  Mail,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { aiEmployeeService } from '../services/aiEmployeeService';

interface ReportsViewProps {
  customers: Customer[];
  onNavigate: (view: string) => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  customers,
  onNavigate,
  onShowToast
}) => {
  const [reports, setReports] = useState<DailyRetentionBrief[]>(() => aiEmployeeService.getReports());
  const [selectedReportIndex, setSelectedReportIndex] = useState<number>(0);
  const [isSendingOwnerDigest, setIsSendingOwnerDigest] = useState<boolean>(false);

  useEffect(() => {
    const unsub = aiEmployeeService.subscribe(() => {
      setReports(aiEmployeeService.getReports());
    });
    return unsub;
  }, []);

  const activeReport = reports[selectedReportIndex] || null;

  const handleSendOwnerDigest = async () => {
    setIsSendingOwnerDigest(true);
    try {
      const res = await aiEmployeeService.sendOwnerBrief();
      onShowToast(res.message, 'success');
      setReports(aiEmployeeService.getReports());
    } catch (e) {
      onShowToast('Failed to send owner digest email', 'error');
    } finally {
      setIsSendingOwnerDigest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[11px] uppercase tracking-wider">
              Executive Briefing
            </span>
            <span className="text-xs text-gray-500">Sub-minute scannable report</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            Your Daily Retention Brief
          </h1>
          <p className="text-xs text-gray-600">
            A concise daily audit summarizing portfolio churn risk, top accounts requiring intervention, and prepared recovery messages.
          </p>
        </div>

        <button
          onClick={handleSendOwnerDigest}
          disabled={isSendingOwnerDigest}
          className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Mail className="w-3.5 h-3.5 text-blue-200" />
          <span>{isSendingOwnerDigest ? 'Dispatching...' : 'Email Brief to Owner'}</span>
        </button>
      </div>

      {/* Main Report Card */}
      {!activeReport ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 space-y-3">
          <FileText className="w-8 h-8 text-gray-400 mx-auto" />
          <h3 className="font-bold text-gray-900 text-base">No report generated yet. Run your first morning scan.</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Your AI Employee compiles the retention brief during morning scans. Run a scan from the AI Employee page to generate today's brief.
          </p>
          <button
            onClick={() => onNavigate('ai-employee')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            <span>Go to AI Employee</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Brief Meta Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5 text-blue-900" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Date of Scan: {new Date(activeReport.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Scan Status: {activeReport.status || 'COMPLETED'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Owner Notification: {activeReport.ownerNotified ? '✓ Sent' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                activeReport.ownerNotified ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
              }`}>
                {activeReport.ownerNotified ? '✓ Owner Notified' : 'Brief Ready'}
              </span>
            </div>
          </div>

          {/* 6 Key Scannable Metrics (Section 15) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-500 text-[11px] block">Analyzed</span>
              <strong className="text-base font-extrabold text-gray-900 font-mono mt-0.5 block">
                {activeReport.customersAnalyzed}
              </strong>
            </div>

            <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
              <span className="text-red-700 text-[11px] block">At Risk</span>
              <strong className="text-base font-extrabold text-red-600 font-mono mt-0.5 block">
                {activeReport.customersAtRisk}
              </strong>
            </div>

            <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-100">
              <span className="text-orange-700 text-[11px] block">Revenue at Risk</span>
              <strong className="text-base font-extrabold text-orange-600 font-mono mt-0.5 block">
                {formatCurrency(activeReport.revenueAtRisk)}
              </strong>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <span className="text-blue-700 text-[11px] block">Messages Ready</span>
              <strong className="text-base font-extrabold text-blue-900 font-mono mt-0.5 block">
                {activeReport.messagesReady}
              </strong>
            </div>

            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
              <span className="text-purple-700 text-[11px] block">Messages Sent</span>
              <strong className="text-base font-extrabold text-purple-900 font-mono mt-0.5 block">
                {activeReport.messagesSent}
              </strong>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <span className="text-emerald-700 text-[11px] block">Recovered</span>
              <strong className="text-base font-extrabold text-emerald-700 font-mono mt-0.5 block">
                {activeReport.customersRecovered}
              </strong>
            </div>
          </div>

          {/* Top 5 Priorities Breakdown (Section 15) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">
                Top 5 Priority Accounts in This Brief
              </h3>
              <button
                onClick={() => onNavigate('messages')}
                className="text-xs font-bold text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Review Messages</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {activeReport.top5.map((p, idx) => (
                <div
                  key={idx}
                  className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-500">#{idx + 1}</span>
                      <strong className="font-bold text-gray-900 text-sm">
                        {p.customer.company_name || p.customer.name}
                      </strong>
                      <span className={`px-2 py-0.2 rounded-full font-bold text-[10px] ${
                        p.riskScore >= 80 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        Score {p.riskScore}
                      </span>
                      <span className="font-mono text-gray-700 font-semibold">
                        {formatCurrency(p.revenueAtRisk)} MRR
                      </span>
                    </div>

                    <p className="text-gray-600 text-xs">
                      {p.whyAtRisk}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 uppercase block">Action</span>
                      <span className="font-bold text-blue-900 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {p.recommendedAction}
                      </span>
                    </div>

                    <div className="text-right min-w-[90px]">
                      <span className="text-[10px] text-gray-400 uppercase block">Message</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        p.messageStatus === 'sent'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.messageStatus === 'approved'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {p.messageStatus === 'sent' ? 'Sent' : p.messageStatus === 'approved' ? 'Approved' : 'Ready'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Previous Reports Archive (Section 23) */}
      {reports.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>Previous Daily Briefings Archive</span>
          </h3>

          <div className="divide-y divide-gray-100 text-xs">
            {reports.map((rep, idx) => (
              <div
                key={rep.id || idx}
                onClick={() => setSelectedReportIndex(idx)}
                className={`py-3 px-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                  idx === selectedReportIndex ? 'bg-blue-50/80 font-bold text-blue-950' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-blue-900" />
                  <span>{new Date(rep.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span className="text-gray-500 font-normal">
                    ({rep.customersAtRisk} at-risk • {formatCurrency(rep.revenueAtRisk)} MRR)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-normal">
                    {rep.messagesReady} ready / {rep.messagesSent} sent
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
