import React, { useState } from 'react';
import {
  Smartphone,
  Mail,
  Shield,
  X,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Info,
  Sliders
} from 'lucide-react';

interface OutboundConfigGuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: 'whatsapp' | 'email';
  onNavigateToSettings?: () => void;
}

export const OutboundConfigGuidanceModal: React.FC<OutboundConfigGuidanceModalProps> = ({
  isOpen,
  onClose,
  channel,
  onNavigateToSettings
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isWa = channel === 'whatsapp';

  const envSnippet = isWa
    ? `# WhatsApp Business Cloud API (Server-Side Secrets)
WHATSAPP_ACCESS_TOKEN="your_permanent_or_system_user_token"
WHATSAPP_PHONE_NUMBER_ID="your_meta_phone_number_id"
WHATSAPP_BUSINESS_ACCOUNT_ID="your_meta_business_account_id"`
    : `# Resend Email API (Server-Side Secrets)
RESEND_API_KEY="re_123456789abcdef..."
RESEND_FROM_EMAIL="NoChurn <onboarding@resend.dev>"`;

  const handleCopySnippet = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(envSnippet);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isWa
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-blue-100 text-blue-900 border border-blue-200'
              }`}
            >
              {isWa ? <Smartphone className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">
                {isWa ? 'WhatsApp Sending Is Not Configured Yet' : 'Email Sending Is Not Configured Yet'}
              </h3>
              <p className="text-xs text-gray-500">
                {isWa ? 'Meta WhatsApp Business Cloud API' : 'Resend Email API'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning & Policy Notice */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Real Provider Required — No Fake Sending</p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              NoChurn strictly rejects fake dispatch or simulated delivery. Messages are only marked SENT when the external provider confirms successful dispatch.
            </p>
          </div>
        </div>

        {/* Configuration Instructions */}
        <div className="space-y-3 text-xs">
          <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-900" />
            <span>Required Server-Side Environment Variables</span>
          </h4>

          <div className="relative bg-slate-900 text-slate-100 rounded-xl p-3.5 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800">
            <button
              onClick={handleCopySnippet}
              className="absolute top-2.5 right-2.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-sans font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <pre className="pr-16 whitespace-pre-wrap">{envSnippet}</pre>
          </div>

          <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3 space-y-1.5 text-[11px] text-gray-600">
            <p className="flex items-center gap-1 font-semibold text-gray-800">
              <Info className="w-3.5 h-3.5 text-blue-900" /> How to configure:
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-1 text-gray-700">
              <li>Add the environment variables to your deployment environment or <code className="bg-gray-200/80 px-1 py-0.5 rounded text-[10px]">.env</code> file.</li>
              <li>Secrets are evaluated strictly server-side and never exposed to the browser bundle.</li>
              <li>
                {isWa
                  ? 'Verify your Meta Phone Number ID and System User token.'
                  : 'Get an API key from resend.com or configure custom verified sending domain.'}
              </li>
              <li>
                Visit <strong>Settings &gt; Outbound Integrations</strong> to run a safe verification test without sending customer messages.
              </li>
            </ol>
            {!isWa && (
              <p className="text-[10px] text-blue-800 pt-1 italic">
                Note: If your team prefers direct Google Workspace Gmail OAuth instead of Resend, configure client-side OAuth scopes.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>

          <div className="flex items-center gap-2">
            {onNavigateToSettings && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToSettings();
                }}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Go to Outbound Settings</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
