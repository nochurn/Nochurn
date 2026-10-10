import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Building,
  User,
  Phone,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Check,
  Calendar,
  X,
  Terminal
} from 'lucide-react';
import { authService, validatePasswordRequirements } from '../../services/authService';
import { apiService } from '../../services/api';
import {
  AUTHORITATIVE_PLANS
} from '../../services/razorpayConfig';
import { CENTRAL_PRICING } from '../../config/pricing';

interface SignupViewProps {
  onNavigate: (view: string, queryParams?: Record<string, string>) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onAuthenticated: () => void;
  initialPlan?: string;
  routeParams?: Record<string, string | undefined>;
}

export interface PlanConfig {
  id: 'starter' | 'growth' | 'pro';
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  annualMonthlyRate: number;
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  starter: {
    id: 'starter',
    name: CENTRAL_PRICING.starter.displayName,
    monthlyPrice: CENTRAL_PRICING.starter.monthly.amountUsd,
    annualPrice: CENTRAL_PRICING.starter.annual.totalAmountUsd,
    annualMonthlyRate: CENTRAL_PRICING.starter.annual.monthlyEquivalentUsd
  },
  growth: {
    id: 'growth',
    name: CENTRAL_PRICING.growth.displayName,
    monthlyPrice: CENTRAL_PRICING.growth.monthly.amountUsd,
    annualPrice: CENTRAL_PRICING.growth.annual.totalAmountUsd,
    annualMonthlyRate: CENTRAL_PRICING.growth.annual.monthlyEquivalentUsd
  },
  pro: {
    id: 'pro',
    name: CENTRAL_PRICING.pro.displayName,
    monthlyPrice: CENTRAL_PRICING.pro.monthly.amountUsd,
    annualPrice: CENTRAL_PRICING.pro.annual.totalAmountUsd,
    annualMonthlyRate: CENTRAL_PRICING.pro.annual.monthlyEquivalentUsd
  },
  enterprise: {
    id: 'pro',
    name: CENTRAL_PRICING.pro.displayName,
    monthlyPrice: CENTRAL_PRICING.pro.monthly.amountUsd,
    annualPrice: CENTRAL_PRICING.pro.annual.totalAmountUsd,
    annualMonthlyRate: CENTRAL_PRICING.pro.annual.monthlyEquivalentUsd
  }
};

