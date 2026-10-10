import React, { useState } from 'react';
import {
  FileText,
  Shield,
  Cookie,
  AlertOctagon,
  Mail,
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
  Phone,
  Building,
  ExternalLink,
  MessageSquare,
  BookOpen
} from 'lucide-react';

interface LegalPagesViewProps {
  page: 'terms' | 'dpa' | 'cookies' | 'acceptable-use' | 'contact' | 'help';
  onNavigate: (view: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const LegalPagesView: React.FC<LegalPagesViewProps> = ({ page, onNavigate, onShowToast }) => {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    onShowToast('Support ticket dispatched. Our team responds within 2 hours.', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to App</span>
        </button>

        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => onNavigate('privacy')}
            className="text-gray-600 hover:text-blue-900 hover:underline"
          >
            Privacy
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => onNavigate('security')}
            className="text-gray-600 hover:text-blue-900 hover:underline"
          >
            Security
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 sm:p-10 space-y-8">
        {page === 'terms' && (
          <>
            <div className="border-b border-gray-200 pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-900 rounded-full text-xs font-bold mb-3">
                <FileText className="w-3.5 h-3.5" />
                <span>Enterprise SaaS Master Services Agreement</span>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Terms of Service</h1>
              <p className="text-xs text-gray-500 mt-2">Last Updated: August 28, 2026</p>
            </div>

            <div className="space-y-6 text-xs text-gray-700 leading-relaxed">
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-gray-900">1. Acceptance of Terms</h3>
                <p>
                  By creating an account, accessing, or integrating data into ChurnShield AI ("Service"), you ("Customer") agree to be bound by these Terms of Service. If you are entering into these terms on behalf of a SaaS corporation, you represent that you possess lawful authority to bind the entity.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-gray-900">2. Description of Service & AI Modeling</h3>
                <p>
                  ChurnShield AI processes customer billing logs, telemetry events, and support tickets to calculate predictive churn probabilities (0–100) and draft automated retention recommendations via Google Gemini. Predictions are advisory recommendations designed to assist customer success operations.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-gray-900">3. Customer Data & Intellectual Property</h3>
                <p>
                  Customer retains all right, title, and ownership of all proprietary data ingested into ChurnShield AI. ChurnShield AI does not sell, lease, or monetize customer data to third parties, nor are customer records used to train public foundational AI models.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-gray-900">4. Service Level Agreement (SLA) & Uptime</h3>
                <p>
                  For customers on Growth and Pro plans, ChurnShield AI warrants a 99.99% monthly infrastructure availability SLA. Downtime credits equal 5% of monthly recurring fees for every 30 minutes of unscheduled outage beyond SLA thresholds.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-gray-900">5. Limitation of Liability</h3>
                <p>
                  In no event shall ChurnShield AI's aggregate liability exceed the total amounts paid by Customer in the twelve (12) months preceding the incident giving rise to liability.
                </p>
              </section>
            </div>
          </>
        )}

        {page === 'dpa' && (
          <>
            <div className="border-b border-gray-200 pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-900 rounded-full text-xs font-bold mb-3">
                <Shield className="w-3.5 h-3.5" />
                <span>GDPR Article 28 Compliance</span>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Data Processing Addendum (DPA)</h1>
              <p className="text-xs text-gray-500 mt-2">Governing cross-border processing of EU/EEA and UK personal data</p>
            </div>

            <div className="space-y-6 text-xs text-gray-700 leading-relaxed">
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-gray-900">1. Scope and Applicability</h3>
                <p>
                  This Data Processing Addendum ("DPA") supplements the ChurnShield AI Terms of Service and applies where ChurnShield AI processes Personal Data as a Data Processor on behalf of the Customer (Data Controller) subject to European Union Regulation 2016/679 (GDPR) and the UK Data Protection Act 2018.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-gray-900">2. Processing Instructions</h3>
                <p>
                  Processor will process Personal Data only upon documented instructions from Controller, including with respect to transfers of Personal Data to third countries or international organizations, unless required to do so by applicable law.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-gray-900">3. Standard Contractual Clauses (SCCs)</h3>
                <p>
                  Where transfers of Personal Data originate from the EEA, Switzerland, or the United Kingdom to countries without an adequacy decision, the European Commission's approved Standard Contractual Clauses (Module 2: Controller to Processor) are hereby incorporated by reference.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-gray-900">4. Sub-processors</h3>
                <p>
                  Controller grants general authorization for Processor to engage approved sub-processors (AWS, Razorpay, Google Cloud, Twilio/SendGrid). Processor maintains an active list of sub-processors and provides at least 30 days prior written notice before onboarding any new sub-processor.
                </p>
              </section>
            </div>
          </>
        )}

        {page === 'cookies' && (
          <>
            <div className="border-b border-gray-200 pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-900 rounded-full text-xs font-bold mb-3">
                <Cookie className="w-3.5 h-3.5" />
                <span>ePrivacy & Cookie Disclosure</span>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Cookie Policy</h1>
              <p className="text-xs text-gray-500 mt-2">Explaining how cookies and session storage are used</p>
            </div>

            <div className="space-y-6 text-xs text-gray-700 leading-relaxed">
              <p>
                ChurnShield AI employs minimal, privacy-first session cookies to provide secure authentication, CSRF mitigation, and user interface preferences.
              </p>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="p-3">Cookie Name</th>
                      <th className="p-3">Purpose</th>
                      <th className="p-3">Duration</th>
                      <th className="p-3">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-600">
                    <tr>
                      <td className="p-3 font-mono font-bold text-gray-900">__cs_session</td>
                      <td className="p-3">Encrypted JWT user authentication session</td>
                      <td className="p-3">Session or 90 days if "Remember me"</td>
                      <td className="p-3 text-blue-900 font-semibold">Strictly Necessary</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-bold text-gray-900">__cs_csrf</td>
                      <td className="p-3">Cross-Site Request Forgery security protection</td>
                      <td className="p-3">Session</td>
                      <td className="p-3 text-blue-900 font-semibold">Strictly Necessary</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-bold text-gray-900">__cs_theme</td>
                      <td className="p-3">Stores user preference for UI layout and density</td>
                      <td className="p-3">1 Year</td>
                      <td className="p-3 text-emerald-700 font-semibold">Functional</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-500">
                ChurnShield AI never places third-party behavioral advertising trackers, canvas fingerprinters, or marketing retargeting pixels on your dashboard.
              </p>
            </div>
          </>
        )}

        {page === 'acceptable-use' && (
          <>
            <div className="border-b border-gray-200 pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-900 rounded-full text-xs font-bold mb-3">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Ethical AI & Operations Standard</span>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Acceptable Use Policy</h1>
              <p className="text-xs text-gray-500 mt-2">Rules of conduct and prohibited activities</p>
            </div>

            <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
              <p>
                To safeguard our community and cloud network, all users of ChurnShield AI agree strictly NOT to:
              </p>
              <ul className="space-y-2 list-disc pl-5">
                <li>Reverse engineer, decompile, or extract the underlying proprietary algorithms or machine learning weights.</li>
                <li>Ingest or upload Protected Health Information (PHI) unless a formal HIPAA Business Associate Agreement (BAA) has been executed.</li>
                <li>Submit intentionally fraudulent, forged, or stolen customer billing profiles.</li>
                <li>Execute automated vulnerability fuzzing, denial-of-service stress tests, or unauthorized port scans without written authorization.</li>
                <li>Use automated retention scripts to send unsolicited spam, bulk cold email, or deceptive phishing lures.</li>
              </ul>
            </div>
          </>
        )}

        {page === 'contact' && (
          <>
            <div className="border-b border-gray-200 pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-900 rounded-full text-xs font-bold mb-3">
                <Mail className="w-3.5 h-3.5" />
                <span>Get in Touch with our Executive Team</span>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Contact Us</h1>
              <p className="text-xs text-gray-500 mt-2">We typically reply in under 2 hours on business days</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
              <div className="space-y-4">
                <p className="text-gray-600 leading-relaxed">
                  Have a question about custom Razorpay enterprise integrations, dedicated data residency in Europe, or high-volume plan tiers?
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <Building className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-gray-900">Headquarters</strong>
                      <span className="text-gray-600">ChurnShield AI Inc., 548 Market St, Suite 89201, San Francisco, CA 94104</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <Mail className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-gray-900">General Inquiries</strong>
                      <a href="mailto:hello@churnshield.ai" className="text-blue-900 underline">hello@churnshield.ai</a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <Phone className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-gray-900">Enterprise Phone</strong>
                      <span className="text-gray-600">+1 (415) 890-2144 (24/7 for Pro customers)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl">
                {!contactSubmitted ? (
                  <form onSubmit={handleContactSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Your Name</label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Nagesh Sharat"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Work Email</label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">How can we help?</label>
                      <textarea
                        rows={3}
                        required
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Tell us about your SaaS MRR, customer volume, or custom integration questions..."
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                      ></textarea>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 px-3 bg-blue-900 text-white rounded-lg font-bold text-xs hover:bg-blue-800 transition-colors shadow-2xs"
                    >
                      Send Message
                    </button>
                  </form>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <h4 className="font-bold text-emerald-950 text-sm">Message Received!</h4>
                    <p className="text-emerald-800 text-xs">
                      Thank you for contacting ChurnShield AI. A customer engineer will reach out to you within 2 hours.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {page === 'help' && (
          <>
            <div className="border-b border-gray-200 pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-900 rounded-full text-xs font-bold mb-3">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Knowledge Base & Support Documentation</span>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Support & Help Center</h1>
              <p className="text-xs text-gray-500 mt-2">Guides on churn prediction scoring, playbooks, and integrations</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <span className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
                  <Shield className="w-4 h-4 text-blue-900" />
                  Understanding the 0-100 Risk Score
                </span>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Scores 0-30 are Green (Healthy), 31-60 Yellow (Elevated Risk), 61-85 Orange (High Risk), and 86-100 Red (Critical Danger). The score evaluates payment status, usage contractions, unresolved support tickets, and email open dips.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <span className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
                  <MessageSquare className="w-4 h-4 text-blue-900" />
                  Executing Retention Playbooks
                </span>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Every at-risk customer card has a generated one-click retention playbook featuring an executive call script, personalized email, and calculated recovery probability.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <span className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
                  <FileText className="w-4 h-4 text-blue-900" />
                  Connecting Billing via Razorpay
                </span>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Navigate to Data Integrations, enter your Razorpay Key ID and Key Secret, and ChurnShield AI will automatically sync failed invoices, subscription webhooks, and customer MRR every 24 hours.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <span className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
                  <HelpCircle className="w-4 h-4 text-blue-900" />
                  Contacting Priority Support
                </span>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Reach our customer success engineers directly via email at <strong className="text-blue-900">support@churnshield.ai</strong> or through your dedicated account Slack channel.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
