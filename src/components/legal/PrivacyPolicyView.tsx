import React from 'react';
import {
  Shield,
  Lock,
  FileText,
  Mail,
  CheckCircle2,
  Database,
  Globe,
  Download,
  AlertTriangle,
  Server,
  UserCheck,
  Building,
  ArrowLeft
} from 'lucide-react';

interface PrivacyPolicyViewProps {
  onNavigate: (view: string) => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to App</span>
        </button>

        <span className="text-xs text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
          Effective Date: August 28, 2026 | Version 2.4
        </span>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 sm:p-10 space-y-8">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-900 rounded-full text-xs font-bold mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>GDPR & CCPA Compliant Privacy Policy</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">ChurnShield AI Privacy Policy</h1>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            At ChurnShield AI, we treat customer data protection and algorithmic transparency as fundamental engineering principles.
            This policy describes how we collect, process, safeguard, and manage your information and your subscribers' SaaS usage metrics.
          </p>
        </div>

        {/* Section 1: Data Collected */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h2 className="text-lg font-bold text-gray-900">Information We Collect</h2>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            We collect only the telemetry and customer attributes necessary to accurately compute predictive churn probability and generate automated retention workflows:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-900" />
                Account & Identity Information
              </span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Work email address, user full name, SaaS company legal entity name, and optional mobile telephone numbers used strictly for SMS Two-Factor Authentication.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-900" />
                SaaS Customer Telemetry Data
              </span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Data uploaded via CSV or synchronized via official Razorpay, Mixpanel, Intercom, and SendGrid APIs, including login frequencies, usage volume trends, ticket counts, and plan tiers.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-900" />
                App Usage & Telemetry
              </span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Platform feature interactions, session durations, active browser/OS versions, and masked IP addresses recorded for session security and suspicious activity monitoring.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-900" />
                Payment & Billing Information
              </span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                All subscription billing is processed directly by Razorpay (PCI-DSS Level 1 certified). ChurnShield AI never stores raw credit card numbers or banking secrets.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: How We Use Information */}
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h2 className="text-lg font-bold text-gray-900">How We Use Collected Information</h2>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
            <li className="flex items-start gap-2 p-2.5 bg-gray-50/70 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Provide Core Service:</strong> Calculate 0–100 churn risk scores, 30/60/90-day probability curves, and automated retention playbooks via Google Gemini.</span>
            </li>
            <li className="flex items-start gap-2 p-2.5 bg-gray-50/70 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Product Improvement:</strong> Benchmark aggregated, fully anonymized predictive precision to refine machine learning scoring weights.</span>
            </li>
            <li className="flex items-start gap-2 p-2.5 bg-gray-50/70 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Operational Communications:</strong> Dispatch daily 9:00 AM churn digests, critical risk alerts, executive summaries, and support ticket resolutions.</span>
            </li>
            <li className="flex items-start gap-2 p-2.5 bg-gray-50/70 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Legal & Compliance:</strong> Comply with international tax regulations, accounting audits, and bona fide law enforcement subpoenas.</span>
            </li>
          </ul>
        </section>

