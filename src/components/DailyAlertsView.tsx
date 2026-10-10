import React, { useState } from 'react';
import {
  BellRing,
  Send,
  Check,
  Clock,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { DailyAlert } from '../types';
import { formatCurrency } from '../utils/formatters';

interface DailyAlertsViewProps {
  alerts: DailyAlert[];
  onOpenCustomer: (id: string) => void;
  onSendTestDigest: (email: string, slackWebhook?: string) => Promise<any>;
}

export const DailyAlertsView: React.FC<DailyAlertsViewProps> = ({
  alerts,
  onOpenCustomer,
  onSendTestDigest
}) => {
  const [recipientEmail, setRecipientEmail] = useState('founder@saas.com');
  const [slackWebhook, setSlackWebhook] = useState('https://hooks.slack.com/services/T00/B00/XXXX');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [isSending, setIsSending] = useState(false);
  const [testSentResult, setTestSentResult] = useState<string | null>(null);

  const handleTestTrigger = async () => {
    setIsSending(true);
    try {
      const res = await onSendTestDigest(recipientEmail, slackWebhook);
      setTestSentResult(`Digest simulated! Sample alert sent to ${recipientEmail} and Slack webhook.`);
      setTimeout(() => setTestSentResult(null), 6000);
    } catch (err: any) {
      alert('Error sending test alert: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Daily 9:00 AM Churn Alerts</h2>
            <span className="text-xs font-semibold bg-blue-50 text-blue-900 px-2 py-0.5 rounded-full border border-blue-200">
              Active Schedule
            </span>
          </div>
          <p className="text-xs text-gray-700 mt-1">
            Automated morning digests sent to your inbox and founder Slack channels with 1-click playbook links.
          </p>
        </div>

        <button
          onClick={handleTestTrigger}
          disabled={isSending}
          className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          {isSending ? 'Dispatching Test Digest...' : 'Dispatch Test Alert Now'}
        </button>
      </div>

      {testSentResult && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {testSentResult}
        </div>
      )}

      {/* Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email Digest Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-900" />
            Executive Email Digest
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Recipient Founder/CSM Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Morning Dispatch Schedule</label>
              <select
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                <option value="08:00">8:00 AM (Early morning brief)</option>
                <option value="09:00">9:00 AM Local Time (Standard)</option>
                <option value="10:00">10:00 AM (Post stand-up)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Slack Webhook Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            Slack Channel Webhook Alert
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Incoming Webhook URL</label>
              <input
                type="text"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-[11px] text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
              />
            </div>

            <div className="p-2.5 bg-blue-50/70 border border-blue-200/60 rounded-lg text-[11px] text-blue-950">
              Posts instant notifications to <strong>#retention-alerts</strong> whenever an account crosses risk score 61.
            </div>
          </div>
        </div>
      </div>

      {/* Live Sample Slack Message Mockup */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
          Slack Notification Format Preview (Simulated)
        </h4>

        <div className="bg-gray-900 text-white rounded-xl p-4 font-mono text-xs space-y-2 border border-gray-800">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <BellRing className="w-3.5 h-3.5" />
            <span>[ChurnShield AI] Morning Churn Alert • 9:00 AM</span>
          </div>

          <p className="text-gray-300 font-sans text-xs">
            ⚠️ <strong>3 customers became high-risk today ($4,200 MRR at risk).</strong>
          </p>

          <div className="p-3 bg-gray-800/90 rounded-lg border-l-4 border-red-500 font-sans text-xs space-y-1">
            <div className="font-bold text-white flex items-center justify-between">
              <span>Top Risk: Acme Corp</span>
              <span className="text-red-400 font-bold">Score: 92 (Critical)</span>
            </div>
            <p className="text-gray-300 text-[11px]">
              MRR: $2,400/mo • Reason: Zero logins in 21 days + 1 failed invoice retry.
            </p>
            <div className="pt-1.5 flex gap-2">
              <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">
                1-Click: Open Retention Playbook
              </span>
              <span className="px-2 py-0.5 bg-gray-700 text-gray-200 rounded text-[10px]">
                Copy Email Script
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts Feed */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Recent Dispatched Alerts History</h3>

        <div className="space-y-3">
          {alerts.map((al) => (
            <div
              key={al.id}
              className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span className="font-bold text-xs text-gray-900">{al.title}</span>
                </div>
                <span className="text-[11px] text-gray-700">{al.sentAt}</span>
              </div>

              <div className="text-xs text-gray-700">
                Identified <strong>{al.customersCount} accounts</strong> with <strong>{formatCurrency(al.mrrAtRisk)} MRR</strong> at risk.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {al.customers.map((cust) => (
                  <div
                    key={cust.id}
                    onClick={() => onOpenCustomer(cust.id)}
                    className="p-2.5 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-bold text-gray-900">{cust.name}</span>
                      <span className="text-[11px] text-gray-700 block truncate max-w-[220px]">
                        {cust.reason}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-red-600 font-bold">Score {cust.score}</span>
                      <span className="text-[10px] text-blue-900 block font-semibold">View →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
