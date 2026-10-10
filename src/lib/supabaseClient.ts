import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Browser-safe environment configuration (NEVER expose SUPABASE_SERVICE_ROLE_KEY)
const getMetaEnv = (key: string): string | undefined => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch {
    // ignore
  }
  return undefined;
};

const envUrl = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined) || getMetaEnv('VITE_SUPABASE_URL') || getMetaEnv('NEXT_PUBLIC_SUPABASE_URL');
const envAnonKey = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined) || getMetaEnv('VITE_SUPABASE_ANON_KEY') || getMetaEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const envSiteUrl = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SITE_URL : undefined) || getMetaEnv('VITE_SITE_URL');

let supabaseInstance: SupabaseClient | null = null;
let configCache: {
  url: string;
  anonKey: string;
  siteUrl: string;
  oauthProviders: { google: boolean; microsoft: boolean };
} | null = null;

export interface AuthConfig {
  configured: boolean;
  url: string;
  anonKey: string;
  siteUrl: string;
  oauthProviders: {
    google: boolean;
    microsoft: boolean;
  };
  error?: string;
}

export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/auth\/v1\/?$/, '');
  return url.replace(/\/+$/, '');
}

/**
 * Validates public Supabase credentials and returns whether the client is ready
 */
export function validateSupabaseConfig(url?: string, anonKey?: string): { valid: boolean; error?: string } {
  const checkUrl = normalizeSupabaseUrl(url || configCache?.url || envUrl || '');
  const checkKey = anonKey || configCache?.anonKey || envAnonKey;

  if (!checkUrl || !checkKey || checkUrl.includes('placeholder')) {
    const missing = [];
    if (!checkUrl || checkUrl.includes('placeholder')) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!checkKey || checkKey.includes('placeholder')) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const msg = `Missing required Supabase configuration: ${missing.join(', ')}.`;
    return { valid: false, error: msg };
  }

  return { valid: true };
}

/**
 * Fetch authoritative runtime public auth configuration from server
 */
export async function fetchAuthConfig(): Promise<AuthConfig> {
  if (configCache) {
    return {
      configured: true,
      url: configCache.url,
      anonKey: configCache.anonKey,
      siteUrl: configCache.siteUrl,
      oauthProviders: configCache.oauthProviders
    };
  }

  try {
    const res = await fetch('/api/auth/config');
    if (res.ok) {
      const data = await res.json();
      if (data.configured && data.url && data.anonKey) {
        configCache = {
          url: normalizeSupabaseUrl(data.url),
          anonKey: data.anonKey,
          siteUrl: data.siteUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
          oauthProviders: data.oauthProviders || { google: false, microsoft: false }
        };
        updateSupabaseClient(configCache.url, configCache.anonKey);
        return {
          ...data,
          url: configCache.url
        };
      }
    }
  } catch {
    // server endpoint optional or offline
  }

  const siteUrl = envSiteUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const valid = validateSupabaseConfig();

  return {
    configured: valid.valid,
    url: normalizeSupabaseUrl(envUrl || ''),
    anonKey: envAnonKey || '',
    siteUrl,
    oauthProviders: { google: false, microsoft: false },
    error: valid.error
  };
}

export function isSupabaseConfigured(): boolean {
  const url = normalizeSupabaseUrl(configCache?.url || envUrl || '');
  const anonKey = configCache?.anonKey || envAnonKey || '';
  return Boolean(url && anonKey && !url.includes('placeholder') && !anonKey.includes('placeholder'));
}

/**
 * Returns the singleton browser Supabase client
 */
export function getSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const configured = isSupabaseConfigured();
  const url = configured ? normalizeSupabaseUrl(configCache?.url || envUrl || '') : 'https://placeholder.supabase.co';
  const anonKey = configured ? (configCache?.anonKey || envAnonKey || '') : 'placeholder-key';

  supabaseInstance = createClient(url, anonKey, {
    auth: {
      persistSession: configured,
      autoRefreshToken: configured,
      detectSessionInUrl: configured,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce'
    }
  });

  return supabaseInstance;
}

export function updateSupabaseClient(url: string, anonKey: string): SupabaseClient {
  configCache = {
    url,
    anonKey,
    siteUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    oauthProviders: { google: false, microsoft: false }
  };
  supabaseInstance = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce'
    }
  });
  return supabaseInstance;
}

// Lazy safe proxy export for standard imports
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    // @ts-ignore
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
