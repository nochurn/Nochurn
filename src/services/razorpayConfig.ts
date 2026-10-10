/**
 * NoChurn Authoritative Razorpay Configuration & Payment Methods
 *
 * Supported Payment Methods:
 * - UPI (Google Pay, PhonePe, Paytm, BHIM, any UPI ID / QR)
 * - Credit Cards (Visa, Mastercard, Amex, RuPay, Diners)
 * - Debit Cards (Visa, Mastercard, RuPay, Maestro)
 * - Netbanking (All Indian banks: HDFC, ICICI, SBI, Axis, Kotak, etc.)
 * - Wallets (Paytm, PhonePe, Mobikwik, Amazon Pay, Freecharge)
 */

import { CENTRAL_PRICING } from '../config/pricing';

export interface RazorpayPaymentMethodConfig {
  upi: boolean;
  card: boolean;
  netbanking: boolean;
  wallet: boolean;
  emi: boolean;
  paylater: boolean;
}

/**
 * Authoritative one-time payment methods configuration for Razorpay Checkout.
 * Used for:
 * A. $1 trial verification
 * B. Annual plan activation
 * C. One-time upgrade payments
 * D. Failed-payment retry
 */
export const oneTimePaymentMethods: RazorpayPaymentMethodConfig = {
  upi: true,
  card: true,
  netbanking: true,
  wallet: true,
  emi: false,
  paylater: false
};

/**
 * Standard required disclosures
 */
export const ONE_TIME_PAYMENT_DISCLOSURE =
  'Pay securely via debit/credit card, netbanking, UPI, or wallet in USD.';

export const MONTHLY_RECURRING_DISCLOSURE =
  'Monthly billing charged in USD on a 30-day recurring cycle.';

export const RECURRING_MANDATE_DISCLOSURE = MONTHLY_RECURRING_DISCLOSURE;

/**
 * Authoritative pricing lookup (USD) derived directly from centralized pricing
 * Starter: $49/mo, $468/yr ($39/mo)
 * Growth: $149/mo, $1,428/yr ($119/mo)
 * Enterprise: $499/mo, $4,788/yr ($399/mo)
 */
export const AUTHORITATIVE_PLANS: Record<
  string,
  {
    name: string;
    monthlyPrice: number;
    annualPrice: number;
    annualTotalPrice: number;
    formattedMonthly: string;
    formattedAnnual: string;
    checkoutMonthlyLabel: string;
    checkoutAnnualLabel: string;
  }
> = {
  starter: {
    name: CENTRAL_PRICING.starter.displayName,
    monthlyPrice: CENTRAL_PRICING.starter.monthly.amountUsd,
    annualPrice: CENTRAL_PRICING.starter.annual.monthlyEquivalentUsd,
    annualTotalPrice: CENTRAL_PRICING.starter.annual.totalAmountUsd,
    formattedMonthly: CENTRAL_PRICING.starter.monthly.formatted,
    formattedAnnual: CENTRAL_PRICING.starter.annual.formatted,
    checkoutMonthlyLabel: CENTRAL_PRICING.starter.monthly.checkoutLabel,
    checkoutAnnualLabel: CENTRAL_PRICING.starter.annual.checkoutLabel
  },
  growth: {
    name: CENTRAL_PRICING.growth.displayName,
    monthlyPrice: CENTRAL_PRICING.growth.monthly.amountUsd,
    annualPrice: CENTRAL_PRICING.growth.annual.monthlyEquivalentUsd,
    annualTotalPrice: CENTRAL_PRICING.growth.annual.totalAmountUsd,
    formattedMonthly: CENTRAL_PRICING.growth.monthly.formatted,
    formattedAnnual: CENTRAL_PRICING.growth.annual.formatted,
    checkoutMonthlyLabel: CENTRAL_PRICING.growth.monthly.checkoutLabel,
    checkoutAnnualLabel: CENTRAL_PRICING.growth.annual.checkoutLabel
  },
  pro: {
    name: CENTRAL_PRICING.pro.displayName,
    monthlyPrice: CENTRAL_PRICING.pro.monthly.amountUsd,
    annualPrice: CENTRAL_PRICING.pro.annual.monthlyEquivalentUsd,
    annualTotalPrice: CENTRAL_PRICING.pro.annual.totalAmountUsd,
    formattedMonthly: CENTRAL_PRICING.pro.monthly.formatted,
    formattedAnnual: CENTRAL_PRICING.pro.annual.formatted,
    checkoutMonthlyLabel: CENTRAL_PRICING.pro.monthly.checkoutLabel,
    checkoutAnnualLabel: CENTRAL_PRICING.pro.annual.checkoutLabel
  },
  enterprise: {
    name: CENTRAL_PRICING.pro.displayName,
    monthlyPrice: CENTRAL_PRICING.pro.monthly.amountUsd,
    annualPrice: CENTRAL_PRICING.pro.annual.monthlyEquivalentUsd,
    annualTotalPrice: CENTRAL_PRICING.pro.annual.totalAmountUsd,
    formattedMonthly: CENTRAL_PRICING.pro.monthly.formatted,
    formattedAnnual: CENTRAL_PRICING.pro.annual.formatted,
    checkoutMonthlyLabel: CENTRAL_PRICING.pro.monthly.checkoutLabel,
    checkoutAnnualLabel: CENTRAL_PRICING.pro.annual.checkoutLabel
  }
};

