import React, { useState } from 'react';
import { Customer, Top5CustomerPriority, AiEmployeeSettings, RetentionMessage } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Send,
  MessageSquare,
  Sliders,
  Check,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  ExternalLink,
  UploadCloud
} from 'lucide-react';
import { aiEmployeeService } from '../services/aiEmployeeService';
import { ImportCustomerDataModal } from './ImportCustomerDataModal';

interface AiEmployeeViewProps {
  customers: Customer[];
  top5: Top5CustomerPriority[];
  messages: RetentionMessage[];
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onRunScan: () => Promise<void>;
  isScanning: boolean;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onImportCustomers?: (payload: { rawCsv?: string; rawPdfBase64?: string; fileType?: 'csv' | 'pdf'; fileName?: string }) => Promise<any>;
  onLoadDemoData?: () => Promise<number | void>;
}

export const AiEmployeeView: React.FC<AiEmployeeViewProps> = ({
  customers,
  top5,
  messages,
  onNavigate,
  onRunScan,
  isScanning,
  onShowToast,
  onImportCustomers,
  onLoadDemoData
}) => {
  const [settings, setSettings] = useState<AiEmployeeSettings>(() => aiEmployeeService.getSettings());
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  const status = isScanning ? 'WORKING' : aiEmployeeService.getStatus();
  const lastError = aiEmployeeService.getLastError();
  const lastScan = aiEmployeeService.getLastScanAt();
  const nextScan = aiEmployeeService.getNextScanAt();

  const handleUpdateSetting = async <K extends keyof AiEmployeeSettings>(key: K, value: AiEmployeeSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setIsSavingSettings(true);
    try {
      await aiEmployeeService.updateSettings({ [key]: value });
      onShowToast('Employee settings saved.', 'success');
    } catch (e) {
      onShowToast('Failed to save settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const isDemoMode = customers.some(c => c.is_demo_data === true || (c as any).isDemo === true);

  if (customers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-xl mx-auto shadow-xs space-y-4 my-8">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7 text-blue-900" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900">No customer data yet.</h2>
          <p className="text-xs text-gray-600 max-w-sm mx-auto">
            Upload your customer accounts via CSV to start daily scans, detect behavior churn signals, and generate personalized retention messages.
          </p>
        </div>
        <button
          onClick={() => onNavigate('customers')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <span>Go to Customers (Import CSV)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. MAIN PRODUCT HEADER */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 rounded-2xl p-6 sm:p-8 text-white shadow-md border border-blue-900 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/80 border border-blue-700/60 text-blue-200 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                <span>Core Retention Engine</span>
              </div>
              {isDemoMode && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-[11px] uppercase tracking-wider shadow-xs">
                  DEMO MODE
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Your AI Retention Employee
            </h1>

            <p className="text-xs sm:text-sm text-blue-200 leading-relaxed">
              Your employee checks customer behavior, finds who needs attention, and prepares the right message.
            </p>

            {lastScan && (
              <p className="text-xs text-emerald-300 font-medium">
                ✓ Scan completed at {new Date(lastScan).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}

            {lastError && status === 'ERROR' && (
              <div className="p-3 bg-red-900/40 border border-red-700/60 rounded-xl text-xs text-red-200">
                <strong>Error:</strong> {lastError}
              </div>
            )}
          </div>

          {/* Status & Primary CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold">
              <span className={`w-2.5 h-2.5 rounded-full ${
                status === 'WORKING'
                  ? 'bg-amber-400 animate-ping'
                  : status === 'ERROR'
                  ? 'bg-red-400'
                  : status === 'COMPLETED'
                  ? 'bg-emerald-400'
                  : 'bg-blue-400'
              }`} />
              <span className="text-slate-300">Status:</span>
              <strong className={`font-bold ${
                status === 'WORKING'
                  ? 'text-amber-300'
                  : status === 'ERROR'
                  ? 'text-red-300'
                  : status === 'COMPLETED'
                  ? 'text-emerald-300'
                  : 'text-white'
              }`}>{status}</strong>
            </div>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2.5 bg-blue-900/80 hover:bg-blue-800 text-white font-bold text-xs rounded-xl border border-blue-700/60 shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-blue-300" />
              <span>Import Customer Data</span>
            </button>

            <button
              onClick={onRunScan}
              disabled={isScanning || customers.length === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scan in progress...' : 'Run Scan Now'}</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-blue-900/60 text-xs">
          <div className="p-3 bg-blue-900/30 rounded-xl border border-blue-800/40">
            <span className="text-blue-300 block text-[11px]">Last Scan</span>
            <strong className="text-white font-mono text-sm block mt-0.5">
              {lastScan ? new Date(lastScan).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
            </strong>
          </div>

          <div className="p-3 bg-blue-900/30 rounded-xl border border-blue-800/40">
            <span className="text-blue-300 block text-[11px]">Schedule Status</span>
            <strong className="text-amber-300 font-mono text-[11px] block mt-0.5">
              Requires deployment scheduler
            </strong>
            <span className="text-[10px] text-blue-200 block mt-0.5">
              Automatic scheduler requires deployment scheduler configuration.
            </span>
          </div>

          <div className="p-3 bg-blue-900/30 rounded-xl border border-blue-800/40">
            <span className="text-blue-300 block text-[11px]">Customers Analyzed</span>
            <strong className="text-white font-mono text-sm block mt-0.5">
              {customers.length.toLocaleString()}
            </strong>
          </div>

          <div className="p-3 bg-blue-900/30 rounded-xl border border-blue-800/40">
            <span className="text-blue-300 block text-[11px]">Messages Prepared</span>
            <strong className="text-emerald-300 font-mono text-sm block mt-0.5">
              {messages.length} ready
            </strong>
          </div>
        </div>
      </div>

      {/* 2. TODAY'S RETENTION PRIORITIES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Today's Priority Interventions</h2>
            <p className="text-xs text-gray-600">
              Evaluated using priority formula (Risk 50% + Revenue 25% + Engagement 15% + Support 10%).
            </p>
          </div>

          <button
            onClick={() => onNavigate('messages')}
            className="text-xs font-bold text-blue-900 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Review All Messages</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {top5.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-gray-900 text-sm">No At-Risk Priorities Flagged</h3>
            <p className="text-xs text-gray-500">
              All monitored customers are currently active and healthy. Click "Run Scan Now" anytime.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {top5.map((item, idx) => {
              const cust = item.customer;
              const name = cust.company_name || cust.name || 'Account';

              return (
                <div
                  key={cust.id || idx}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-900 font-bold text-[11px] flex items-center justify-center font-mono">
                          #{idx + 1}
                        </span>
                        <h4 className="font-bold text-sm text-gray-900">{name}</h4>
                      </div>

                      <span className="text-xs font-mono font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                        {formatCurrency(item.revenueAtRisk)} MRR
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed">
                      {item.whyAtRisk}
                    </p>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-gray-500">Action:</span>
                      <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                        {item.recommendedAction}
                      </span>
                    </div>
                  </div>

                  {/* Message Draft Previews */}
                  <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200/70 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span className="font-bold text-emerald-800 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          WhatsApp Draft:
                        </span>
                        <span className="font-medium text-emerald-700">Ready</span>
                      </div>
                      <p className="text-gray-800 text-[11px] italic line-clamp-2">
                        "{item.whatsappDraft}"
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => onNavigate('messages')}
                        className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <span>Review & Approve</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. SIMPLIFIED AI EMPLOYEE SETTINGS (Section 22) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-900" />
              <span>AI Employee Settings</span>
            </h3>
            <p className="text-xs text-gray-500">
              Only the essential settings required for automated morning operation.
            </p>
          </div>

          {isSavingSettings && (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Saving...</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
          {/* Daily Scan (ON/OFF) */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2 flex flex-col justify-between">
            <div>
              <label className="font-bold text-gray-900 block">Daily Scan</label>
              <p className="text-gray-500 text-[11px] mt-0.5">
                Automatically analyze customers every morning.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleUpdateSetting('dailyScanEnabled', true)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  settings.dailyScanEnabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                ON
              </button>
              <button
                type="button"
                onClick={() => handleUpdateSetting('dailyScanEnabled', false)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  !settings.dailyScanEnabled
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                OFF
              </button>
            </div>
          </div>

          {/* Scan Time (Default 9:00 AM) */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
            <label className="font-bold text-gray-900 block">Scan Time</label>
            <p className="text-gray-500 text-[11px]">
              Daily morning schedule trigger.
            </p>
            <input
              type="time"
              value={settings.scanTime}
              onChange={(e) => handleUpdateSetting('scanTime', e.target.value)}
              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-semibold"
            />
          </div>

          {/* Timezone */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
            <label className="font-bold text-gray-900 block">Timezone</label>
            <p className="text-gray-500 text-[11px]">
              Organization local schedule timezone.
            </p>
            <select
              value={settings.timezone}
              onChange={(e) => handleUpdateSetting('timezone', e.target.value)}
              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          {/* Message Tone (Empathetic / Professional / Direct) */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
            <label className="font-bold text-gray-900 block">Message Tone</label>
            <p className="text-gray-500 text-[11px]">
              Tone applied to WhatsApp & Email drafts.
            </p>
            <select
              value={settings.messageTone}
              onChange={(e) => handleUpdateSetting('messageTone', e.target.value as any)}
              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
            >
              <option value="Empathetic">Empathetic (Warm & supportive)</option>
              <option value="Professional">Professional (Polite & corporate)</option>
              <option value="Direct">Direct (Brief & action-focused)</option>
            </select>
          </div>

          {/* Minimum Risk (Default 70) */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
            <label className="font-bold text-gray-900 block">Minimum Risk Threshold</label>
            <p className="text-gray-500 text-[11px]">
              Minimum risk score to flag for owner attention.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={settings.minimumRisk}
                onChange={(e) => handleUpdateSetting('minimumRisk', Number(e.target.value))}
                className="flex-1"
              />
              <span className="font-mono font-bold text-gray-900 text-xs bg-white px-2 py-1 rounded border border-gray-200">
                {settings.minimumRisk}+
              </span>
            </div>
          </div>

          {/* Daily Priority Count (Default 5) */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
            <label className="font-bold text-gray-900 block">Daily Priority Count</label>
            <p className="text-gray-500 text-[11px]">
              Number of accounts in your daily focus list.
            </p>
            <select
              value={settings.dailyPriorityCount}
              onChange={(e) => handleUpdateSetting('dailyPriorityCount', Number(e.target.value))}
              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
            >
              <option value="5">Top 5 Priorities (Recommended)</option>
              <option value="10">Top 10 Priorities</option>
              <option value="15">Top 15 Priorities</option>
            </select>
          </div>
        </div>
      </div>

      {/* Import Customer Data Modal */}
      <ImportCustomerDataModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportCustomers={onImportCustomers || (async () => {})}
        onLoadDemoData={onLoadDemoData || (async () => {})}
        onShowToast={onShowToast}
      />
    </div>
  );
};
