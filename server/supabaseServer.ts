import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { Request, Response } from 'express';

export interface ServerAuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  siteUrl: string;
  projectRef: string;
  isConfigured: boolean;
  oauthProviders: {
    google: boolean;
    microsoft: boolean;
  };
}

let cachedConfig: ServerAuthConfig | null = null;
let adminClient: SupabaseClient | null = null;
let publicClient: SupabaseClient | null = null;

/**
 * Normalizes and validates Supabase environment variables at startup
 */
export function getValidatedAuthConfig(): ServerAuthConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Detect and resolve public anon key
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  
  // Extract project ref if available from JWT
  let projectRef = '';
  if (anonKey && anonKey.includes('.')) {
    try {
      const payload = JSON.parse(Buffer.from(anonKey.split('.')[1], 'base64').toString());
      if (payload.ref) projectRef = payload.ref;
    } catch (e) {
      // ignore
    }
  }

  // Resolve Supabase URL
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!supabaseUrl && projectRef) {
    supabaseUrl = `https://${projectRef}.supabase.co`;
  } else if (!supabaseUrl) {
    supabaseUrl = process.env.SUPABASE_URL || '';
  }

  // Normalize URL trailing slashes and rest/v1 suffixes
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/auth\/v1\/?$/, '');
  supabaseUrl = supabaseUrl.replace(/\/+$/, '');

  // Service role key (never expose to client)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // Site URL for OAuth and email redirect callbacks
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'http://localhost:3000';
  siteUrl = siteUrl.replace(/\/+$/, '');

  // Check optional OAuth configuration
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_ID !== 'disabled'
  );
  const microsoftConfigured = Boolean(
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET &&
    process.env.AZURE_CLIENT_ID !== 'disabled'
  );

  const missingVars: string[] = [];
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missingVars.length > 0) {
    console.info(
      `[NoChurn Auth] Supabase cloud auth credentials (${missingVars.join(', ')}) not set. Running with built-in native workspace authentication.`
    );
  } else {
    console.log(
      `\x1b[32m[NoChurn Auth] Supabase Auth initialized for project:\x1b[0m ${supabaseUrl} (Site: ${siteUrl})`
    );
  }

  cachedConfig = {
    supabaseUrl,
    supabaseAnonKey: anonKey,
    supabaseServiceRoleKey: serviceRoleKey,
    siteUrl,
    projectRef,
    isConfigured: Boolean(supabaseUrl && anonKey),
    oauthProviders: {
      google: googleConfigured,
      microsoft: microsoftConfigured
    }
  };

  return cachedConfig;
}

/**
 * Returns the admin Supabase client with service role key (Server-only)
 */
export function getAdminClient(): SupabaseClient | null {
  if (adminClient) return adminClient;
  const config = getValidatedAuthConfig();
  if (!config.supabaseUrl || (!config.supabaseServiceRoleKey && !config.supabaseAnonKey)) {
    return null;
  }

  const keyToUse = config.supabaseServiceRoleKey || config.supabaseAnonKey;
  adminClient = createClient(config.supabaseUrl, keyToUse, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return adminClient;
}

/**
 * Returns public Supabase client using anon key
 */
export function getPublicClient(): SupabaseClient | null {
  if (publicClient) return publicClient;
  const config = getValidatedAuthConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) return null;

  publicClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return publicClient;
}

/**
 * Extracts authentication token from Bearer header or Supabase cookies
 */
export function extractAuthToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const sessionHeader = req.headers['x-session-token'] as string;
  if (sessionHeader && !sessionHeader.startsWith('sess_')) {
    return sessionHeader.trim();
  }

  if (req.cookies) {
    if (req.cookies['sb-access-token']) {
      return req.cookies['sb-access-token'];
    }

    // Supabase standard cookie naming pattern: sb-<ref>-auth-token
    const config = getValidatedAuthConfig();
    const cookieName = config.projectRef ? `sb-${config.projectRef}-auth-token` : null;
    if (cookieName && req.cookies[cookieName]) {
      const val = req.cookies[cookieName];
      try {
        const parsed = typeof val === 'string' ? JSON.parse(val) : val;
        if (Array.isArray(parsed) && parsed[0]) return parsed[0];
        if (parsed.access_token) return parsed.access_token;
      } catch (e) {
        if (typeof val === 'string' && val.length > 20) return val;
      }
    }
  }

  return null;
}

/**
 * Securely verifies and gets current user from request via Supabase Auth
 */
export async function getSupabaseUser(req: Request): Promise<User | null> {
  const token = extractAuthToken(req);
  if (!token) return null;

  const client = getAdminClient() || getPublicClient();
  if (!client) return null;

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return data.user;
  } catch (e) {
    console.error('[NoChurn Auth] Error verifying Supabase token:', e);
    return null;
  }
}

/**
 * Sets session cookies on response
 */
export function setAuthCookies(res: Response, accessToken: string, refreshToken?: string, maxAgeDays = 30) {
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.APP_URL?.startsWith('https'));

  res.cookie('sb-access-token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge,
    path: '/'
  });

  if (refreshToken) {
    res.cookie('sb-refresh-token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge,
      path: '/'
    });
  }
}

/**
 * Clears session cookies on response
 */
export function clearAuthCookies(res: Response) {
  res.clearCookie('sb-access-token', { path: '/' });
  res.clearCookie('sb-refresh-token', { path: '/' });
  
  const config = getValidatedAuthConfig();
  if (config.projectRef) {
    res.clearCookie(`sb-${config.projectRef}-auth-token`, { path: '/' });
  }
}

/**
 * Validates and normalizes allowed redirect destinations
 */
export function validateRedirectDestination(requestedUrl?: string | null): string {
  if (!requestedUrl) return '/dashboard';

  // Strip leading slash for analysis
  const clean = requestedUrl.trim();

  // Prevent open redirect attacks (no external schemas or double slashes)
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('//')) {
    return '/dashboard';
  }

  const allowedPrefixes = [
    '/dashboard',
    '/billing',
    '/settings',
    '/pricing',
    '/customers',
    '/action-queue',
    '/closed-loop',
    '/roadmap',
    '/analytics',
    '/roi',
    '/alerts',
    '/playbooks',
    '/integrations'
  ];

  for (const prefix of allowedPrefixes) {
    if (clean === prefix || clean.startsWith(prefix + '/') || clean.startsWith(prefix + '?')) {
      return clean;
    }
  }

  return '/dashboard';
}
