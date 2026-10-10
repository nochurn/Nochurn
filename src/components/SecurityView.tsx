import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Smartphone,
  Lock,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Key,
  Users,
  Clock,
  ExternalLink,
  QrCode,
  Copy,
  RefreshCw,
  LogOut,
  Laptop,
  Check,
  Eye,
  AlertCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import { authService } from '../services/authService';
import { UserProfile, UserSession } from '../types';

interface SecurityViewProps {
  initialTab?: '2fa' | 'sessions' | 'governance';
  onNavigate?: (view: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  onLoggedOut?: () => void;
}

export const SecurityView: React.FC<SecurityViewProps> = ({
  initialTab = '2fa',
  onNavigate,
  onShowToast,
  onLoggedOut
}) => {
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    if (onShowToast) {
      onShowToast(message, type);
    }
  };

  const [activeTab, setActiveTab] = useState<'2fa' | 'sessions' | 'governance'>(initialTab);

  // User & 2FA State
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled ?? false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'sms' | 'authenticator'>(
    user?.twoFactorMethod ?? 'sms'
  );

  // Setup Wizard State
  const [setupMode, setSetupMode] = useState<'none' | 'sms' | 'authenticator'>('none');
  const [smsPhone, setSmsPhone] = useState(user?.phone || '+1 (415) 890-2144');
  const [verificationCode, setVerificationCode] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const manualAuthenticatorKey = user?.twoFactorSecret || 'JBSWY3DPEHPK3PXP';
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<UserSession[]>(() => authService.getSessions());
  const [refreshCountdown, setRefreshCountdown] = useState(60);
  const [sessionToRevoke, setSessionToRevoke] = useState<UserSession | null>(null);
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);

  // Deletion Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteScheduled, setDeleteScheduled] = useState(false);

  // Auto-refresh sessions every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          setSessions(authService.getSessions());
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Generate real QR code when setup mode changes
  useEffect(() => {
    if (setupMode === 'authenticator') {
      const email = user?.email || 'nageshsharat@gmail.com';
      const otpauthUrl = `otpauth://totp/ChurnShield:${email}?secret=${manualAuthenticatorKey}&issuer=ChurnShieldAI`;
      QRCode.toDataURL(otpauthUrl, { width: 180, margin: 1 })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('QR code generation failed:', err));
    }
  }, [setupMode, user?.email, manualAuthenticatorKey]);

  const handleStartSetup = (method: 'sms' | 'authenticator') => {
    setSetupMode(method);
    setVerificationCode('');
    if (method === 'sms') {
      const res = authService.enableSmsTwoFactor(smsPhone);
      showToast(res.message, 'info');
    }
  };

  const handleCompleteSetup = () => {
    if (!verificationCode.trim()) {
      showToast('Please enter the 6-digit code.', 'error');
      return;
    }

    const res = authService.verifyAndActivateTwoFactor(
      setupMode as 'sms' | 'authenticator',
      verificationCode,
      setupMode === 'sms' ? smsPhone : undefined
    );

    if (res.success) {
      setUser(authService.getCurrentUser());
      setTwoFactorEnabled(true);
      setTwoFactorMethod(setupMode as 'sms' | 'authenticator');
      setSetupMode('none');
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleDisable2FA = () => {
    const res = authService.disableTwoFactor();
    if (res.success) {
      setUser(authService.getCurrentUser());
      setTwoFactorEnabled(false);
      showToast(res.message, 'info');
    }
  };

  const handleCopyCodes = () => {
    if (!user?.backupCodes) return;
    navigator.clipboard.writeText(user.backupCodes.join('\n'));
    setCopiedCodes(true);
    showToast('10 Backup codes copied to clipboard.', 'success');
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadCodes = () => {
    if (!user?.backupCodes) return;
    const content =
      `CHURNSHIELD AI - EMERGENCY BACKUP CODES\n` +
      `Account: ${user.email}\n` +
      `Generated: ${new Date().toLocaleDateString()}\n\n` +
      `Keep these 10 single-use codes in a secure password vault.\n` +
      `Each code can be used once if you lose access to your 2FA device.\n\n` +
      user.backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      `\n\nsupport@churnshield.ai`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `churnshield_backup_codes_${user.email.split('@')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Backup codes text file downloaded.', 'success');
  };

  const handleRegenerateCodes = () => {
    const res = authService.regenerateBackupCodes();
    if (res.success) {
      setUser(authService.getCurrentUser());
      showToast('New set of 10 backup codes generated.', 'success');
    }
  };

  const handleRevokeSingleSession = () => {
    if (!sessionToRevoke) return;
    const res = authService.revokeSession(sessionToRevoke.id);
    setSessions(authService.getSessions());
    setSessionToRevoke(null);

    if (sessionToRevoke.isCurrent) {
      showToast(res.message, 'info');
      if (onLoggedOut) onLoggedOut();
      if (onNavigate) onNavigate('login');
    } else {
      showToast(res.message, 'success');
    }
  };

  const handleRevokeAllOtherSessions = () => {
    const res = authService.revokeAllOtherSessions();
    setSessions(authService.getSessions());
    setShowRevokeAllModal(false);
    showToast(res.message, 'success');
  };

  const handleExportData = () => {
    window.location.href = '/api/export?format=json';
  };

  const handleScheduleDelete = () => {
    if (deleteInput !== 'DELETE CHURNSHIELD') return;
    setIsDeleting(true);
    setTimeout(() => {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteScheduled(true);
      showToast('Account deletion scheduled (30-day grace period).', 'info');
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Security & Access Management</h1>
            <span className="text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              SOC 2 Type II Certified
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Manage multi-factor authentication (2FA), active browser sessions, and GDPR compliance policies.
          </p>
        </div>

        {onNavigate && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('security')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
            >
              <span>View Security Terms</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 gap-6 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('2fa')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === '2fa'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Two-Factor Authentication (2FA)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'sessions'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Active Sessions ({sessions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('governance')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'governance'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Data Portability & Governance</span>
        </button>
      </div>

      {deleteScheduled && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-800">
            <strong>Account Deletion Scheduled:</strong> Your account and all stored telemetry will be purged in{' '}
            <strong>30 days</strong>. You can cancel this request anytime from your account portal.
          </div>
        </div>
      )}

      {/* TAB 1: TWO-FACTOR AUTHENTICATION */}
      {activeTab === '2fa' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Two-Factor Authentication (2FA) Status</h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Requires a secondary security code upon signing in from unrecognized browsers.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {twoFactorEnabled ? (
                  <button
                    type="button"
                    onClick={handleDisable2FA}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors"
                  >
                    Disable 2FA
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">Currently Disabled</span>
                )}
              </div>
            </div>

            {/* Methods Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Method 1: SMS 2FA */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  twoFactorEnabled && twoFactorMethod === 'sms'
                    ? 'border-blue-900 bg-blue-50/40'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-blue-900" />
                      SMS Verification
                    </span>
                    <p className="text-[11px] text-gray-600">
                      Receive a 6-digit code via carrier SMS ({user?.phone || smsPhone}).
                    </p>
                  </div>
                  {twoFactorEnabled && twoFactorMethod === 'sms' ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartSetup('sms')}
                      className="text-xs font-bold text-blue-900 hover:underline"
                    >
                      Configure
                    </button>
                  )}
                </div>
              </div>

              {/* Method 2: Authenticator App */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  twoFactorEnabled && twoFactorMethod === 'authenticator'
                    ? 'border-blue-900 bg-blue-50/40'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-blue-900" />
                      Authenticator App (TOTP)
                    </span>
                    <p className="text-[11px] text-gray-600">
                      Google Authenticator, Authy, 1Password, or Microsoft Authenticator.
                    </p>
                  </div>
                  {twoFactorEnabled && twoFactorMethod === 'authenticator' ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartSetup('authenticator')}
                      className="text-xs font-bold text-blue-900 hover:underline"
                    >
                      Configure
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SETUP WIZARD (if user clicked configure) */}
            {setupMode !== 'none' && (
              <div className="p-4 bg-gray-50 border border-blue-200 rounded-xl space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900">
                    Set up {setupMode === 'sms' ? 'SMS Verification' : 'Authenticator App'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setSetupMode('none')}
                    className="text-xs text-gray-500 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>

                {setupMode === 'sms' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Phone Number</label>
                      <input
                        type="tel"
                        value={smsPhone}
                        onChange={(e) => setSmsPhone(e.target.value)}
                        placeholder="+1 (415) 555-0199"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartSetup('sms')}
                      className="px-3 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-bold hover:bg-blue-800"
                    >
                      Send 6-Digit Code
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="text-center p-3 bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center">
                      {qrCodeDataUrl ? (
                        <img src={qrCodeDataUrl} alt="2FA QR Code" className="w-36 h-36" />
                      ) : (
                        <div className="w-36 h-36 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                          Generating QR...
                        </div>
                      )}
                      <span className="text-[10px] text-gray-500 mt-1">Scan with Google Authenticator</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <span className="text-gray-600 block">Or enter manual secret key:</span>
                      <div className="flex items-center gap-2">
                        <code className="p-2 bg-white border border-gray-200 rounded-lg font-mono text-xs font-bold text-blue-950 flex-1">
                          {manualAuthenticatorKey}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(manualAuthenticatorKey);
                            setCopiedKey(true);
                            setTimeout(() => setCopiedKey(false), 2000);
                          }}
                          className="px-2.5 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700"
                        >
                          {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Verification Code Entry */}
                <div className="pt-2 border-t border-gray-200 flex items-center gap-3">
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="w-44 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono tracking-widest text-center"
                  />
                  <button
                    type="button"
                    onClick={handleCompleteSetup}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Verify & Activate 2FA
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BACKUP CODES SECTION */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-blue-900" />
                  Single-Use Emergency Backup Codes
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  10 emergency codes if you temporarily lose access to your phone or authenticator app.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCodes}
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                >
                  {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCodes ? 'Copied' : 'Copy All'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCodes}
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .txt</span>
                </button>

                <button
                  type="button"
                  onClick={handleRegenerateCodes}
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
              {(user?.backupCodes || []).map((code, index) => (
                <div
                  key={index}
                  className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-mono font-bold text-xs text-gray-800"
                >
                  {code}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-500">
              Note: Each code is strictly single-use. Once entered on the login screen, it will be automatically invalidated.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-blue-900" />
                  Active Devices & Login Sessions
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Devices currently signed into this ChurnShield AI instance. Auto-refreshes every 60 seconds.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span>Auto-refresh: {refreshCountdown}s</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSessions(authService.getSessions());
                    setRefreshCountdown(60);
                    showToast('Session list refreshed.', 'info');
                  }}
                  className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                  title="Refresh Sessions"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowRevokeAllModal(true)}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Revoke All Other Sessions</span>
                </button>
              </div>
            </div>

            {/* Sessions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border border-gray-200 rounded-xl text-xs overflow-hidden">
                <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-3">Device & Browser</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Last Active</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {sessions.map((sess) => (
                    <tr key={sess.id} className={sess.isCurrent ? 'bg-blue-50/30' : ''}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Laptop className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold text-gray-900">{sess.device}</span>
                          {sess.isCurrent && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                              Current Session
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600">{sess.location}</td>
                      <td className="p-3 font-mono text-[11px] text-gray-500">{sess.ip}</td>
                      <td className="p-3 text-gray-600">{sess.lastActive}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSessionToRevoke(sess)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                            sess.isCurrent
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-gray-600 hover:text-red-700 hover:bg-red-50'
                          }`}
                        >
                          {sess.isCurrent ? 'Log Out' : 'Revoke'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Sessions automatically expire after 30 days of inactivity. If you suspect unauthorized access, click{' '}
                <strong>Revoke All Other Sessions</strong> and change your master password.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATA PORTABILITY & GOVERNANCE */}
      {activeTab === 'governance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-900" />
              GDPR Article 20: Data Portability & Complete Export
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs">
              <div>
                <span className="font-bold text-gray-900">Export Complete Customer & Model Dataset</span>
                <p className="text-gray-600 mt-0.5">
                  Download all 50 customer profiles, historical risk scores, and generated playbooks in structured JSON.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportData}
                className="px-3.5 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-800 rounded-lg font-bold flex items-center gap-1.5 transition-colors self-start shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-gray-600" />
                Download JSON Dump
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-red-50/50 rounded-xl border border-red-200 text-xs">
              <div>
                <span className="font-bold text-red-900">Delete Account & Purge Customer Telemetry</span>
                <p className="text-red-700 mt-0.5">
                  Permanently delete all synced API connections, predictive churn models, and account credentials.
                </p>
                <span className="text-[10px] text-red-600 font-semibold block mt-1">
                  Includes guaranteed 30-day grace period before physical disk erasure.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors self-start shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Request Account Deletion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM REVOKE SINGLE SESSION MODAL */}
      {sessionToRevoke && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-gray-900">
                {sessionToRevoke.isCurrent ? 'Log Out of Current Session?' : 'Revoke Active Session?'}
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to terminate the active session on <strong>{sessionToRevoke.device}</strong> ({sessionToRevoke.ip})?
              {sessionToRevoke.isCurrent && ' This will immediately sign you out and return you to the login screen.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSessionToRevoke(null)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeSingleSession}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                {sessionToRevoke.isCurrent ? 'Confirm Log Out' : 'Revoke Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM REVOKE ALL OTHER SESSIONS MODAL */}
      {showRevokeAllModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-gray-900">Revoke All Other Sessions?</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              This will immediately invalidate all active login sessions on all other phones, laptops, and tablets. Your current session will remain active.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRevokeAllModal(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeAllOtherSessions}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Revoke All Others
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-gray-900">Confirm Deletion Request</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              This action initiates the permanent purge of your ChurnShield instance and all connected Razorpay/Mixpanel telemetry with a 30-day grace period.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 block">
                Type <strong>DELETE CHURNSHIELD</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="DELETE CHURNSHIELD"
                className="w-full p-2 border border-red-300 rounded-lg text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteInput('');
                }}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteInput !== 'DELETE CHURNSHIELD' || isDeleting}
                onClick={handleScheduleDelete}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
              >
                {isDeleting ? 'Scheduling...' : 'Schedule 30-Day Purge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
