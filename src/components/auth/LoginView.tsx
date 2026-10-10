import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  KeyRound,
  Terminal
} from 'lucide-react';
import { authService } from '../../services/authService';
import * as apiService from '../../services/api';
import { UserProfile } from '../../types';

interface LoginViewProps {
  onNavigate: (view: string, queryParams?: Record<string, string>) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onAuthenticated: () => void;
  onRequireTwoFactor: (user: UserProfile) => void;
  initialEmail?: string;
  verifiedMessage?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onNavigate,
  onShowToast,
  onAuthenticated,
  onRequireTwoFactor,
  initialEmail = '',
  verifiedMessage = false
}) => {
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkMode, setIsMagicLinkMode] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Auth config & developer alert state
  const [authConfig, setAuthConfig] = useState<{
    isConfigured: boolean;
    oauthProviders: { google: boolean; microsoft: boolean };
    developerError?: string | null;
  }>({
    isConfigured: false,
    oauthProviders: { google: false, microsoft: false },
    developerError: null
  });

  // Error & Security State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutMinutes, setLockoutMinutes] = useState<number | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const hasShownToastRef = useRef(false);

  useEffect(() => {
    // Fetch auth configuration for OAuth provider availability & developer checks
    apiService.getAuthConfig().then((cfg) => {
      setAuthConfig({
        isConfigured: !!cfg.isConfigured,
        oauthProviders: cfg.oauthProviders || { google: false, microsoft: false },
        developerError: cfg.developerError || null
      });
    }).catch((e) => {
      console.warn('Failed to load auth config:', e);
    });
  }, []);

  useEffect(() => {
    if (verifiedMessage && !hasShownToastRef.current) {
      hasShownToastRef.current = true;
      onShowToast('Email verified successfully! Please log in with your credentials.', 'success');
    }
  }, [verifiedMessage, onShowToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setWarningMessage(null);
    setIsUnverified(false);
    setResendStatus(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email format.');
      return;
    }

    if (!authConfig.isConfigured) {
      setErrorMessage('Authentication is not configured.');
      return;
    }

    if (isMagicLinkMode) {
      setIsLoading(true);
      try {
        const res = await authService.signInWithMagicLink(email.trim());
        setIsLoading(false);
        if (res.success) {
          setMagicLinkSent(true);
          onShowToast(res.message, 'success');
        } else {
          setErrorMessage(res.message || 'Failed to dispatch magic link.');
        }
      } catch (err: any) {
        setIsLoading(false);
        setErrorMessage(err.message || 'Failed to dispatch magic link.');
      }
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authService.login(email.trim(), password, rememberMe);
      setIsLoading(false);

      if (res.isLocked) {
        setIsLocked(true);
        setLockoutMinutes(res.lockoutRemainingMinutes || 15);
        setErrorMessage(`Too many failed attempts. Please try again in ${res.lockoutRemainingMinutes || 15} minutes.`);
        return;
      }

      if (res.isUnverified) {
        setIsUnverified(true);
        setErrorMessage('Your email address has not been confirmed yet. Please check your inbox for the confirmation link sent during sign up, or click Resend below.');
        return;
      }

      if (!res.success) {
        setErrorMessage(res.message || 'Invalid email or password');
        if (res.warning) {
          setWarningMessage(res.warning);
        }
        return;
      }

      onShowToast(`Welcome back, ${res.user?.name || 'User'}!`, 'success');
      onAuthenticated();

      // Resolve destination
      if (res.redirectTo === '/pricing' || res.user?.billingStatus === 'trial_expired') {
        onNavigate('pricing', { expired: 'true' });
      } else {
        onNavigate('dashboard');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Invalid email or password');
    }
  };

  const handleResendVerification = async () => {
    setResendStatus('Sending confirmation link...');
    try {
      const res = await authService.resendVerificationEmail(email.trim());
      setResendStatus(res.message);
      onShowToast(res.message, res.success ? 'success' : 'error');
    } catch (e: any) {
      setResendStatus(e?.message || 'Failed to send confirmation email. Please try again later.');
    }
  };

  const handleOAuth = async (provider: 'google' | 'microsoft') => {
    setIsLoading(true);
    try {
      const res = await authService.loginWithOAuth(provider);
      setIsLoading(false);
      if (res.success) {
        onShowToast(res.message, 'success');
      } else {
        onShowToast(res.message || 'OAuth authentication failed', 'error');
      }
    } catch (e: any) {
      setIsLoading(false);
      onShowToast(e.message || 'OAuth authentication failed', 'error');
    }
  };

  const hasAnyOAuth = authConfig.isConfigured || authConfig.oauthProviders.google || authConfig.oauthProviders.microsoft;

  return (
    <div className="min-h-[calc(100vh-14rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Clear Configuration Alert if Supabase Credentials are missing */}
        {!authConfig.isConfigured && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-xl flex items-start gap-2.5 text-xs text-red-900 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Authentication is not configured.</div>
              <p className="mt-0.5 text-[11px] text-red-800">
                Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) are not set. Secure authentication cannot proceed.
              </p>
            </div>
          </div>
        )}

        {authConfig.developerError && authConfig.isConfigured && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-xs">
            <Terminal className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Supabase Configuration Notice:</div>
              <p className="mt-0.5 text-[11px] text-amber-800">{authConfig.developerError}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-900 text-white shadow-xs mb-3">
              <Shield className="w-6 h-6 text-blue-100" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Log in to NoChurn</h1>
            <p className="text-xs text-gray-600 mt-1">
              Access your churn predictions, retention playbooks, and ROI metrics.
            </p>
          </div>

          {verifiedMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Email confirmed! Please log in with your password.</span>
            </div>
          )}

          {magicLinkSent && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-blue-900">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Verification link dispatched! Please check your email inbox to sign in.</span>
            </div>
          )}

          {/* Section Heading: LOGIN WITH PASSWORD */}
          <div className="mb-3 pb-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-900" />
              {isMagicLinkMode ? 'Sign In with Email Link' : 'Login with Password'}
            </span>
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              14-Day Free Trial
            </span>
          </div>

          {/* Security alerts: Lockout, Unverified, or Warning */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">{errorMessage}</span>
                {isUnverified && (
                  <div className="mt-2 pt-2 border-t border-red-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-red-600">Need a new confirmation link?</span>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      Resend confirmation email
                    </button>
                  </div>
                )}
                {resendStatus && (
                  <p className="mt-1 text-[11px] font-medium text-emerald-700">{resendStatus}</p>
                )}
                {isLocked && (
                  <p className="mt-1 text-[11px] text-red-800">
                    Account locked for 15 minutes due to security policy (5 failed attempts). You can also click{' '}
                    <button
                      type="button"
                      onClick={() => onNavigate('forgot-password')}
                      className="underline font-bold hover:text-red-950"
                    >
                      Forgot Password
                    </button>{' '}
                    to reset immediately.
                  </p>
                )}
              </div>
            </div>
          )}

          {warningMessage && !isLocked && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{warningMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  disabled={isLocked}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 disabled:opacity-50"
                />
              </div>
            </div>

            {!isMagicLinkMode && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">Password</label>
                  <button
                    type="button"
                    onClick={() => onNavigate('forgot-password')}
                    className="text-xs text-blue-900 hover:underline font-semibold"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isLocked}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {!isMagicLinkMode && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 text-blue-900 focus:ring-blue-900/20"
                  />
                  <span>Remember me (extends session)</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isLocked}
              className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {isLoading ? (
                <span>Validating Credentials...</span>
              ) : isMagicLinkMode ? (
                <>
                  <span>Send Verification Link</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Log In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Social OAuth / Alternative Separation */}
          {hasAnyOAuth && (
            <>
              <div className="relative flex items-center justify-center my-5">
                <div className="border-t border-gray-200 w-full"></div>
                <span className="bg-white px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider absolute">
                  Or
                </span>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  disabled={isLoading || !authConfig.isConfigured}
                  className="w-full py-2.5 px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
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
                  <span>Continue with Google</span>
                </button>
              </div>
            </>
          )}

          {/* Optional: Email verification code / link toggle */}
          <div className="text-center pt-3 mt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setIsMagicLinkMode(!isMagicLinkMode);
                setErrorMessage(null);
              }}
              className="text-[11px] text-gray-500 hover:text-blue-900 underline font-medium cursor-pointer"
            >
              {isMagicLinkMode ? 'Sign in with password instead' : 'Use email verification link instead'}
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center text-xs text-gray-600">
            Don't have an account yet?{' '}
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="text-blue-900 hover:underline font-bold"
            >
              Start free trial
            </button>
          </div>
        </div>

        {/* Security Policy Reminder */}
        <div className="mt-4 text-center text-[11px] text-gray-700 flex items-center justify-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          <span>Sessions automatically log out after 30 days of inactivity for security.</span>
        </div>
      </div>
    </div>
  );
};