/**
 * Helper to build Razorpay Standard Checkout options for one-time payments
 * ($1 trial verification, Annual plan activation, One-time upgrade payments, Failed-payment retry)
 * Checkout display order:
 * 1. Card
 * 2. Netbanking
 * 3. UPI / Wallet
 */
export function buildRazorpayOneTimeOptions(params: {
  keyId: string;
  orderId: string;
  amountPaise?: number;
  amountCents?: number;
  amount?: number;
  currency?: string;
  name?: string;
  description: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: Record<string, string>;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onDismiss?: () => void;
}) {
  const chargeAmount = params.amount ?? params.amountCents ?? params.amountPaise ?? 0;
  return {
    key: params.keyId,
    amount: chargeAmount,
    currency: params.currency || 'USD',
    name: params.name || 'NoChurn',
    description: params.description,
    order_id: params.orderId,
    prefill: {
      name: params.customerName || 'Founder',
      email: params.customerEmail || 'founder@nochurn.com',
      contact: params.customerPhone || ''
    },
    notes: params.notes || {},
    method: {
      upi: true,
      card: true,
      netbanking: true,
      wallet: true,
      emi: false,
      paylater: false
    },
    config: {
      display: {
        blocks: {
          preferred: {
            name: 'Pay via UPI, Cards, Netbanking or Wallet',
            instruments: [
              { method: 'upi' },
              { method: 'card' },
              { method: 'netbanking' },
              { method: 'wallet' }
            ]
          }
        },
        sequence: ['block.preferred'],
        preferences: {
          show_default_blocks: true
        }
      }
    },
    theme: {
      color: '#1E3A8A'
    },
    modal: {
      ondismiss: params.onDismiss || (() => {})
    },
    handler: params.handler
  };
}

/**
 * Helper to build Razorpay Checkout options for Recurring Subscriptions (Monthly)
 * Recurring payments require UPI AutoPay or card mandate
 */
export function buildRazorpaySubscriptionOptions(params: {
  keyId: string;
  subscriptionId: string;
  name?: string;
  description?: string;
  planName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: Record<string, string>;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
  }) => void;
  onDismiss?: () => void;
}) {
  return {
    key: params.keyId,
    subscription_id: params.subscriptionId,
    name: params.name || 'NoChurn',
    description: params.description || (params.planName ? `${params.planName} Monthly Mandate` : 'NoChurn Monthly Mandate'),
    prefill: {
      name: params.customerName || 'Founder',
      email: params.customerEmail || 'founder@nochurn.com',
      contact: params.customerPhone || ''
    },
    notes: params.notes || {},
    method: {
      upi: true,
      card: true,
      netbanking: true,
      wallet: false,
      emi: false,
      paylater: false
    },
    config: {
      display: {
        blocks: {
          mandate: {
            name: 'UPI AutoPay & Card Mandate',
            instruments: [
              { method: 'upi' },
              { method: 'card' },
              { method: 'netbanking' }
            ]
          }
        },
        sequence: ['block.mandate'],
        preferences: {
          show_default_blocks: true
        }
      }
    },
    theme: {
      color: '#1E3A8A'
    },
    modal: {
      ondismiss: params.onDismiss || (() => {})
    },
    handler: params.handler
  };
}
