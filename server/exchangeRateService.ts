/**
 * NoChurn Server-Authoritative USD -> INR Exchange Rate Service
 *
 * Implements:
 * - Live fetching from reliable foreign exchange endpoints with strict timeout
 * - Server-authoritative caching (1-hour fresh TTL, 24-hour maximum fallback age)
 * - Safe fallback strategy with age verification
 * - Error logging and graceful failure responses (no hard-coded rates or fake conversions)
 */

interface ExchangeRateRecord {
  rate: number;
  base: string;
  target: string;
  timestamp: number;
  source: 'live' | 'cache' | 'configured_fallback';
  lastUpdatedIso: string;
}

// In-memory cached rate
let cachedExchangeRate: ExchangeRateRecord | null = null;

const CACHE_FRESH_MS = 60 * 60 * 1000; // 1 hour fresh
const MAX_FALLBACK_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours max threshold

/**
 * Fetch live USD -> INR exchange rate from authoritative providers with timeout
 */
async function fetchLiveRate(): Promise<number> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    // Primary Provider: Open Exchange Rates public mirror
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const inr = Number(data?.rates?.INR);
      if (inr && !isNaN(inr) && inr > 50 && inr < 150) {
        return Number(inr.toFixed(2));
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    // Try secondary provider
  }

  // Secondary Provider: Fallback public FX feed
  const secondController = new AbortController();
  const secondTimeoutId = setTimeout(() => secondController.abort(), 4000);

  try {
    const res2 = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      signal: secondController.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(secondTimeoutId);

    if (res2.ok) {
      const data2 = await res2.json();
      const inr2 = Number(data2?.rates?.INR);
      if (inr2 && !isNaN(inr2) && inr2 > 50 && inr2 < 150) {
        return Number(inr2.toFixed(2));
      }
    }
  } catch (err2) {
    clearTimeout(secondTimeoutId);
  }

  throw new Error('All external exchange rate providers unreachable');
}

/**
 * Retrieve verified server-authoritative exchange rate
 */
export async function getVerifiedUsdToInrRate(): Promise<ExchangeRateRecord> {
  const now = Date.now();

  // 1. Return fresh cache if within 1 hour
  if (cachedExchangeRate && (now - cachedExchangeRate.timestamp) < CACHE_FRESH_MS) {
    return cachedExchangeRate;
  }

  // 2. Attempt live fetch
  try {
    const liveRate = await fetchLiveRate();
    const record: ExchangeRateRecord = {
      rate: liveRate,
      base: 'USD',
      target: 'INR',
      timestamp: now,
      source: 'live',
      lastUpdatedIso: new Date(now).toISOString()
    };
    cachedExchangeRate = record;
    return record;
  } catch (err: any) {
    console.warn('[Exchange Rate Service Warning] Live rate fetch failed:', err.message);

    // 3. Fallback: Use cached rate if within allowed 24-hour threshold
    if (cachedExchangeRate && (now - cachedExchangeRate.timestamp) < MAX_FALLBACK_AGE_MS) {
      console.info('[Exchange Rate Service] Using verified cached rate within fallback threshold.');
      return {
        ...cachedExchangeRate,
        source: 'cache'
      };
    }

    // 4. Optional: Explicitly configured environment fallback rate with threshold check
    const envFallback = process.env.FALLBACK_USD_TO_INR_RATE ? parseFloat(process.env.FALLBACK_USD_TO_INR_RATE) : null;
    if (envFallback && !isNaN(envFallback) && envFallback > 50 && envFallback < 150) {
      const record: ExchangeRateRecord = {
        rate: Number(envFallback.toFixed(2)),
        base: 'USD',
        target: 'INR',
        timestamp: now,
        source: 'configured_fallback',
        lastUpdatedIso: new Date(now).toISOString()
      };
      cachedExchangeRate = record;
      return record;
    }

    // 5. Total failure: Do NOT invent random or stale rate. Log error and reject.
    console.error('[Exchange Rate Service Error] Exchange rate provider failed and no valid fallback exists.');
    throw new Error('Exchange rate service temporarily unavailable. Please retry in a few moments.');
  }
}

/**
 * Convert USD amount to payable INR using verified rate and standard rounding
 */
export async function convertUsdToInr(usdAmount: number): Promise<{
  usdAmount: number;
  inrAmount: number;
  amountPaise: number;
  rate: number;
  displayRate: string;
  source: string;
}> {
  const rateRecord = await getVerifiedUsdToInrRate();
  const inrAmount = Math.round(usdAmount * rateRecord.rate);
  const amountPaise = inrAmount * 100;

  return {
    usdAmount,
    inrAmount,
    amountPaise,
    rate: rateRecord.rate,
    displayRate: `1 USD = ₹${rateRecord.rate.toFixed(2)}`,
    source: rateRecord.source
  };
}
