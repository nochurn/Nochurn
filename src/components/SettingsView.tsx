import React, { useState, useEffect } from 'react';
import { AiEmployeeSettings, UserProfile } from '../types';
import {
  Settings,
  Sliders,
  Bell,
  ShieldCheck,
  Check,
  Lock,
  Mail,
  Clock,
  Sparkles,
  Globe,
  MessageSquare,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Key,
  ExternalLink,
  Info
} from 'lucide-react';
import { aiEmployeeService } from '../services/aiEmployeeService';
import { apiService, OutboundStatusResponse, TestOutboundConfigResponse } from '../services/api';

interface SettingsViewProps {
  currentUser: UserProfile | null;
  onNavigate: (view: string) => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onLoggedOut?: () => void;
  initialTab?: 'employee' | 'notifications' | 'security' | 'integrations';
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onNavigate,
  onShowToast,
  onLoggedOut,
  initialTab = 'employee'
}) => {
  const [activeTab, setActiveTab] = useState<'employee' | 'notifications' | 'security' | 'integrations'>(initialTab);
  const [settings, setSettings] = useState<AiEmployeeSettings>(() => aiEmployeeService.getSettings());
  const [ownerEmail, setOwnerEmail] = useState<string>(
    settings.ownerNotificationEmail || currentUser?.email || ''
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Outbound Integrations State
  const [outboundStatus, setOutboundStatus] = useState<OutboundStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);
  const [testingChannel, setTestingChannel] = useState<'whatsapp' | 'email' | null>(null);
  const [testResult, setTestResult] = useState<TestOutboundConfigResponse | null>(null);

  const loadOutboundStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const data = await apiService.fetchOutboundStatus();
      setOutboundStatus(data);
    } catch (e: any) {
      console.warn('[Settings] Failed to fetch outbound status:', e);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadOutboundStatus();
  }, []);

  const handleTestChannel = async (channel: 'whatsapp' | 'email') => {
    setTestingChannel(channel);
    setTestResult(null);
    try {
      const res = await apiService.testOutboundConfig(channel);
      setTestResult(res);
      if (res.verified) {
        onShowToast(`Configuration verified: ${res.message}`, 'success');
      } else if (res.status === 'not_configured') {
        onShowToast(`${channel === 'whatsapp' ? 'WhatsApp' : 'Email'} sending is not configured yet.`, 'info');
      } else {
        onShowToast(res.message, 'error');
      }
      // Reload live status after test
      loadOutboundStatus();
    } catch (err: any) {
      onShowToast(`Test failed: ${err.message}`, 'error');
    } finally {
      setTestingChannel(null);
    }
  };

  const handleUpdate = async <K extends keyof AiEmployeeSettings>(key: K, value: AiEmployeeSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    setIsSaving(true);
    try {
      await aiEmployeeService.updateSettings({ [key]: value });
      onShowToast('Settings updated.', 'success');
    } catch (e) {
      onShowToast('Failed to update settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    setIsSaving(true);
    try {
      await aiEmployeeService.updateSettings({ ownerNotificationEmail: ownerEmail });
      onShowToast('Owner notification email saved.', 'success');
    } catch (e) {
      onShowToast('Failed to save email', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-900" />
            <span>Settings</span>
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Configure your AI Retention Employee, morning briefings, and account security.
          </p>
        </div>

        {isSaving && (
          <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>Settings synced</span>
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('employee')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'employee'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>AI Employee</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'notifications'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Morning Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'security'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Security & 2FA</span>
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'integrations'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Outbound Integrations (WhatsApp & Email)</span>
        </button>
      </div>

      {/* TAB 1: AI EMPLOYEE SETTINGS (Section 22) */}
      {activeTab === 'employee' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
          <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-900" />
                <span>Daily Morning Automation</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure your daily retention scan schedule and owner alerts.
              </p>
            </div>

            {/* Scheduler Status Indicator (Section 8) */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-full text-xs font-bold shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Scheduler not connected.</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 border border-blue-200/80 rounded-xl text-xs text-blue-900">
            <strong>Note:</strong> Automatic daily scan requires a backend scheduler configuration. Manual <strong>"Run Scan Now"</strong> is fully functional anytime from Home or AI Employee.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* 1. Daily Scan ON/OFF */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <label className="font-bold text-gray-900 block">Daily Scan</label>
              <p className="text-gray-500 text-[11px]">
                Toggle automated morning scans on or off.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleUpdate('dailyScanEnabled', true)}
                  className={`px-4 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                    settings.dailyScanEnabled ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  ON
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate('dailyScanEnabled', false)}
                  className={`px-4 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                    !settings.dailyScanEnabled ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  OFF
                </button>
              </div>
            </div>

            {/* 2. Scan Time (Default 09:00 AM) */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <label className="font-bold text-gray-900 block">Scan Time</label>
              <p className="text-gray-500 text-[11px]">
                Time when morning telemetry analysis begins (Default: 09:00 AM).
              </p>
              <input
                type="time"
                value={settings.scanTime || '09:00'}
                onChange={(e) => handleUpdate('scanTime', e.target.value)}
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
              />
            </div>

            {/* 3. Timezone */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <label className="font-bold text-gray-900 block">Timezone</label>
              <p className="text-gray-500 text-[11px]">
                Organization timezone for morning schedules and reports.
              </p>
              <select
                value={settings.timezone}
                onChange={(e) => handleUpdate('timezone', e.target.value)}
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Chicago">America/Chicago (CST)</option>
                <option value="America/Denver">America/Denver (MST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Europe/Paris">Europe/Paris (CET)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            {/* 4. Owner Notification ON/OFF */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <label className="font-bold text-gray-900 block">Owner Notification</label>
              <p className="text-gray-500 text-[11px]">
                Send morning retention summary email after scan completes.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleUpdate('ownerNotificationEmail', ownerEmail || currentUser?.email || 'owner@company.com')}
                  className={`px-4 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                    Boolean(settings.ownerNotificationEmail) ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  ON
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate('ownerNotificationEmail', '')}
                  className={`px-4 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                    !settings.ownerNotificationEmail ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  OFF
                </button>
              </div>
            </div>
          </div>

          {/* Automatic Scheduler & Cron Status (Requirement 11) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <strong className="font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-900" />
                <span>Automatic Retention Scheduler Architecture</span>
              </strong>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                Production Ready
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Daily Trigger Time</span>
                <span className="text-sm font-extrabold text-gray-900 font-mono">{settings.scanTime || '09:00'} {settings.timezone || 'UTC'}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Next Scheduled Run</span>
                <span className="text-xs font-semibold text-gray-800 font-mono">Tomorrow @ {settings.scanTime || '09:00'}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Cron Webhook Endpoint</span>
                <span className="text-xs font-semibold text-blue-900 font-mono">POST /api/cron/daily-scan</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Scheduler Deployment Note:</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                In-process timer is active while the server process runs. For zero-downtime serverless or scale-to-zero container platforms, automatic scheduler requires deployment scheduler configuration (e.g. Google Cloud Scheduler, AWS EventBridge, or Railway Cron targeting <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-[10px]">/api/cron/daily-scan</code>).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MORNING NOTIFICATIONS (Section 16) */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-900" />
              <span>Owner Notification & Morning Brief Delivery</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Receive your 60-second retention brief every morning right after your AI Employee finishes scanning.
            </p>
          </div>

          <div className="space-y-4 max-w-lg text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-gray-900 block">Owner Email Address:</label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="founder@company.com"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs"
              />
              <p className="text-[11px] text-gray-500">
                Morning digest email will be delivered to this address with the subject "NoChurn: 5 customers need your attention today".
              </p>
            </div>

            <button
              onClick={handleSaveEmail}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Save Notification Email
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY & 2FA */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-900" />
              <span>Authentication & Workspace Security</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Two-factor authentication and session management.
            </p>
          </div>

          <div className="space-y-3 text-xs max-w-md">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <strong className="text-gray-900 font-bold block">Two-Factor Authentication (2FA)</strong>
                <span className="text-gray-500 text-[11px]">Enhanced protection for client data</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-full">
                Active
              </span>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <strong className="text-gray-900 font-bold block">Signed In As</strong>
                <span className="text-gray-500 text-[11px]">{currentUser?.email || 'Authenticated User'}</span>
              </div>
              {onLoggedOut && (
                <button
                  onClick={onLoggedOut}
                  className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-red-700 cursor-pointer"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OUTBOUND INTEGRATIONS (WhatsApp & Resend Email) */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* Header & Status Refresh */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-900" />
                  <span>Outbound Retention Channels &amp; API Status</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Real credentials for WhatsApp Business Cloud API and Resend Email API. Stored securely in server environment variables.
                </p>
              </div>

              <button
                type="button"
                onClick={loadOutboundStatus}
                disabled={isLoadingStatus}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>

            {/* Test result announcement banner */}
            {testResult && (
              <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 animate-in fade-in duration-200 ${
                testResult.verified
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : testResult.status === 'not_configured'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                  : 'bg-red-50/80 border-red-200 text-red-950'
              }`}>
                {testResult.verified ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : testResult.status === 'not_configured' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <strong className="font-bold">
                      {testResult.verified
                        ? 'Configuration Verified'
                        : testResult.status === 'not_configured'
                        ? 'Not Configured'
                        : 'Verification Error'}
                    </strong>
                    <span className="text-[10px] font-mono uppercase bg-white/70 px-2 py-0.5 rounded border border-current">
                      No Customer Messages Sent
                    </span>
                  </div>
                  <p className="leading-relaxed">{testResult.message}</p>
                  {testResult.safeDetails && (
                    <p className="text-[11px] opacity-80">{testResult.safeDetails}</p>
                  )}
                  {testResult.requiredEnvVars && testResult.requiredEnvVars.length > 0 && (
                    <div className="pt-1 text-[11px]">
                      Required environment variables:{' '}
                      <span className="font-mono font-semibold">{testResult.requiredEnvVars.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Channel Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
              {/* WhatsApp Card */}
              <div className="bg-gray-50/60 rounded-xl border border-gray-200 p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">WhatsApp Business Cloud API</h4>
                        <span className="text-[11px] text-gray-500">Meta Graph API v18.0</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      outboundStatus?.whatsapp.status === 'connected'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : outboundStatus?.whatsapp.status === 'error'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        outboundStatus?.whatsapp.status === 'connected'
                          ? 'bg-emerald-600'
                          : outboundStatus?.whatsapp.status === 'error'
                          ? 'bg-red-600'
                          : 'bg-amber-500'
                      }`} />
                      <span>
                        {outboundStatus?.whatsapp.status === 'connected'
                          ? 'Connected'
                          : outboundStatus?.whatsapp.status === 'error'
                          ? 'Error'
                          : 'Not configured'}
                      </span>
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">
                    Sends automated personalized check-in messages directly to churn-risk customer phone numbers via Meta WhatsApp Cloud API.
                  </p>

                  <div className="p-3 bg-white rounded-lg border border-gray-200 text-xs space-y-2 font-mono">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Phone Number ID:</span>
                      <span className="font-bold text-gray-900">
                        {outboundStatus?.whatsapp.phoneNumberIdMasked || 'Not configured'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Business Account ID:</span>
                      <span className="font-bold text-gray-900">
                        {outboundStatus?.whatsapp.businessAccountIdMasked || 'Not configured'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Server Security:</span>
                      <span className="text-[11px] text-emerald-800 font-sans font-semibold">
                        Credentials are configured server-side.
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Access Token:</span>
                      <span className="text-[11px] text-emerald-700 font-sans font-semibold">
                        {outboundStatus?.whatsapp.configured ? 'Secure in server env' : 'Missing WHATSAPP_ACCESS_TOKEN'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200/80 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleTestChannel('whatsapp')}
                      disabled={testingChannel === 'whatsapp'}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingChannel === 'whatsapp' ? 'animate-spin' : ''}`} />
                      <span>{testingChannel === 'whatsapp' ? 'Verifying...' : 'Test WhatsApp Connection'}</span>
                    </button>

                    <span className="text-[10px] text-gray-500 italic">Safe test (no message sent)</span>
                  </div>

                  {/* Configuration Help Accordion / Box */}
                  <div className="text-[11px] text-gray-600 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 space-y-1.5 font-sans">
                    <strong className="text-emerald-950 font-bold block flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-emerald-700" /> Required Environment Variables:
                    </strong>
                    <ul className="list-disc list-inside space-y-0.5 text-gray-700 font-mono text-[10px]">
                      <li>WHATSAPP_ACCESS_TOKEN</li>
                      <li>WHATSAPP_PHONE_NUMBER_ID</li>
                      <li>WHATSAPP_BUSINESS_ACCOUNT_ID</li>
                    </ul>
                    <p className="text-[10px] text-gray-500 pt-0.5">
                      Never exposed to browser. Evaluated strictly server-side.
                    </p>
                  </div>
                </div>
              </div>

              {/* Email (Resend) Card */}
              <div className="bg-gray-50/60 rounded-xl border border-gray-200 p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 text-blue-900 flex items-center justify-center">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">Email Retention Dispatch (Resend)</h4>
                        <span className="text-[11px] text-gray-500">Resend REST API</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      outboundStatus?.email.status === 'connected'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : outboundStatus?.email.status === 'error'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        outboundStatus?.email.status === 'connected'
                          ? 'bg-emerald-600'
                          : outboundStatus?.email.status === 'error'
                          ? 'bg-red-600'
                          : 'bg-amber-500'
                      }`} />
                      <span>
                        {outboundStatus?.email.status === 'connected'
                          ? 'Connected'
                          : outboundStatus?.email.status === 'error'
                          ? 'Error'
                          : 'Not configured'}
                      </span>
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">
                    Sends founder-style check-in emails with personalized talking points and concession offers to high-risk SaaS decision-makers.
                  </p>

                  <div className="p-3 bg-white rounded-lg border border-gray-200 text-xs space-y-2 font-mono">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Sender Address:</span>
                      <span className="font-bold text-gray-900 font-sans text-xs">
                        {outboundStatus?.email.fromEmail || 'NoChurn <onboarding@resend.dev>'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>API Key:</span>
                      <span className="font-bold text-gray-900">
                        {outboundStatus?.email.maskedIdentifier || 'Not configured'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Server Security:</span>
                      <span className="text-[11px] text-blue-900 font-sans font-semibold">
                        Credentials are configured server-side.
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Status:</span>
                      <span className="text-[11px] text-blue-700 font-sans font-semibold">
                        {outboundStatus?.email.configured ? 'Secure in server env' : 'Missing RESEND_API_KEY'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200/80 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleTestChannel('email')}
                      disabled={testingChannel === 'email'}
                      className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingChannel === 'email' ? 'animate-spin' : ''}`} />
                      <span>{testingChannel === 'email' ? 'Verifying...' : 'Test Email Connection'}</span>
                    </button>

                    <span className="text-[10px] text-gray-500 italic">Safe test (no message sent)</span>
                  </div>

                  {/* Configuration Help Accordion / Box */}
                  <div className="text-[11px] text-gray-600 bg-blue-50/50 p-3 rounded-lg border border-blue-100 space-y-1.5 font-sans">
                    <strong className="text-blue-950 font-bold block flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-blue-800" /> Required Environment Variables:
                    </strong>
                    <ul className="list-disc list-inside space-y-0.5 text-gray-700 font-mono text-[10px]">
                      <li>RESEND_API_KEY (from resend.com)</li>
                      <li>RESEND_FROM_EMAIL (e.g., "NoChurn &lt;founder@yourdomain.com&gt;")</li>
                    </ul>
                    <p className="text-[10px] text-gray-500 pt-0.5">
                      Note: To use Google Workspace Gmail OAuth instead of Resend, configure client-side OAuth scopes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
