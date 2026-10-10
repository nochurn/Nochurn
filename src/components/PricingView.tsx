import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  Zap,
  Sparkles,
  Gift,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  CreditCard,
  Calendar,
  MessageSquare,
  Building,
  User,
  Mail,
  Lock,
  ExternalLink,
  Smartphone,
  Building2,
  Wallet
} from 'lucide-react';
import { authService } from '../services/authService';
import { apiService } from '../services/api';
import { TrialVerificationModal } from './TrialVerificationModal';
import {
  AUTHORITATIVE_PLANS,
  ONE_TIME_PAYMENT_DISCLOSURE,
  RECURRING_MANDATE_DISCLOSURE,
  buildRazorpayOneTimeOptions,
  buildRazorpaySubscriptionOptions
} from '../services/razorpayConfig';

import { CENTRAL_PRICING } from '../config/pricing';

interface PricingTierConfig {
  id: 'starter' | 'growth' | 'pro';
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  annualTotalPrice: number;
  annualSavingsBadge: string;
  customersIncluded: string;
  description: string;
  isPopular?: boolean;
  features: string[];
}

const PRICING_TIERS_CONFIG: PricingTierConfig[] = [
  {
    id: 'starter',
    name: CENTRAL_PRICING.starter.displayName,
    monthlyPrice: CENTRAL_PRICING.starter.monthly.amountUsd,
    annualPrice: CENTRAL_PRICING.starter.annual.monthlyEquivalentUsd,
    annualTotalPrice: CENTRAL_PRICING.starter.annual.totalAmountUsd,
    annualSavingsBadge: CENTRAL_PRICING.starter.annual.savingsBadge,
    customersIncluded: CENTRAL_PRICING.starter.customersIncluded,
    description: CENTRAL_PRICING.starter.description,
    features: CENTRAL_PRICING.starter.features
  },
  {
    id: 'growth',
    name: CENTRAL_PRICING.growth.displayName,
    monthlyPrice: CENTRAL_PRICING.growth.monthly.amountUsd,
    annualPrice: CENTRAL_PRICING.growth.annual.monthlyEquivalentUsd,
    annualTotalPrice: CENTRAL_PRICING.growth.annual.totalAmountUsd,
    annualSavingsBadge: CENTRAL_PRICING.growth.annual.savingsBadge,
    customersIncluded: CENTRAL_PRICING.growth.customersIncluded,
    description: CENTRAL_PRICING.growth.description,
    isPopular: true,
    features: CENTRAL_PRICING.growth.features
  },
  {
    id: 'pro',
    name: CENTRAL_PRICING.pro.displayName,
    monthlyPrice: CENTRAL_PRICING.pro.monthly.amountUsd,
    annualPrice: CENTRAL_PRICING.pro.annual.monthlyEquivalentUsd,
    annualTotalPrice: CENTRAL_PRICING.pro.annual.totalAmountUsd,
    annualSavingsBadge: CENTRAL_PRICING.pro.annual.savingsBadge,
    customersIncluded: CENTRAL_PRICING.pro.customersIncluded,
    description: CENTRAL_PRICING.pro.description,
    features: CENTRAL_PRICING.pro.features
  }
];

interface PricingViewProps {
  onSelectPlan?: (tierId: string) => void;
  onNavigate?: (view: string, params?: Record<string, string>) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  initialPlan?: string;
  routeParams?: Record<string, string>;
}

