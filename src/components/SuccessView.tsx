import React from 'react';
import {
  CheckCircle2,
  Shield,
  ArrowRight,
  Sparkles,
  CreditCard,
  Check,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { CENTRAL_PRICING, normalizePlanTier } from '../config/pricing';

interface SuccessViewProps {
  sessionId?: string;
  plan?: string;
  billing?: 'monthly' | 'annual';
  amount?: number | string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({
  sessionId,
  plan = 'growth',
  billing = 'monthly',
  amount,
  onNavigate
}) => {
  const normPlan = normalizePlanTier(plan);
  const planDetails = CENTRAL_PRICING[normPlan];
  const planName = planDetails.displayName;
  const isAnnual = billing === 'annual';

  const defaultAmount = isAnnual
    ? planDetails.annual.totalAmountUsd
    : planDetails.monthly.amountUsd;

  const displayAmount = amount
    ? (String(amount).startsWith('$') ? String(amount) : `$${Number(amount).toLocaleString('en-US')}`)
    : `$${defaultAmount.toLocaleString('en-US')}`;

  // Next billing date: 1 month or 1 year from now
  const nextBillingDate = new Date(Date.now() + (isAnnual ? 365 : 30) * 86400000).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="min-h-[calc(100vh-14rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 sm:p-10 text-center">
          {/* Animated Success Badge */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-6 shadow-xs animate-in zoom-in-50 duration-300">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
            <Check className="w-3.5 h-3.5" />
            Payment Successful &amp; Subscription Active
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Welcome to ChurnShield AI!
          </h1>
          <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto leading-relaxed">
            Your subscription has been activated successfully via Razorpay. Your account is fully configured and ready.
          </p>

          {/* Transaction & Session Receipt Card */}
          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-5 text-left text-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <span className="text-gray-500 font-medium">Plan Name</span>
              <span className="font-bold text-blue-900">
                {planName} Plan
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <span className="text-gray-500 font-medium">Billing Cadence</span>
              <span className="font-semibold text-gray-800">
                {isAnnual ? 'Annual (2 Months Free)' : 'Monthly'}
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <span className="text-gray-500 font-medium">Amount Paid</span>
              <span className="font-bold text-emerald-700">
                {displayAmount}
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <span className="text-gray-500 font-medium">Next Billing Date</span>
              <span className="flex items-center gap-1.5 text-gray-700 font-medium">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {nextBillingDate}
              </span>
            </div>

            {sessionId && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Razorpay Subscription / Payment ID</span>
                <span className="font-mono text-[11px] text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                  {sessionId}
                </span>
              </div>
            )}
          </div>

          {/* Unlocked Features */}
          <div className="mt-6 bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-left">
            <div className="text-xs font-bold text-blue-950 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-700" />
              What's unlocked for your workspace:
            </div>
            <ul className="text-xs text-blue-900 space-y-1.5">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span>Automated churn scoring with 30/60/90-day predictions</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span>Daily 9:00 AM At-Risk Customer Digests with notifications</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span>Personalized retention email playbooks and executive scripts</span>
              </li>
            </ul>
          </div>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              id="cta-go-to-dashboard"
              onClick={() => onNavigate('dashboard')}
              className="w-full sm:w-auto px-6 py-3 bg-[#1E3A8A] hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