export const SignupView: React.FC<SignupViewProps> = ({
  onNavigate,
  onShowToast,
  onAuthenticated,
  initialPlan = 'growth',
  routeParams = {}
}) => {
  // Extract initial parameters from routeParams, window.location.search, or hash
  const extractParams = () => {
    const rPlan = routeParams ? routeParams['plan'] : undefined;
    const rPrice = routeParams ? routeParams['price'] : undefined;
    const rBilling = routeParams ? (routeParams['billing'] || routeParams['billing-cycle']) : undefined;

    let pPlan = rPlan || initialPlan;
    let pPrice = rPrice;
    let pBilling = rBilling;

    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (!pPlan && searchParams.get('plan')) pPlan = searchParams.get('plan');
      if (!pPrice && searchParams.get('price')) pPrice = searchParams.get('price');
      if (!pBilling && searchParams.get('billing')) pBilling = searchParams.get('billing');
      if (!pBilling && searchParams.get('billing-cycle')) pBilling = searchParams.get('billing-cycle');

      if (window.location.hash && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        if (!pPlan && hashParams.get('plan')) pPlan = hashParams.get('plan');
        if (!pPrice && hashParams.get('price')) pPrice = hashParams.get('price');
        if (!pBilling && hashParams.get('billing')) pBilling = hashParams.get('billing');
        if (!pBilling && hashParams.get('billing-cycle')) pBilling = hashParams.get('billing-cycle');
      }
    }

    const cleanPlan = (pPlan || 'growth').toLowerCase();
    const validPlan = ['starter', 'growth', 'pro'].includes(cleanPlan) ? cleanPlan : 'growth';

    let validBilling: 'monthly' | 'annual' = 'monthly';
    if (pBilling === 'annual' || pPrice === '468' || pPrice === '1428' || pPrice === '4788') {
      validBilling = 'annual';
    }

    return { plan: validPlan, billing: validBilling, price: pPrice };
  };

  const initialRouteData = extractParams();
  const [selectedPlan, setSelectedPlan] = useState<string>(initialRouteData.plan);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(initialRouteData.billing);

  // Form input fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Verification modal state
  const [verificationPending, setVerificationPending] = useState<{
    email: string;
    token: string;
    code: string;
  } | null>(null);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Auth config state
  const [authConfig, setAuthConfig] = useState<{
    isConfigured: boolean;
    oauthProviders: { google: boolean; microsoft: boolean };
    developerError?: string | null;
  }>({
    isConfigured: false,
    oauthProviders: { google: false, microsoft: false },
    developerError: null
  });

  useEffect(() => {
    apiService.getAuthConfig().then((cfg) => {
      setAuthConfig({
        isConfigured: !!cfg.isConfigured,
        oauthProviders: cfg.oauthProviders || { google: false, microsoft: false },
        developerError: cfg.developerError || null
      });
    }).catch(() => {});
  }, []);

  // Update selected plan and billing cycle if routeParams change
  useEffect(() => {
    const updated = extractParams();
    if (updated.plan) {
      setSelectedPlan(updated.plan);
    }
    if (updated.billing) {
      setBillingCycle(updated.billing);
    }
  }, [routeParams ? routeParams['plan'] : undefined, routeParams ? routeParams['price'] : undefined, routeParams ? routeParams['billing'] : undefined, initialPlan]);

  // Validation and Touched State
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordReqs = validatePasswordRequirements(password);

  const nameError = touched.name && !name.trim() ? 'Full name is required' : null;
  const companyError = touched.company && !company.trim() ? 'Company name is required' : null;
  const emailError = touched.email && (!email.trim() || !emailRegex.test(email.trim()))
    ? 'Please enter a valid business email address'
    : null;
  const passwordError = touched.password && !passwordReqs.isValid
    ? 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
    : null;
  const confirmPasswordError = touched.confirmPassword && (confirmPassword !== password)
    ? 'Passwords do not match'
    : null;
  const termsError = touched.terms && !agreedToTerms
    ? 'You must agree to the Terms of Service and Privacy Policy'
    : null;

  const isFormValid = Boolean(
    name.trim() &&
    company.trim() &&
    email.trim() &&
    emailRegex.test(email.trim()) &&
    passwordReqs.isValid &&
    confirmPassword === password &&
    agreedToTerms
  );

  const currentPlanConfig = PLAN_CONFIGS[selectedPlan] || PLAN_CONFIGS.growth;
  const currentPrice = billingCycle === 'annual' ? currentPlanConfig.annualPrice : currentPlanConfig.monthlyPrice;

  // Pay $1 & Start Free / Annual Trial
  const handlePayVerificationAndStartTrial = async () => {
    setTouched({ name: true, company: true, email: true, password: true, confirmPassword: true, terms: true });
    setErrorMessage(null);

    if (!isFormValid) {
      if (!name.trim()) setErrorMessage('Full name is required.');
      else if (!emailRegex.test(email.trim())) setErrorMessage('Please enter a valid business email address.');
      else if (!company.trim()) setErrorMessage('Company name is required.');
      else if (!passwordReqs.isValid) setErrorMessage('Password does not meet all security requirements.');
      else if (password !== confirmPassword) setErrorMessage('Passwords do not match. Please re-enter.');
      else if (!agreedToTerms) setErrorMessage('You must agree to the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authService.signup({
        name: name.trim(),
        email: email.trim(),
        company: company.trim(),
        phone: phone.trim() || undefined,
        password,
        plan: selectedPlan,
        billingCycle: billingCycle as 'monthly' | 'annual'
      });

      if (!res.success && !res.user) {
        setIsLoading(false);
        if (res.message?.toLowerCase().includes('already exists') || (res as any).status === 409) {
          setErrorMessage('An account already exists with this email. Please log in.');
        } else {
          setErrorMessage(res.message || 'Signup failed. Please try again.');
        }
        return;
      }

      if (res.requiresEmailConfirmation) {
        setIsLoading(false);
        onShowToast(res.message, 'info');
        setVerificationPending({ email: email.trim(), token: '', code: '' });
        return;
      }

      setIsLoading(false);
      onShowToast('Welcome to NoChurn! Your 14-day free trial has started.', 'success');
      onAuthenticated();
      onNavigate('dashboard');
    } catch (err: any) {
      setIsLoading(false);
      if (err.message?.toLowerCase().includes('already exists')) {
        setErrorMessage('An account already exists with this email. Please log in.');
      } else {
        setErrorMessage(err.message || 'Failed to create account.');
      }
    }
  };

  // Flow A legacy alias
  const handleFlowAFreeTrial = handlePayVerificationAndStartTrial;

  // Flow B: Paid checkout required before activation (creates pending record, triggers Razorpay Subscription)
  const handleFlowBPaidCheckout = async () => {
    setTouched({ name: true, company: true, email: true, password: true, confirmPassword: true, terms: true });
    setErrorMessage(null);

    if (!isFormValid) {
      if (!name.trim()) setErrorMessage('Full name is required.');
      else if (!emailRegex.test(email.trim())) setErrorMessage('Please enter a valid business email address.');
      else if (!company.trim()) setErrorMessage('Company name is required.');
      else if (!passwordReqs.isValid) setErrorMessage('Password does not meet all security requirements.');
      else if (password !== confirmPassword) setErrorMessage('Passwords do not match. Please re-enter.');
      else if (!agreedToTerms) setErrorMessage('You must agree to the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create pending user record
      await apiService.signupUser({
        fullName: name.trim(),
        companyName: company.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        phone: phone.trim() || undefined,
        agreedToTerms,
        selectedPlan,
        billingCycle,
        isFreeTrial: false
      });

      // 2. Create Razorpay Subscription (server-side authoritative)
      const sub = await apiService.createRazorpaySubscription({
        tier: selectedPlan as 'starter' | 'growth' | 'pro',
        billing_cycle: billingCycle as 'monthly' | 'annual'
      });

      setIsLoading(false);

      if (onNavigate) {
        onNavigate('payment-success', {
          subscription_id: sub.subscriptionId,
          plan: selectedPlan,
          billing: billingCycle,
          amount: String(sub.amountInr)
        });
      }
    } catch (err: any) {
      setIsLoading(false);
      if (err.message?.toLowerCase().includes('already exists')) {
        setErrorMessage('An account already exists with this email. Please log in or reset your password.');
      } else {
        setErrorMessage(err.message || 'Razorpay subscription initiation failed.');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFlowAFreeTrial();
  };

  const handleVerifyEmail = (tokenOrCode: string) => {
    setIsVerifying(true);
    setTimeout(() => {
      const res = authService.verifyEmail(tokenOrCode);
      setIsVerifying(false);
      if (res.success) {
        onShowToast('Email verified! Please login', 'success');
        setVerificationPending(null);
        onNavigate('login', { verified: 'true', email: verificationPending?.email || email });
      } else {
        setErrorMessage(res.message);
      }
    }, 400);
  };

  const handleOAuth = async (provider: 'google' | 'microsoft') => {
    setIsLoading(true);
    try {
      const res = await authService.loginWithOAuth(provider);
      setIsLoading(false);
      if (res.success) {
        onShowToast(res.message, 'success');
        onAuthenticated();
        onNavigate('dashboard');
      } else {
        onShowToast(res.message || 'OAuth authentication failed', 'error');
      }
    } catch (e: any) {
      setIsLoading(false);
      onShowToast(e.message || 'OAuth authentication failed', 'error');
    }
  };

  // Format notice string
  const planName = currentPlanConfig.name;
  const noticePriceDisplay =
    billingCycle === 'annual'
      ? `${planName} Plan ($${currentPlanConfig.annualPrice.toLocaleString()}/year)`
      : `${planName} Plan ($${currentPlanConfig.monthlyPrice}/month)`;

  return (
    <div className="min-h-[calc(100vh-14rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Developer Warning if Supabase URL / Anon Key Missing */}
        {authConfig.developerError && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-xs">
            <Terminal className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Supabase Configuration Notice:</div>
              <p className="mt-0.5 text-[11px] text-amber-800">{authConfig.developerError}</p>
            </div>
          </div>
        )}

        {/* Card Container */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          {/* Brand Header */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-900 text-white shadow-xs mb-3">
              <Shield className="w-6 h-6 text-blue-100" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create your NoChurn Account</h1>
            <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto">
              Predict customer cancellations 30-60 days early and save critical SaaS revenue.
            </p>
          </div>

          {/* Selected Plan Card (Locked) */}
          <div
            id="selected-plan-card"
            className="mb-5 p-4 bg-blue-50/90 border border-blue-200 rounded-xl space-y-3 text-xs shadow-2xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-blue-200/70">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="font-bold text-blue-950 text-sm">
                  Selected plan: {(AUTHORITATIVE_PLANS[selectedPlan] || AUTHORITATIVE_PLANS.growth).name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  14-Day Free Trial
                </span>
                <button
                  type="button"
                  id="change-plan-link"
                  onClick={() => onNavigate('pricing')}
                  className="text-xs font-semibold text-blue-800 hover:text-blue-950 underline hover:no-underline cursor-pointer transition-colors"
                >
                  Change Plan
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500 block text-[11px]">Pricing after trial:</span>
                <strong className="text-gray-900 font-bold text-sm">
                  {billingCycle === 'annual'
                    ? (AUTHORITATIVE_PLANS[selectedPlan] || AUTHORITATIVE_PLANS.growth).formattedAnnual
                    : (AUTHORITATIVE_PLANS[selectedPlan] || AUTHORITATIVE_PLANS.growth).formattedMonthly}
                </strong>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px]">Free Trial:</span>
                <strong className="text-emerald-700 font-bold text-sm">
                  14 days free
                </strong>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-200/70 space-y-1.5 text-xs text-gray-700 leading-relaxed">
              <div className="flex items-start gap-1.5 text-blue-950 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>No credit card or upfront payment required.</span>
              </div>
              <p className="text-gray-600 pl-5 text-[11px]">
                Full instant access to AI Employee scans, customer churn predictions, and automated recovery messages.
              </p>
            </div>
          </div>

          {/* Social OAuth Buttons - Only rendered when configured */}
          {(authConfig.oauthProviders.google || authConfig.oauthProviders.microsoft) && (
            <>
              <div className={`grid ${authConfig.oauthProviders.google && authConfig.oauthProviders.microsoft ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-5`}>
                {authConfig.oauthProviders.google && (
                  <button
                    type="button"
                    onClick={() => handleOAuth('google')}
                    disabled={isLoading}
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign up with Google</span>
                  </button>
                )}

                {authConfig.oauthProviders.microsoft && (
                  <button
                    type="button"
                    onClick={() => handleOAuth('microsoft')}
                    disabled={isLoading}
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 23 23">
                      <path fill="#f35325" d="M1 1h10v10H1z" />
                      <path fill="#81bc06" d="M12 1h10v10H12z" />
                      <path fill="#05a6f0" d="M1 12h10v10H1z" />
                      <path fill="#ffba08" d="M12 12h10v10H1z" />
                    </svg>
                    <span>Sign up with Microsoft</span>
                  </button>
                )}
              </div>

              <div className="relative flex items-center justify-center mb-5">
                <div className="border-t border-gray-200 w-full"></div>
                <span className="bg-white px-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider absolute">
                  Or register with email
                </span>
              </div>
            </>
          )}

          {errorMessage && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">{errorMessage}</span>
                {errorMessage.toLowerCase().includes('already exists') && (
                  <div className="mt-2 pt-2 border-t border-red-200/60 flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => onNavigate('login')}
                      className="font-bold text-red-900 hover:underline"
                    >
                      Log in to account
                    </button>
                    <span className="text-red-300">•</span>
                    <button
                      type="button"
                      onClick={() => onNavigate('forgot-password')}
                      className="font-bold text-red-900 hover:underline"
                    >
                      Reset password
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Hidden fields pre-populated for form integration */}
            <input type="hidden" id="plan" name="plan" value={selectedPlan} />
            <input type="hidden" name="price" value={currentPrice} />
            <input type="hidden" id="billing-cycle" name="billing-cycle" value={billingCycle} />

            {/* Selected Plan: Read-only, prefilled from URL parameter */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                  Selected Plan (Prefilled)
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {currentPlanConfig.name} Tier
                </span>
                <span className="text-xs text-gray-600 ml-2">
                  ${currentPrice.toLocaleString('en-US')}{billingCycle === 'annual' ? '/year' : '/month'} ({billingCycle === 'annual' ? 'Annual' : 'Monthly'})
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('pricing')}
                className="text-xs font-semibold text-blue-900 hover:underline"
              >
                Change Plan
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!touched.name) setTouched((p) => ({ ...p, name: true }));
                    }}
                    placeholder="Jane Doe"
                    className={`w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 ${
                      nameError ? 'border-red-400 bg-red-50/20' : 'border-gray-200'
                    }`}
                  />
                </div>
                {nameError && <p className="mt-1 text-[11px] text-red-600 font-medium">{nameError}</p>}
              </div>

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
                    onBlur={() => setTouched((p) => ({ ...p, company: true }))}
                    onChange={(e) => {
                      setCompany(e.target.value);
                      if (!touched.company) setTouched((p) => ({ ...p, company: true }));
                    }}
                    placeholder="Acme SaaS Inc."
                    className={`w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 ${
                      companyError ? 'border-red-400 bg-red-50/20' : 'border-gray-200'
                    }`}
                  />
                </div>
                {companyError && <p className="mt-1 text-[11px] text-red-600 font-medium">{companyError}</p>}
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
                  onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (!touched.email) setTouched((p) => ({ ...p, email: true }));
                  }}
                  placeholder="jane@company.com"
                  className={`w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 ${
                    emailError ? 'border-red-400 bg-red-50/20' : 'border-gray-200'
                  }`}
                />
              </div>
              {emailError && <p className="mt-1 text-[11px] text-red-600 font-medium">{emailError}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Phone Number <span className="text-gray-400 font-normal">(Optional for 2FA alerts)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (!touched.password) setTouched((p) => ({ ...p, password: true }));
                  }}
                  placeholder="••••••••••••"
                  className={`w-full pl-9 pr-10 py-2 text-xs bg-gray-50 border rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 ${
                    passwordError ? 'border-red-400 bg-red-50/20' : 'border-gray-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && <p className="mt-1 text-[11px] text-red-600 font-medium">{passwordError}</p>}

              {/* Password Strength Checklist */}
              {password && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">Strength:</span>
                    <span
                      className={`font-semibold capitalize ${
                        passwordReqs.strength === 'strong'
                          ? 'text-emerald-600'
                          : passwordReqs.strength === 'medium'
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {passwordReqs.strength}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex gap-1">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        passwordReqs.score >= 25
                          ? passwordReqs.strength === 'strong'
                            ? 'bg-emerald-500 w-full'
                            : passwordReqs.strength === 'medium'
                            ? 'bg-amber-500 w-2/3'
                            : 'bg-red-500 w-1/3'
                          : 'bg-gray-200 w-0'
                      }`}
                    ></div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] text-gray-500">
                    <span className={`flex items-center gap-1 ${passwordReqs.hasMinLength ? 'text-emerald-600 font-medium' : ''}`}>
                      <CheckCircle2 className={`w-3 h-3 ${passwordReqs.hasMinLength ? 'text-emerald-600' : 'text-gray-300'}`} />
                      Min 8 characters
                    </span>
                    <span className={`flex items-center gap-1 ${passwordReqs.hasUppercase ? 'text-emerald-600 font-medium' : ''}`}>
                      <CheckCircle2 className={`w-3 h-3 ${passwordReqs.hasUppercase ? 'text-emerald-600' : 'text-gray-300'}`} />
                      1 uppercase letter
                    </span>
                    <span className={`flex items-center gap-1 ${passwordReqs.hasLowercase ? 'text-emerald-600 font-medium' : ''}`}>
                      <CheckCircle2 className={`w-3 h-3 ${passwordReqs.hasLowercase ? 'text-emerald-600' : 'text-gray-300'}`} />
                      1 lowercase letter
                    </span>
                    <span className={`flex items-center gap-1 ${passwordReqs.hasNumber ? 'text-emerald-600 font-medium' : ''}`}>
                      <CheckCircle2 className={`w-3 h-3 ${passwordReqs.hasNumber ? 'text-emerald-600' : 'text-gray-300'}`} />
                      1 number
                    </span>
                    <span className={`flex items-center gap-1 ${passwordReqs.hasSpecialChar ? 'text-emerald-600 font-medium' : ''}`}>
                      <CheckCircle2 className={`w-3 h-3 ${passwordReqs.hasSpecialChar ? 'text-emerald-600' : 'text-gray-300'}`} />
                      1 special character
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (!touched.confirmPassword) setTouched((p) => ({ ...p, confirmPassword: true }));
                  }}
                  placeholder="••••••••••••"
                  className={`w-full pl-9 pr-10 py-2 text-xs bg-gray-50 border rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 ${
                    confirmPasswordError ? 'border-red-400 bg-red-50/20' : 'border-gray-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="mt-1 text-[11px] text-red-600 font-medium">{confirmPasswordError}</p>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={agreedToTerms}
                  onBlur={() => setTouched((p) => ({ ...p, terms: true }))}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    setTouched((p) => ({ ...p, terms: true }));
                  }}
                  className="mt-0.5 rounded border-gray-300 text-blue-900 focus:ring-blue-900/20"
                />
                <span className="leading-snug">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('terms')}
                    className="text-blue-900 hover:underline font-semibold"
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('privacy')}
                    className="text-blue-900 hover:underline font-semibold"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>
              {termsError && <p className="mt-1 text-[11px] text-red-600 font-medium">{termsError}</p>}
            </div>

            {/* Post-Signup Action: Start 14-Day Free Trial */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                id="signup-flow-a-button"
                disabled={isLoading || !isFormValid}
                className="w-full py-3.5 px-4 bg-[#1E3A8A] hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Starting your 14-day free trial...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-blue-200" />
                    <span>Start 14-Day Free Trial</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="text-[10px] text-center text-gray-500 font-medium">
                14 days completely free • No credit card required • Cancel anytime
              </div>
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-600">
            Already have a NoChurn account?{' '}
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="text-blue-900 hover:underline font-bold cursor-pointer"
            >
              Log in here
            </button>
          </div>
        </div>
      </div>

      {/* Verification Email Notification Modal */}
      {verificationPending && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Check Your Inbox</h3>
                <p className="text-xs text-gray-500">Email confirmation link dispatched</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              A confirmation email has been dispatched by Supabase to <strong className="text-gray-900">{verificationPending.email}</strong>.
              Please check your inbox (and spam folder) and click the confirmation link to activate your account. Once confirmed, you can log in directly with your email and password.
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={async () => {
                  setIsVerifying(true);
                  try {
                    const res = await authService.resendVerificationEmail(verificationPending.email);
                    setIsVerifying(false);
                    onShowToast(res.message, res.success ? 'success' : 'error');
                  } catch (e: any) {
                    setIsVerifying(false);
                    onShowToast(e?.message || 'Failed to resend confirmation email.', 'error');
                  }
                }}
                disabled={isVerifying}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isVerifying ? 'Resending...' : 'Resend Confirmation Email'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const emailToPass = verificationPending.email;
                  setVerificationPending(null);
                  onNavigate('login', { email: emailToPass });
                }}
                className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Proceed to Log In</span>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setVerificationPending(null);
                  onNavigate('login');
                }}
                className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                Close & Return to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
