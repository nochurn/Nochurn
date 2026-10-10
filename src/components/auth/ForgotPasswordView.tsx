import React, { useState } from 'react';
import { Shield, Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { authService } from '../../services/authService';

interface ForgotPasswordViewProps {
  onNavigate: (view: string, queryParams?: Record<string, string>) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({
  onNavigate,
  onShowToast
}) => {
  const [email, setEmail] = useState('nageshsharat@gmail.com');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [generatedResetToken, setGeneratedResetToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your account email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.requestPasswordReset(email);
      setIsLoading(false);

      if (res.success) {
        setIsSubmitted(true);
        if (res.resetToken) {
          setGeneratedResetToken(res.resetToken);
        }
        onShowToast(res.message || 'Password reset link sent (valid for 24 hours, single-use).', 'info');
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Failed to dispatch password reset link.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-14rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-900 text-white shadow-xs mb-3">
              <KeyRound className="w-6 h-6 text-blue-100" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reset Your Password</h1>
            <p className="text-xs text-gray-600 mt-1">
              Enter your email to receive a secure, single-use reset link valid for 24 hours.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <span>Sending Reset Link...</span>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Reset Email Dispatched!</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  We've sent a 24-hour single-use password reset link to <strong>{email}</strong>. Please check your inbox.
                </p>
              </div>

              {/* Simulation One-Click Action */}
              {generatedResetToken && (
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
                  <span className="text-[11px] font-semibold text-blue-950 block">
                    Instant Test Simulator:
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('reset-password', { token: generatedResetToken })}
                    className="w-full py-2 px-3 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>Click Simulated Reset Link</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="text-xs text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