        {/* Section 3: Third Parties Shared With */}
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h2 className="text-lg font-bold text-gray-900">Third-Party Service Providers</h2>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            We partner with enterprise sub-processors under strict Data Protection Agreements (DPAs) that mandate confidentiality and prohibit secondary data utilization:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border border-gray-200 rounded-xl text-xs overflow-hidden">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-3">Partner / Provider</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Data Handled</th>
                  <th className="p-3">Security Standard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-600">
                <tr>
                  <td className="p-3 font-semibold text-gray-900">Razorpay Software Private Limited</td>
                  <td className="p-3">Payment Processing</td>
                  <td className="p-3">Billing tokenization, invoices, subscriptions</td>
                  <td className="p-3 text-emerald-700 font-medium">PCI-DSS Level 1</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-900">Amazon Web Services (AWS)</td>
                  <td className="p-3">Cloud Hosting & Database</td>
                  <td className="p-3">Encrypted database records & backups</td>
                  <td className="p-3 text-emerald-700 font-medium">SOC 2 Type II, ISO 27001</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-900">Google Cloud (Gemini AI)</td>
                  <td className="p-3">AI Prediction Engine</td>
                  <td className="p-3">Anonymized customer usage prompts</td>
                  <td className="p-3 text-emerald-700 font-medium">Zero Data Retention for Training</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-900">SendGrid / Twilio</td>
                  <td className="p-3">Transactional Email & SMS</td>
                  <td className="p-3">Email digests, 2FA verification codes</td>
                  <td className="p-3 text-emerald-700 font-medium">SOC 2 Type II, HIPAA eligible</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-900">Mixpanel, Inc.</td>
                  <td className="p-3">Product Analytics (Anonymized)</td>
                  <td className="p-3">Anonymized user engagement & retention telemetry</td>
                  <td className="p-3 text-emerald-700 font-medium">SOC 2 Type II, Masked Identifiers</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: Data Protection & Security */}
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h2 className="text-lg font-bold text-gray-900">Data Protection & Encryption</h2>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Our multi-layered defense-in-depth architecture ensures total isolation and privacy:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
              <strong className="text-blue-950 block mb-1">Cryptographic Standard</strong>
              <p className="text-gray-600 text-[11px]">
                AES-256 encryption at rest for all database volumes, and TLS 1.3 in-transit for all incoming and outbound API traffic with strict HSTS.
              </p>
            </div>
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
              <strong className="text-blue-950 block mb-1">Access Controls & RBAC</strong>
              <p className="text-gray-600 text-[11px]">
                Role-based access control (Admin, Analyst, Viewer), enforced 2FA, biometric authentication support, and isolated tenant schemas.
              </p>
            </div>
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
              <strong className="text-blue-950 block mb-1">Third-Party Auditing</strong>
              <p className="text-gray-600 text-[11px]">
                Continuous SOC 2 Type II verification, automated dependency scanning, and annual gray-box penetration testing.
              </p>
            </div>
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
              <strong className="text-blue-950 block mb-1">Geographic Backups</strong>
              <p className="text-gray-600 text-[11px]">
                Automated daily encrypted database snapshots replicated across geographically separated AWS availability zones with 30-day retention.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Your Rights */}
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-xs">
              5
            </div>
            <h2 className="text-lg font-bold text-gray-900">Your Privacy Rights (GDPR & CCPA)</h2>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Regardless of your geographic location, ChurnShield AI grants all customers full sovereign authority over their data:
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg flex items-start gap-2">
              <span className="font-bold text-gray-900 min-w-[90px]">Right to Access:</span>
              <span className="text-gray-600">Download a full machine-readable archive of all customer profiles and scores at any time from your settings page.</span>
            </div>
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg flex items-start gap-2">
              <span className="font-bold text-gray-900 min-w-[90px]">Right to Rectify:</span>
              <span className="text-gray-600">Update, modify, or correct any synced customer attributes, names, or contact notes with instant database propagation.</span>
            </div>
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg flex items-start gap-2">
              <span className="font-bold text-gray-900 min-w-[90px]">Right to Erase:</span>
              <span className="text-gray-600">Execute permanent account and customer data erasure (includes a 30-day grace period for accidental deletion recovery).</span>
            </div>
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg flex items-start gap-2">
              <span className="font-bold text-gray-900 min-w-[90px]">Portability:</span>
              <span className="text-gray-600">Export complete records in standard CSV or structured JSON formats without proprietary lock-in.</span>
            </div>
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg flex items-start gap-2">
              <span className="font-bold text-gray-900 min-w-[90px]">Opt-Out:</span>
              <span className="text-gray-600">Opt out of non-essential product announcements or marketing emails at any time with a single click.</span>
            </div>
          </div>
        </section>

        {/* Section 6: Data Retention */}
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-xs">
              6
            </div>
            <h2 className="text-lg font-bold text-gray-900">Data Retention Periods</h2>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            • <strong>Active Accounts:</strong> Retained indefinitely while your SaaS subscription is active.<br />
            • <strong>Canceled Accounts:</strong> Preserved for 90 days (configurable down to 0 days upon written request) before automated cryptographic purging.<br />
            • <strong>Database Backups:</strong> Rotated and overwritten automatically every 30 days.<br />
            • <strong>Accounting & Invoices:</strong> Retained for 7 years to satisfy statutory tax compliance mandates.
          </p>
        </section>

        {/* Section 7: International Data Transfers */}
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-xs">
              7
            </div>
            <h2 className="text-lg font-bold text-gray-900">International Data Transfers</h2>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Data may be processed in secure AWS data centers in the United States, European Union (Frankfurt), or United Kingdom (London) depending on your residency selection. All cross-border transfers from the EEA, Switzerland, and UK are governed by the European Commission's approved <strong>Standard Contractual Clauses (SCCs)</strong>.
          </p>
        </section>

        {/* Section 8: Children's Privacy */}
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-xs">
              8
            </div>
            <h2 className="text-lg font-bold text-gray-900">Children's Privacy</h2>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            ChurnShield AI is strictly an enterprise business-to-business platform. It is not intended for or directed toward individuals under the age of 13 (or under 16 in the European Union). We do not knowingly collect personal data from children.
          </p>
        </section>

        {/* Section 9: Changes to Policy */}
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-xs">
              9
            </div>
            <h2 className="text-lg font-bold text-gray-900">Changes to This Privacy Policy</h2>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            We may periodically update this Privacy Policy. For material modifications, we will notify you by prominent in-app notification and email at least 30 days before changes take effect. Continued use of ChurnShield AI following notice constitutes acceptance.
          </p>
        </section>

        {/* Section 10: Contact Information & DPO */}
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-xs">
              10
            </div>
            <h2 className="text-lg font-bold text-gray-900">Contact Us & Data Protection Officer (DPO)</h2>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-2">
            <p className="text-gray-700">
              For questions, GDPR requests, or DPA execution, contact our designated Data Protection Officer:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-gray-800">
              <div>
                <strong>Privacy Operations:</strong>{' '}
                <a href="mailto:privacy@churnshield.ai" className="text-blue-900 underline">
                  privacy@churnshield.ai
                </a>
              </div>
              <div>
                <strong>EU / UK DPO:</strong>{' '}
                <a href="mailto:dpo@churnshield.ai" className="text-blue-900 underline">
                  dpo@churnshield.ai
                </a>
              </div>
              <div>
                <strong>Legal Headquarters:</strong> ChurnShield AI Inc., 548 Market St, Suite 89201, San Francisco, CA 94104
              </div>
              <div>
                <strong>Response Window:</strong> Guaranteed response within 2 business days.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