export const PricingView: React.FC<PricingViewProps> = ({
  onSelectPlan,
  onNavigate,
  onShowToast,
  initialPlan = 'growth',
  routeParams
}) => {
  const currentUser = authService.getCurrentUser();
  const isTrialExpired =
    routeParams?.expired === 'true' ||
    currentUser?.billingStatus === 'trial_expired' ||
    Boolean(currentUser?.trialEndDate && new Date(currentUser.trialEndDate).getTime() <= Date.now() && currentUser.billingStatus !== 'active');

  // Annual toggle: false = Monthly, true = Annual (save 17%)
  const [isAnnual, setIsAnnual] = useState<boolean>(false);
  // Pre-selected plan persists after toggle
  const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan || 'growth');

  // Inline form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [salesNotes, setSalesNotes] = useState('');
  const [calendlyModalOpen, setCalendlyModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationTier, setVerificationTier] = useState<'starter' | 'growth' | 'pro'>('growth');
  const [exchangeRate, setExchangeRate] = useState<number>(86.85);
  const [displayRate, setDisplayRate] = useState<string>('1 USD = ₹86.85');

  React.useEffect(() => {
    apiService.fetchExchangeRate().then(res => {
      if (res.rate) {
        setExchangeRate(res.rate);
        setDisplayRate(res.displayRate || `1 USD = ₹${res.rate.toFixed(2)}`);
      }
    }).catch(() => {});
  }, []);

  // Referral link state
  const [copiedReferral, setCopiedReferral] = useState(false);
  const referralLink = 'https://nochurn.com/ref/nagesh299';

  const signupFormRef = useRef<HTMLDivElement>(null);

  // Active tier object based on current selectedPlan
  const activeTier = PRICING_TIERS_CONFIG.find((t) => t.id === selectedPlan) || PRICING_TIERS_CONFIG[1];

  // Active price in dollars (for charge / query params)
  const activeChargePrice = isAnnual ? activeTier.annualTotalPrice : activeTier.monthlyPrice;
  // Per month display rate
  const activeMonthlyRate = isAnnual ? activeTier.annualPrice : activeTier.monthlyPrice;

  // Dedicated $1 Verification checkout launcher
  const handleStartTrialVerification = (planId: 'starter' | 'growth' | 'pro') => {
    setSelectedPlan(planId);
    setVerificationTier(planId);
    setVerificationModalOpen(true);
    if (onSelectPlan) {
      onSelectPlan(planId);
    }
  };

  // Plan Selection handler
  const handleSelectPlan = async (planId: string, triggerVerification: boolean = false) => {
    setSelectedPlan(planId);
    try {
      localStorage.setItem('nochurn_selected_plan', planId);
    } catch (e) {
      // Ignored
    }
    if (onSelectPlan) {
      onSelectPlan(planId);
    }

    const tier = PRICING_TIERS_CONFIG.find((t) => t.id === planId) || PRICING_TIERS_CONFIG[1];
    const priceVal = isAnnual ? tier.annualTotalPrice : tier.monthlyPrice;
    const billingVal = isAnnual ? 'annual' : 'monthly';

    // Auto-fill hidden input fields in DOM immediately
    const planInputs = document.querySelectorAll('input[name="plan"]');
    planInputs.forEach((el) => {
      (el as HTMLInputElement).value = planId;
    });
    const priceInputs = document.querySelectorAll('input[name="price"]');
    priceInputs.forEach((el) => {
      (el as HTMLInputElement).value = String(priceVal);
    });
    const cycleInputs = document.querySelectorAll('input[name="billing-cycle"]');
    cycleInputs.forEach((el) => {
      (el as HTMLInputElement).value = billingVal;
    });

    if (triggerVerification) {
      handleStartTrialVerification(planId as 'starter' | 'growth' | 'pro');
    }
  };

  // Direct redirection to /signup?plan=...&price=...
  const handleRedirectToSignup = () => {
    const priceVal = isAnnual ? activeTier.annualTotalPrice : activeTier.monthlyPrice;
    const billingVal = isAnnual ? 'annual' : 'monthly';
    const queryParams: Record<string, string> = {
      plan: selectedPlan,
      price: String(priceVal),
      billing: billingVal
    };
    if (onNavigate) {
      onNavigate('signup', queryParams);
    } else {
      window.location.hash = `#signup?plan=${selectedPlan}&price=${priceVal}&billing=${billingVal}`;
    }
  };

  // Instant checkout via Razorpay (UPI, Netbanking, Cards, Wallets)
  const handleRazorpayCheckout = async (planId: string) => {
    setIsSubmitting(true);
    try {
      if (onShowToast) onShowToast('Connecting to Razorpay payment gateway...', 'info');

      const selectedCycle: 'monthly' | 'annual' = isAnnual ? 'annual' : 'monthly';

      // Subscription Mandate Flow: Monthly or Annual
      const subRes = await apiService.createRazorpaySubscription({
        tier: planId as 'starter' | 'growth' | 'pro',
        billing_cycle: selectedCycle
      });

      if (!subRes.success) {
        if (selectedCycle === 'annual') {
          throw new Error('Annual billing is not configured yet.');
        }
        throw new Error(subRes.error || 'Failed to initialize subscription');
      }

      if (subRes.success && subRes.subscriptionId) {
        if (typeof (window as any).Razorpay !== 'undefined') {
          const options = buildRazorpaySubscriptionOptions({
            keyId: subRes.keyId,
            subscriptionId: subRes.subscriptionId,
            planName: (AUTHORITATIVE_PLANS[planId]?.name || planId).toUpperCase(),
            customerName: name || 'SaaS Founder',
            customerEmail: email || 'founder@example.com',
            handler: async (response: any) => {
              try {
                const verifyRes = await apiService.verifyRazorpaySubscription({
                  razorpay_subscription_id: response.razorpay_subscription_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  tier: planId,
                  billing_cycle: selectedCycle,
                  email: email || 'founder@example.com'
                });

                if (verifyRes.success) {
                  if (onShowToast) {
                    onShowToast(`🎉 ${selectedCycle === 'annual' ? 'Annual' : 'Monthly'} recurring subscription activated for ${planId.toUpperCase()} Plan!`, 'success');
                  }
                  if (onNavigate) onNavigate('dashboard');
                } else {
                  if (onShowToast) onShowToast(verifyRes.error || 'Subscription verification failed.', 'error');
                }
              } catch (verErr: any) {
                if (onShowToast) onShowToast('Verification error: ' + verErr.message, 'error');
              }
            }
          });

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
          return;
        } else {
          // Simulated development verification
          const verifyRes = await apiService.verifyRazorpaySubscription({
            razorpay_subscription_id: subRes.subscriptionId,
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            razorpay_signature: 'test_mandate_signature',
            tier: planId,
            billing_cycle: selectedCycle,
            email: email || 'founder@example.com'
          });
          if (onShowToast) onShowToast(`🎉 Test subscription verified! Plan upgraded to ${planId.toUpperCase()}.`, 'success');
          if (onNavigate) onNavigate('dashboard');
          return;
        }
      }

      // One-time Annual or fallback Order Flow
      const orderRes = await apiService.createRazorpayOrder({
        plan: planId,
        billingCycle: isAnnual ? 'annual' : 'monthly',
        customerName: name || 'SaaS Founder',
        customerEmail: email || 'founder@example.com'
      });

      if (!orderRes.success) {
        throw new Error(orderRes.error || 'Failed to initialize Razorpay checkout');
      }

      if (typeof (window as any).Razorpay !== 'undefined') {
        const options = buildRazorpayOneTimeOptions({
          keyId: orderRes.keyId,
          orderId: orderRes.orderId,
          amountCents: orderRes.amount,
          amount: orderRes.amount,
          currency: orderRes.currency || 'USD',
          description: `${(AUTHORITATIVE_PLANS[planId]?.name || planId).toUpperCase()} Plan (${isAnnual ? 'Annual' : 'Monthly'})`,
          customerName: name || 'SaaS Founder',
          customerEmail: email || 'founder@example.com',
          handler: async (response: any) => {
            try {
              const verifyRes = await apiService.verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planId,
                billingCycle: isAnnual ? 'annual' : 'monthly',
                amount: orderRes.amount,
                currency: 'USD',
                email: email || 'founder@example.com'
              });

              if (verifyRes.success) {
                if (onShowToast) {
                  onShowToast(`🎉 Razorpay payment successful! Upgraded to ${planId.toUpperCase()} Plan.`, 'success');
                }
                if (onNavigate) onNavigate('dashboard');
              } else {
                if (onShowToast) onShowToast(verifyRes.error || 'Payment signature verification failed.', 'error');
              }
            } catch (verErr: any) {
              if (onShowToast) onShowToast('Verification error: ' + verErr.message, 'error');
            }
          }
        });

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        const verifyRes = await apiService.verifyRazorpayPayment({
          razorpay_order_id: orderRes.orderId,
          razorpay_payment_id: `pay_${Date.now()}`,
          razorpay_signature: 'test_bypass_token',
          plan: planId,
          billingCycle: isAnnual ? 'annual' : 'monthly',
          email: email || 'founder@example.com'
        });
        if (onShowToast) onShowToast(`🎉 Razorpay Test Payment Completed! Plan upgraded to ${planId.toUpperCase()}.`, 'success');
        if (onNavigate) onNavigate('dashboard');
      }
    } catch (err: any) {
      if (onShowToast) onShowToast(err.message || 'Razorpay checkout failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit inline signup form
  const handleInlineSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !company.trim() || !password.trim()) {
      if (onShowToast) onShowToast('Please fill in all required fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(async () => {
      const res = await authService.signup({
        name,
        email,
        company,
        password,
        plan: selectedPlan
      });
      setIsSubmitting(false);

      if (res.success) {
        if (onShowToast) {
          onShowToast(`Account created for ${activeTier.name} Plan! Check your email to verify.`, 'success');
        }
        if (onNavigate) {
          onNavigate('login', { email, plan: selectedPlan, verified: 'false' });
        }
      } else {
        if (onShowToast) onShowToast(res.message, 'error');
      }
    }, 500);
  };

  // Submit Pro sales contact
  const handleSalesContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !company.trim()) {
      if (onShowToast) onShowToast('Please complete name, email, and company.', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      if (onShowToast) {
        onShowToast('Sales request received! A Senior Enterprise Architect will reach out within 2 hours.', 'success');
      }
      setName('');
      setEmail('');
      setCompany('');
      setSalesNotes('');
    }, 600);
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedReferral(true);
    if (onShowToast) onShowToast('Referral link copied to clipboard.', 'success');
    setTimeout(() => setCopiedReferral(false), 2500);
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Header & Value Proposition */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        {/* Trial Expired Upgrade Screen (Requirement 4) */}
        {isTrialExpired && (
          <div className="p-6 bg-amber-50 border-2 border-amber-300 rounded-2xl text-center space-y-2 shadow-sm animate-in fade-in duration-200 mb-6">
            <div className="inline-flex items-center justify-center p-2.5 bg-amber-100 text-amber-800 rounded-full mb-1">
              <ShieldCheck className="w-6 h-6 text-amber-800" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-amber-950">
              Your 14-day free trial has ended.
            </h2>
            <p className="text-sm text-amber-800 font-semibold max-w-md mx-auto">
              Choose a plan to continue using NoChurn. All customer data, risk analytics, and retention drafts are safely preserved.
            </p>
          </div>
        )}

        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-3.5 py-1 rounded-full border border-blue-200 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
          Predictive Retention Pricing
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
          Save 1 customer, pay for your whole year.
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto">
          All plans include an automated <strong>14-day free trial</strong> with instant Razorpay, Mixpanel, and Intercom telemetry synchronization.
        </p>

        {/* Annual Billing Toggle Switch */}
        <div className="flex items-center justify-center gap-3 pt-3">
          <span className={`text-xs font-semibold ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
            Monthly
          </span>

          <button
            type="button"
            role="switch"
            aria-checked={isAnnual}
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 ${
              isAnnual ? 'bg-[#1E3A8A]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                isAnnual ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>

          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
              Annual (save 17%)
            </span>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shadow-2xs">
              Save 17%
            </span>
          </div>
        </div>
      </div>

      {/* 3 PRICING TIERS SIDE-BY-SIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch px-2 sm:px-4">
        {PRICING_TIERS_CONFIG.map((tier) => {
          const isSelected = selectedPlan === tier.id;
          const currentPrice = isAnnual ? tier.annualPrice : tier.monthlyPrice;

          return (
            <div
              key={tier.id}
              data-plan={tier.id}
              onClick={() => handleSelectPlan(tier.id)}
              className={`pricing-card relative flex flex-col justify-between rounded-2xl bg-white p-6 sm:p-7 cursor-pointer transition-all duration-300 ease-in-out ${
                isSelected
                  ? 'selected scale-[1.01] sm:scale-105 border-2 border-[#1E3A8A] shadow-2xl ring-4 ring-[#1E3A8A]/15 z-10'
                  : tier.isPopular
                  ? 'border-2 border-blue-200 shadow-md scale-100 hover:border-blue-300 hover:shadow-lg'
                  : 'border border-gray-200 shadow-xs scale-100 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {/* Checkmark Badge "✓ Selected" on top-right when selected */}
              {isSelected && (
                <div className="absolute -top-3.5 -right-2 z-20 bg-[#1E3A8A] text-white text-[11px] font-bold px-3.5 py-1 rounded-full shadow-md flex items-center gap-1 animate-in fade-in zoom-in-90 duration-200">
                  <span>✓ Selected</span>
                </div>
              )}

              {/* MOST POPULAR badge on Growth tier */}
              {tier.isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#1E3A8A] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>MOST POPULAR</span>
                </div>
              )}

              <div>
                {/* Header & Name */}
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                  {tier.id === 'growth' && <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />}
                </div>

                <p className="text-xs text-gray-500 mt-1 min-h-[32px] leading-relaxed">
                  {tier.description}
                </p>

                {/* Price Display */}
                <div className="price mt-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-black text-gray-900 tracking-tight">
                      ${(isAnnual ? tier.annualTotalPrice : tier.monthlyPrice).toLocaleString('en-US')}
                    </span>
                    <span className="text-xs text-gray-500 font-semibold">{isAnnual ? '/year' : '/month'}</span>
                  </div>
                  {isAnnual ? (
                    <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                      ${tier.annualPrice}/mo billed annually (${tier.annualTotalPrice}/yr)
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                      Annual billing: ${tier.annualTotalPrice.toLocaleString('en-US')}/year
                    </div>
                  )}
                </div>

                {/* Customers capacity */}
                <p className="text-xs font-semibold text-gray-700 mt-1">
                  {tier.customersIncluded}
                </p>

                {/* Savings Badge */}
                <div className="min-h-[26px] mt-1.5">
                  {isAnnual ? (
                    <span className="savings-badge inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      {tier.annualSavingsBadge}
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-400">Billed monthly</span>
                  )}
                </div>

                <div className="my-5 border-t border-gray-100"></div>

                {/* Feature List */}
                <ul className="space-y-3 text-xs text-gray-700">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected || tier.isPopular
                            ? 'bg-[#1E3A8A] text-white'
                            : 'bg-blue-50 text-blue-900'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  id={`select-plan-${tier.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartTrialVerification(tier.id);
                  }}
                  className={`select-btn w-full py-3 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#1E3A8A] text-white hover:bg-blue-800 ring-2 ring-blue-400/30'
                      : tier.isPopular
                      ? 'bg-[#1E3A8A] hover:bg-blue-800 text-white'
                      : 'bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {isAnnual ? (
                    <span>Start annual trial</span>
                  ) : (
                    <span>Start 14-day free trial</span>
                  )}
                </button>

                <div className="text-[10px] text-center text-gray-500 mt-2 font-medium">
                  $1 verification charge • 14-day free trial • Cancel anytime
                </div>
                <div className="text-[10px] text-center text-gray-500 mt-1">
                  {isAnnual ? ONE_TIME_PAYMENT_DISCLOSURE : RECURRING_MANDATE_DISCLOSURE}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SIGNUP FORM INTEGRATION & CONFIRMATION NOTICE (#signup-form) */}
      <div
        id="signup-form"
        ref={signupFormRef}
        className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-md p-6 sm:p-8 space-y-6 scroll-mt-24"
      >
        {/* Hidden inputs requested for form integrations */}
        <input type="hidden" id="plan" name="plan" value={selectedPlan} />
        <input type="hidden" id="price" name="price" value={activeChargePrice} />
        <input type="hidden" id="billing-cycle" name="billing-cycle" value={isAnnual ? 'annual' : 'monthly'} />
        <input type="hidden" id="signup-plan" value={selectedPlan} />
        <input type="hidden" id="signup-price" value={activeChargePrice} />

        {/* Selected Plan Notice Banner */}
        <div className="selected-plan-notice bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1E3A8A] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Check className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Selected Configuration</div>
              <div className="text-sm font-bold text-gray-900">
                You selected: {activeTier.name} Plan — ${isAnnual ? `${activeTier.annualTotalPrice.toLocaleString('en-US')} USD/year` : `${activeTier.monthlyPrice.toLocaleString('en-US')} USD/month`}
              </div>
              <div className="text-[11px] text-gray-600 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Billing currency: <strong className="text-blue-900">USD</strong></span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">14-day free trial included</span>
              </div>
              <div className="text-[10px] text-blue-900/80">
                All subscriptions are billed transparently in USD ($).
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStartTrialVerification(selectedPlan as any)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1E3A8A] hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{isAnnual ? 'Start Annual Trial ($1)' : 'Start 14-Day Trial ($1)'}</span>
            </button>
            <button
              type="button"
              onClick={handleRedirectToSignup}
              className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <span>Full Signup</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Form Body: Either Instant Trial Start or Enterprise Sales Contact */}
        {selectedPlan === 'pro' ? (
          <div>
            <div className="border-b border-gray-100 pb-4 mb-5">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-[#1E3A8A]" />
                Schedule Enterprise Consultation or Start Pro
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Connect with our Solution Architecture team for custom volume pricing, Spanner/Snowflake connectors, or SLA terms.
              </p>
            </div>

            <form onSubmit={handleSalesContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Mercer"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Work Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@enterprise.com"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Enterprise SaaS Ltd"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Active Customer Count
                  </label>
                  <select className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]">
                    <option>5,000 - 15,000 Accounts</option>
                    <option>15,000 - 50,000 Accounts</option>
                    <option>50,000+ Accounts</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Specific Requirements or Integration Questions
                </label>
                <textarea
                  rows={2}
                  value={salesNotes}
                  onChange={(e) => setSalesNotes(e.target.value)}
                  placeholder="Need custom billing sync with Chargebee and SOC 2 Type II audit report..."
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#1E3A8A] hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{isSubmitting ? 'Submitting...' : 'Request Pro Demo & Pricing'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCalendlyModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-800 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-blue-900" />
                  <span>Open Calendly to book instantly</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div className="border-b border-gray-100 pb-4 mb-5">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1E3A8A]" />
                Start Your 14-Day Free Trial on the {activeTier.name} Plan
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                No credit card required. Instant sandbox with simulated telemetry and automated Gemini AI predictions.
              </p>
            </div>

            <form onSubmit={handleInlineSignupSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Work Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme SaaS Inc"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 uppercase, 1 special"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleStartTrialVerification(selectedPlan as any)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#1E3A8A] hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-emerald-300" />
                  <span>{isAnnual ? 'Pay $1 & Start Annual Trial' : 'Pay $1 & Start Free Trial'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRazorpayCheckout(selectedPlan)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer border border-blue-700"
                >
                  <CreditCard className="w-4 h-4 text-cyan-300" />
                  <span>
                    {isAnnual
                      ? 'Pay Annual via Razorpay (UPI, Cards, Netbanking, Wallets)'
                      : 'Set up Monthly Mandate (UPI AutoPay / Cards)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleRedirectToSignup}
                  className="text-xs font-semibold text-blue-900 hover:text-blue-950 flex items-center gap-1 cursor-pointer"
                >
                  <span>Or use SSO</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Supported Payment Disclosures */}
              <div className="pt-2 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-1">
                <div className="flex items-center gap-3 text-gray-700 font-semibold text-xs">
                  <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5 text-emerald-600" /> UPI</span>
                  <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-blue-600" /> Cards</span>
                  <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-indigo-600" /> Netbanking</span>
                  <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5 text-amber-600" /> Wallets</span>
                </div>
                <p>
                  {isAnnual ? ONE_TIME_PAYMENT_DISCLOSURE : RECURRING_MANDATE_DISCLOSURE}
                </p>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Calendly Booking Modal for Pro */}
      {calendlyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#1E3A8A]" />
                <h3 className="text-base font-bold text-gray-900">Schedule Pro Consultation</h3>
              </div>
              <button
                onClick={() => setCalendlyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-950 space-y-1">
              <div className="font-bold">Calendly Integration: NoChurn Enterprise Desk</div>
              <div className="text-gray-600">
                15-Minute Technical Evaluation & Custom Retention Automation Strategy
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-center space-y-3">
              <div className="text-xs text-gray-600">Available time slots for this week:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Today at 2:00 PM', 'Today at 4:30 PM', 'Tomorrow at 10:00 AM', 'Tomorrow at 1:30 PM'].map((slot, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (onShowToast) onShowToast(`Booked slot: ${slot}! Calendar invitation sent.`, 'success');
                      setCalendlyModalOpen(false);
                    }}
                    className="p-2 bg-white border border-gray-200 rounded-lg font-semibold text-gray-800 hover:bg-blue-50 hover:border-[#1E3A8A] transition-colors"
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCalendlyModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Founder Referral Program Banner */}
      <div className="bg-linear-to-r from-blue-900 to-blue-950 rounded-2xl p-6 text-white max-w-4xl mx-auto shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-blue-800/80 px-2.5 py-0.5 rounded-full text-blue-200 text-xs font-semibold">
              <Gift className="w-3.5 h-3.5 text-amber-300" />
              Founder Referral Program
            </div>
            <h3 className="text-xl font-bold tracking-tight">
              Refer a SaaS founder, both get 1 month free.
            </h3>
            <p className="text-xs text-blue-200 max-w-md">
              Share your unique referral link with fellow SaaS founders. When they start a trial, you both receive a full month credit ($149 value).
            </p>
          </div>

          <div className="space-y-2 shrink-0">
            <div className="flex items-center gap-2 bg-blue-950/80 p-2 rounded-xl border border-blue-800 text-xs font-mono">
              <span className="truncate max-w-[200px] text-blue-200">{referralLink}</span>
              <button
                type="button"
                onClick={handleCopyReferral}
                className="px-2.5 py-1 bg-white text-blue-950 font-bold rounded text-[11px] hover:bg-blue-50 transition-colors cursor-pointer"
              >
                {copiedReferral ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <span className="text-[10px] text-blue-300 block text-right">3 founder referrals claimed this quarter</span>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 max-w-4xl mx-auto shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#1E3A8A]" />
            Frequently Asked Questions
          </h3>
          <div className="text-xs text-gray-500">
            Need custom pricing?{' '}
            <a
              href="mailto:support@churnshield.ai"
              className="text-[#1E3A8A] font-semibold hover:underline"
            >
              Contact Support
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-gray-50 rounded-xl space-y-1 border border-gray-100">
            <span className="font-bold text-gray-900">How does the 14-day free trial work?</span>
            <p className="text-gray-600 leading-relaxed">
              Every plan includes a 14-day free trial with no credit card required at signup. You receive instant access to telemetry ingestion, Gemini AI predictions, and automated retention playbooks.
            </p>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl space-y-1 border border-gray-100">
            <span className="font-bold text-gray-900">What is the cancellation policy?</span>
            <p className="text-gray-600 leading-relaxed">
              You can cancel your subscription at any time with 1 click directly from your Billing settings. There are no contracts, lock-ins, or cancellation fees. You retain access until the end of your billing cycle.
            </p>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl space-y-1 border border-gray-100">
            <span className="font-bold text-gray-900">How does billing and plan switching work?</span>
            <p className="text-gray-600 leading-relaxed">
              Payments are processed securely via Razorpay Subscriptions. You can upgrade or downgrade anytime; changes are prorated automatically. Annual plans save 18% compared to monthly billing.
            </p>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl space-y-1 border border-gray-100">
            <span className="font-bold text-gray-900">How accurate is the Gemini AI churn score?</span>
            <p className="text-gray-600 leading-relaxed">
              Gemini analyzes multi-dimensional telemetry (login dropoff, ticket sentiment, payment failure patterns) yielding an 89% early detection accuracy 30-60 days before account churn.
            </p>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl space-y-1 border border-gray-100">
            <span className="font-bold text-gray-900">Is my customer & billing data secure?</span>
            <p className="text-gray-600 leading-relaxed">
              Yes. All telemetry is encrypted at rest using AES-256 and in transit via TLS 1.3. We only require read-only permissions for Razorpay, Mixpanel, and Intercom.
            </p>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl space-y-1 border border-gray-100">
            <span className="font-bold text-gray-900">Can I export reports for investors & board members?</span>
            <p className="text-gray-600 leading-relaxed">
              Yes. The ROI & Reports dashboard exports audit-ready PDFs detailing monthly MRR saved, protected ARR, and cohort risk migration.
            </p>
          </div>
        </div>

        {/* Customer Support Contact Callout */}
        <div className="mt-4 p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#1E3A8A]" />
            <span className="text-gray-700">
              Have specific billing or technical questions? Our customer success engineering team is here to help.
            </span>
          </div>
          <a
            href="mailto:support@nochurn.com"
            className="px-3 py-1.5 bg-[#1E3A8A] hover:bg-blue-800 text-white font-semibold rounded-lg shrink-0 transition-colors"
          >
            Email Support
          </a>
        </div>
      </div>

      {/* Authoritative $1 Trial Verification Checkout Modal */}
      <TrialVerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        tier={verificationTier}
        billingCycle={isAnnual ? 'annual' : 'monthly'}
        onSuccess={(result) => {
          if (onShowToast) {
            onShowToast(`🎉 $1 verification successful! Your 14-day ${result.tier.toUpperCase()} trial has begun.`, 'success');
          }
          if (onNavigate) {
            onNavigate('dashboard');
          }
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
