import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { authService, validatePasswordRequirements } from '../../services/authService';

interface ResetPasswordViewProps {
  token?: string;
  onNavigate: (view: string, queryParams?: Record<string, string>) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  token = 'demo-reset-token',
  onNavigate,
  onShowToast
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordReqs = validatePasswordRequirements(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!passwordReqs.isValid) {
      setErrorMessage('Password does not meet all security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.resetPassword(token, password);
      setIsLoading(false);

      if (res.success) {
        onShowToast('Password updated! Please login', 'success');
        onNavigate('login');
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Failed to update password.');
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
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Set New Password</h1>
            <p className="text-xs text-gray-600 mt-1">
              Create a strong password meeting all enterprise security standards.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
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
                    <span className={`flex items-center gap-1 ${passwordReqs.hasNumber ? 'text-emerald-600 font-medium' : ''}`}>
                      <CheckCircle2 className={`w-3 h-3 ${passwordReqs.hasNumber ? 'text-emerald-600' : 'text-gray-300'}`} />
                      1 number
                    </span>
                    <span className={`flex items-center gap-1 ${passwordReqs.hasSpecialChar ? 'text-emerald-600 font-medium' : ''}`}>
                      <CheckCircle2 className={`w-3 h-3 ${passwordReqs.hasSpecialChar ? 'text-emerald-600' : 'text-gray-300'}`} />
                      1 special symbol
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              Note: Updating your password invalidates all existing active sessions on other devices for security.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <span>Updating Password...</span>
              ) : (
                <>
                  <span>Save Password & Invalidate Sessions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="text-xs text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Cancel & Return to Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
