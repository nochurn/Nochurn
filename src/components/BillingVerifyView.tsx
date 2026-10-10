import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Smartphone,
  CreditCard,
  Building2,
  Wallet
} from 'lucide-react';
import { apiService } from '../services/api';
import { authService } from '../services/authService';
import {
  AUTHORITATIVE_PLANS,
  ONE_TIME_PAYMENT_DISCLOSURE,
  buildRazorpayOneTimeOptions
} from '../services/razorpayConfig';

interface BillingVerifyViewProps {
  onNavigate: (view: string, queryParams?: Record<string, string>) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const BillingVerifyView: React.FC<BillingVerifyViewProps> = ({
  onNavigate,
  onShowToast
}) => {
  const currentUser = authService.getCurrentUser();
  const pendingPlan = authService.getPendingPlan();

  const tier: 'starter' | 'growth' | 'pro' =
    (currentUser?.plan as any) ||
    (pendingPlan?.tier as any) ||
    'growth';

  const billingCycle: 'monthly' | 'annual' =
    (currentUser?.billingCycle as any) ||
    (pendingPlan?.billingCycle as any) ||
    'monthly';

  const authoritativePlan = AUTHORITATIVE_PLANS[tier] || AUTHORITATIVE_PLANS.growth;
  const authoritativePrice =
    billingCycle === 'annual'
      ? authoritativePlan.formattedAnnual
      : authoritativePlan.formattedMonthly;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ctaLabel =
    billingCycle === 'annual'
      ? 'Pay $1 & Start Annual Trial'
      : 'Pay $1 & Start Free Trial';

  const handleStartVerification = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      onShowToast('Initializing secure $1 verification order with Razorpay...', 'info');

      // 1. Create server-side order for $1 verification token
      const orderRes = await apiService.createTrialVerificationOrder({
        tier,
        billing_cycle: billingCycle
      });

      if (!orderRes.success) {
        throw new Error(orderRes.error || 'Failed to initialize verification order');
      }

      // 2. Open Razorpay Checkout modal with ALL supported payment methods
      if (typeof (window as any).Razorpay !== 'undefined') {
        const options = buildRazorpayOneTimeOptions({
          keyId: orderRes.keyId || 'rzp_test_TdpOBvJYcT9ENW',
          orderId: orderRes.orderId,
          amountCents: orderRes.amountCents || orderRes.amount,
          amount: orderRes.amountCents || orderRes.amount,
          currency: orderRes.currency || 'USD',
          name: 'NoChurn',
          description: `$1 Verification - ${authoritativePlan.name} 14-Day Trial (${billingCycle === 'annual' ? 'Annual' : 'Monthly'})`,
          customerName: currentUser?.name || 'SaaS Founder',
          customerEmail: currentUser?.email || 'founder@nochurn.com',
          handler: async (response: any) => {
            try {
              onShowToast('Verifying payment signature with NoChurn backend...', 'info');
              const verifyRes = await apiService.verifyTrialPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });

              if (verifyRes.success) {
                authService.updateSubscriptionState('trialing', tier);
                authService.clearPendingPlan();
                onShowToast(
                  `Verification complete! 14-day ${authoritativePlan.name} trial activated.`,
                  'success'
                );
                onNavigate('dashboard');
              } else {
                setErrorMessage(verifyRes.error || 'Payment verification failed');
                onShowToast(verifyRes.error || 'Verification failed', 'error');
              }
            } catch (err: any) {
              setErrorMessage(err.message || 'Signature verification error');
              onShowToast(err.message || 'Signature verification error', 'error');
            } finally {
              setIsLoading(false);
            }
          },
          onDismiss: () => {
            setIsLoading(false);
            onShowToast('Trial verification was canceled.', 'info');
          }
        });

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (resp: any) => {
          setIsLoading(false);
          const reason = resp?.error?.description || 'Payment failed';
          setErrorMessage(`Payment failed: ${reason}`);
          onShowToast(`Payment failed: ${reason}`, 'error');
        });
        rzp.open();
      } else {
        // Fallback for sandboxed preview if Razorpay script is blocked
        onShowToast('Razorpay script offline. Completing sandbox verification...', 'info');
        const verifyRes = await apiService.verifyTrialPayment({
          razorpay_order_id: orderRes.orderId,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'sig_mock_verified'
        });

        if (verifyRes.success) {
          authService.updateSubscriptionState('trialing', tier);
          authService.clearPendingPlan();
          onShowToast(
            `Verification complete! 14-day ${authoritativePlan.name} trial activated.`,
            'success'
          );
          onNavigate('dashboard');
        } else {
          setErrorMessage(verifyRes.error || 'Verification failed');
        }
        setIsLoading(false);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Could not initiate $1 verification.');
      onShowToast(err.message || 'Could not initiate $1 verification.', 'error');
    }
  };

  return (
    <div className="min-h-[calc(100vh-14rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-900 text-white shadow-xs mb-3">
              <ShieldCheck className="w-6 h-6 text-blue-100" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Verify Your Plan to Start Trial
            </h1>
            <p className="text-xs text-gray-600 mt-1">
              A $1 refundable token verification is required to activate your 14-day trial.
            </p>
          </div>

          {/* Selected Plan Card (Locked) */}
          <div
            id="selected-plan-card"
            className="mb-6 p-4 bg-blue-50/90 border border-blue-200 rounded-xl space-y-3 text-xs shadow-2xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-blue-200/70">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="font-bold text-blue-950 text-sm">
                  Selected plan: {authoritativePlan.name}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                Locked
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500 block text-[11px]">Price:</span>
                <strong className="text-gray-900 font-bold text-sm">
                  {authoritativePrice}
                </strong>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px]">Trial:</span>
                <strong className="text-emerald-700 font-bold text-sm">
                  14 days
                </strong>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-200/70 space-y-1 text-xs text-gray-700 leading-relaxed">
              <div className="flex items-start gap-1.5 text-blue-950 font-bold">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>$1 verification payment required.</span>
              </div>
              <p className="text-gray-600 pl-5 text-[11px]">
                Your selected plan will be activated for a 14-day trial after verification.
              </p>
              <p className="text-emerald-700 font-semibold pl-5 text-[11px]">
                No plan charge today.
              </p>
            </div>

            {/* Supported Payment Methods Badges */}
            <div className="pt-2 border-t border-blue-200/70 space-y-1.5">
              <span className="text-[10px] font-bold text-blue-950 uppercase tracking-wider block">
                Supported Payment Methods
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-blue-200/80 text-gray-700 font-medium">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> UPI
                </span>
                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-blue-200/80 text-gray-700 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Cards
                </span>
                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-blue-200/80 text-gray-700 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Netbanking
                </span>
                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-blue-200/80 text-gray-700 font-medium">
                  <Wallet className="w-3.5 h-3.5 text-amber-600" /> Wallets
                </span>
              </div>
              <p className="text-[10px] text-gray-600 pt-0.5 font-medium">
                {ONE_TIME_PAYMENT_DISCLOSURE}
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action CTA */}
          <button
            type="button"
            onClick={handleStartVerification}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Razorpay Verification...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{ctaLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="mt-2 text-[10px] text-center text-gray-500 font-medium">
            {ONE_TIME_PAYMENT_DISCLOSURE}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Logged in as <strong>{currentUser?.email || 'Guest'}</strong></span>
            <button
              type="button"
              onClick={() => onNavigate('pricing')}
              className="text-blue-900 hover:underline font-semibold"
            >
              Choose different plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
