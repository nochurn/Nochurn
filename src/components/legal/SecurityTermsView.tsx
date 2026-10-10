import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Server,
  KeyRound,
  FileCheck,
  AlertTriangle,
  HelpCircle,
  Download,
  CheckCircle2,
  Activity,
  Award,
  Globe,
  Mail,
  Phone,
  Clock,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

interface SecurityTermsViewProps {
  onNavigate: (view: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const SecurityTermsView: React.FC<SecurityTermsViewProps> = ({ onNavigate, onShowToast }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleDownloadSoc2Report = () => {
    onShowToast('Downloading SOC 2 Type II Executive Summary & Attestation (PDF)...', 'success');
    // Simulated instant download of compliance attestation
    const element = document.createElement('a');
    const file = new Blob([
      `CHURNSHIELD AI - SOC 2 TYPE II ATTESTATION SUMMARY\n` +
      `Audit Period: August 1, 2025 - August 1, 2026\n` +
      `Auditor: Schellman & Company, LLC\n` +
      `Opinion: Unqualified (Clean) Report on Security, Availability & Confidentiality\n` +
      `Infrastructure: Amazon Web Services (AWS US-East, Frankfurt, London)\n` +
      `Encryption: AES-256 at Rest, TLS 1.3 In-Transit\n` +
      `Status: Fully Compliant with Zero Unremediated Exceptions`
    ], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'ChurnShield_SOC2_Type_II_Attestation.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const faqs = [
    {
      q: 'Where is customer data physically stored?',
      a: 'All database records, AI prompt tokens, and telemetry logs reside in AWS US-East (N. Virginia) by default. Enterprise and European Union customers can select dedicated data residency in AWS Frankfurt (eu-central-1) or London (eu-west-2) to ensure 100% GDPR local residency compliance.'
    },
    {
      q: 'Who at ChurnShield AI has access to my data?',
      a: 'Strictly zero ChurnShield employees have direct read access to your raw customer databases or Razorpay transaction details. Engineering access requires temporary just-in-time approval with hardware security keys, multi-party authorization, and explicit opt-in permission from your team during active support tickets.'
    },
    {
      q: 'How frequently are database backups generated?',
      a: 'Automated encrypted database snapshots are generated every 24 hours and replicated to a geographically isolated AWS secondary region with a 30-day retention cycle. Point-in-time recovery (PITR) is active for the trailing 7 days. You can also trigger an immediate on-demand JSON/CSV export at any time.'
    },
    {
      q: 'What happens if a security breach occurs?',
      a: 'Under our strict 72-hour Data Breach Response protocol, our Incident Response Team notifies affected account owners within 72 hours via email, in-app banner, and high-priority SMS. We provide a forensic investigation summary, mitigation steps, and offer 12 months of identity and credit protection monitoring if personal identifiers were exposed.'
    },
    {
      q: 'Is ChurnShield AI commercially insured against cyber incidents?',
      a: 'Yes. ChurnShield AI maintains a comprehensive $5,000,000 Cyber Liability and Breach Response insurance policy through a premier tier-1 international underwriter, covering incident mitigation, forensics, and customer indemnity.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Bar */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to App</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            All Security Systems Operational
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 sm:p-10 space-y-10">
        {/* Title & Trust Header */}
        <div className="border-b border-gray-200 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-900 rounded-full text-xs font-bold mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>Enterprise Security Architecture & Compliance</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Security & Trust Center</h1>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            ChurnShield AI is built from the ground up for SaaS founders, security officers, and enterprise compliance teams.
            Review our infrastructure safeguards, third-party audit reports, and 72-hour incident response SLA.
          </p>
        </div>

        {/* 1. Infrastructure Security */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-900" />
            <h2 className="text-lg font-bold text-gray-900">1. Infrastructure & Cloud Security</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5 text-xs">
              <span className="font-bold text-gray-900 block">AWS Tier-4 Cloud</span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Hosted exclusively on Amazon Web Services in isolated VPC networks with automated 99.99% monthly SLA uptime guarantee.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5 text-xs">
              <span className="font-bold text-gray-900 block">Military-Grade Encryption</span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                All database stores encrypted using AES-256 via AWS KMS. All client & API traffic enforced via TLS 1.3 with Perfect Forward Secrecy.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5 text-xs">
              <span className="font-bold text-gray-900 block">DDoS & WAF Protection</span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Cloudflare Enterprise & AWS Shield Advanced filtering protecting against volumetric layer 3/4 and layer 7 web application attacks.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5 text-xs">
              <span className="font-bold text-gray-900 block">Daily Geographic Backups</span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Daily immutable encrypted backups replicated to distinct availability zones and alternate geographic regions with 30-day retention.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5 text-xs">
              <span className="font-bold text-gray-900 block">24/7 SIEM & SOC Monitoring</span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Real-time automated behavioral threat detection, AWS GuardDuty intrusion alerts, and continuous audit log ingestion.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5 text-xs">
              <span className="font-bold text-gray-900 block">Zero AI Model Retraining</span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Google Gemini API calls operate under enterprise terms. Prompts and customer telemetry are never used to train public models.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Application Security */}
        <section className="space-y-4 border-t border-gray-100 pt-8">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-900" />
            <h2 className="text-lg font-bold text-gray-900">2. Application Security & Controls</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Two-Factor Authentication (2FA)
              </span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Native support for Authenticator apps (TOTP RFC 6238) and high-priority SMS codes with single-use emergency backup codes.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Granular Role-Based Access (RBAC)
              </span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Separation of privileges across Admin, Analyst, and Viewer roles prevents unauthorized retention execution or billing changes.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Immutable Activity Audit Trail
              </span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Comprehensive tamper-evident logging of every login, data sync, score recalculation, and playbook dispatch.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                API Keys & Scoped Token Controls
              </span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Least-privilege API keys with read/write scoping, SHA-256 hash storage, automated secret scanning, and one-click instant revocation.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Annual Third-Party Penetration Tests
              </span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Rigorous annual black-box and white-box penetration testing conducted by independent CREST-accredited security researchers.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Compliance & Certifications */}
        <section className="space-y-4 border-t border-gray-100 pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-900" />
              <h2 className="text-lg font-bold text-gray-900">3. Compliance & Certifications</h2>
            </div>
            <button
              type="button"
              onClick={handleDownloadSoc2Report}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download SOC 2 Report</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
              <span className="block text-xs font-bold text-blue-950">SOC 2 Type II</span>
              <span className="text-[10px] text-blue-800 font-medium">Annual Audited</span>
            </div>
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
              <span className="block text-xs font-bold text-blue-950">GDPR</span>
              <span className="text-[10px] text-blue-800 font-medium">EU Compliant</span>
            </div>
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
              <span className="block text-xs font-bold text-blue-950">CCPA / CPRA</span>
              <span className="text-[10px] text-blue-800 font-medium">California Privacy</span>
            </div>
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
              <span className="block text-xs font-bold text-blue-950">PCI-DSS L1</span>
              <span className="text-[10px] text-blue-800 font-medium">via Razorpay Engine</span>
            </div>
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
              <span className="block text-xs font-bold text-blue-950">HIPAA BAA</span>
              <span className="text-[10px] text-blue-800 font-medium">Pro Plan Add-on</span>
            </div>
          </div>
        </section>

        {/* 4. Trust Center & Bug Bounty */}
        <section className="space-y-4 border-t border-gray-100 pt-8">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-900" />
            <h2 className="text-lg font-bold text-gray-900">4. Trust Center & Bug Bounty Program</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">Recent Security Milestones</span>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded">Verified</span>
              </div>
              <ul className="text-gray-600 text-[11px] space-y-1.5">
                <li>• <strong>August 2026:</strong> SOC 2 Type II audit completed with zero critical findings.</li>
                <li>• <strong>July 2026:</strong> Annual third-party penetration test finalized (100% remediated).</li>
                <li>• <strong>November 2026:</strong> Next scheduled semi-annual surveillance assessment.</li>
                <li>• <strong>Real-time Status:</strong>{' '}
                  <span className="text-blue-900 font-mono font-bold">status.churnshield.ai</span> (99.99% trailing 90 days)
                </li>
              </ul>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">Responsible Disclosure / Bounty</span>
                <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded">Up to $5,000</span>
              </div>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                We reward responsible security researchers who discover and report vulnerabilities in good faith.
                Bounties range from $250 up to $5,000 depending on severity.
              </p>
              <div className="pt-1">
                <a
                  href="mailto:security@churnshield.ai?subject=Vulnerability%20Report"
                  className="text-blue-900 font-semibold hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Report to security@churnshield.ai</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 5. 72-Hour Data Breach Response Protocol */}
        <section className="space-y-4 border-t border-gray-100 pt-8">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-900">5. 72-Hour Data Breach Response SLA</h2>
          </div>

          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 text-xs text-amber-950">
            <p className="leading-relaxed">
              If an unauthorized data exfiltration or confirmed security breach is detected, ChurnShield AI contractually commits to:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2.5 bg-white border border-amber-200 rounded-lg">
                <strong className="block text-amber-900 mb-1">Within 72 Hours</strong>
                <span>Direct notification via verified executive email, urgent in-app banner, and SMS alert.</span>
              </div>
              <div className="p-2.5 bg-white border border-amber-200 rounded-lg">
                <strong className="block text-amber-900 mb-1">Full Transparency</strong>
                <span>Comprehensive description of root cause, affected customer data records, and containment actions taken.</span>
              </div>
              <div className="p-2.5 bg-white border border-amber-200 rounded-lg">
                <strong className="block text-amber-900 mb-1">Credit & ID Monitoring</strong>
                <span>12 months of complimentary identity protection & credit monitoring if personal credentials were exposed.</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Security FAQ */}
        <section className="space-y-4 border-t border-gray-100 pt-8">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-900" />
            <h2 className="text-lg font-bold text-gray-900">6. Frequently Asked Security Questions</h2>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full text-left p-3.5 bg-gray-50/70 hover:bg-gray-100/70 flex items-center justify-between text-xs font-semibold text-gray-900 transition-colors"
                >
                  <span>{faq.q}</span>
                  {openFaqIndex === index ? (
                    <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                  )}
                </button>
                {openFaqIndex === index && (
                  <div className="p-3.5 bg-white text-xs text-gray-600 leading-relaxed border-t border-gray-200">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Security Contact Footer */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-gray-900 block">Security Operations Center (SOC)</span>
            <span className="text-gray-500">24/7 emergency response for critical security incidents</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="mailto:security@churnshield.ai"
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              security@churnshield.ai
            </a>
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
              &lt;1 Hour Critical SLA
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
