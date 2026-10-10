import React from 'react';
import { Shield, Lock, ExternalLink, Heart } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Shield className="w-4 h-4 text-blue-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 tracking-tight">NoChurn</span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-sm">
                  SOC 2 Type II
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Know which customers are likely to churn before they do.
              </p>
            </div>
          </div>

          {/* Core Footer Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-gray-600">
            <button
              type="button"
              onClick={() => onNavigate('terms')}
              className="hover:text-blue-900 transition-colors"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => onNavigate('privacy')}
              className="hover:text-blue-900 transition-colors"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => onNavigate('security')}
              className="hover:text-blue-900 transition-colors flex items-center gap-1"
            >
              <Lock className="w-3 h-3 text-blue-900" />
              <span>Security & Trust</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dpa')}
              className="hover:text-blue-900 transition-colors"
            >
              DPA
            </button>
            <button
              type="button"
              onClick={() => onNavigate('cookies')}
              className="hover:text-blue-900 transition-colors"
            >
              Cookies
            </button>
            <button
              type="button"
              onClick={() => onNavigate('acceptable-use')}
              className="hover:text-blue-900 transition-colors"
            >
              Acceptable Use
            </button>
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="hover:text-blue-900 transition-colors"
            >
              Contact
            </button>
            <button
              type="button"
              onClick={() => onNavigate('help')}
              className="hover:text-blue-900 transition-colors"
            >
              Support
            </button>
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-700">
          <div>
            © {new Date().getFullYear()} NoChurn Inc. All rights reserved. Data processed under strict GDPR Standard Contractual Clauses.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>All Systems Operational (99.99%)</span>
            </span>
            <span>•</span>
            <span>AES-256 / TLS 1.3</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
