import React, { useState } from 'react';
import { Customer, CustomerRetentionAction } from '../types';
import { X, Mail, Copy, Check, Clock, Sparkles, Send, AlertCircle } from 'lucide-react';

interface QuickEmailModalProps {
  customer: Customer;
  actionItem?: CustomerRetentionAction;
  onClose: () => void;
  onMarkContacted: (customerId: string) => void;
}

export const QuickEmailModal: React.FC<QuickEmailModalProps> = ({
  customer,
  actionItem,
  onClose,
  onMarkContacted
}) => {
  const initialSubject =
    actionItem?.actionEmailDraft?.subject ||
    customer.retentionRecommendation?.emailScript.split('\n')[0].replace(/^Subject:\s*/i, '') ||
    `Personal check-in regarding ${customer.name}'s workspace`;

  const initialBody =
    actionItem?.actionEmailDraft?.body ||
    customer.retentionRecommendation?.emailScript ||
    `Hi ${customer.adminName || 'Team'},\n\nI noticed some recent friction in your telemetry and wanted to reach out personally.\n\nCould we connect for 10 minutes this week to ensure everything is operating smoothly?\n\nBest,\nCustomer Success Team`;

  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const fullText = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyAndMark = () => {
    handleCopy();
    onMarkContacted(customer.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700/60 flex items-center justify-center border border-blue-400/30">
              <Mail className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Retention Email Draft: {customer.name}</h3>
                <span className="text-[10px] bg-blue-800 text-blue-200 px-2 py-0.5 rounded-full font-bold">
                  {customer.email}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Target Admin: <strong>{customer.adminName || 'Account Sponsor'}</strong> • {customer.companyCity || 'HQ'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Metadata pill bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              Est. Effort: {customer.retentionRecommendation?.effortMinutes || 20} mins
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              Recovery Probability: {customer.retentionRecommendation?.recoveryProbability || 45}%
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 border border-blue-200 font-semibold">
              Suggested Channel: {customer.retentionRecommendation?.suggestedChannel || 'Email'}
            </span>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Email Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Personalized Email Body
            </label>
            <textarea
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl text-xs font-mono text-gray-800 leading-relaxed focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          {/* AI Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Human-in-the-Loop Required:</strong> AI recommendations provide tailored talking points based on usage drops and ticket history. Please review and customize before sending.
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCopyAndMark}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Copy Email & Mark "Contacted"</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
