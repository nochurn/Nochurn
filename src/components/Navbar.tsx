import React, { useState, useRef, useEffect } from 'react';
import {
  Shield,
  Search,
  Bell,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  User,
  Key,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Laptop,
  LogOut,
  LogIn,
  UserPlus,
  FileText,
  Clock
} from 'lucide-react';
import { DailyAlert, UserProfile } from '../types';

interface NavbarProps {
  onSearchChange: (search: string) => void;
  searchValue: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
  alerts: DailyAlert[];
  onOpenCustomer: (id: string) => void;
  onOpenPricing: () => void;
  onOpenSecurity: () => void;
  geminiReady: boolean;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenOnboarding?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearchChange,
  searchValue,
  onNavigate,
  alerts,
  onOpenCustomer,
  onOpenPricing,
  onOpenSecurity,
  geminiReady,
  currentUser,
  onLogout,
  onOpenOnboarding
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalUnread = alerts.length > 0 ? alerts[0].customersCount : 0;

  const isTrialExpired = currentUser?.billingStatus === 'trial_expired' || Boolean(currentUser?.trialEndDate && new Date(currentUser.trialEndDate).getTime() <= Date.now() && currentUser.billingStatus !== 'active');
  const isTrialing = currentUser?.billingStatus === 'trialing' || (!currentUser?.billingStatus && currentUser !== null);
  let trialDaysRemaining = 14;
  if (currentUser?.trialEndDate) {
    const diff = new Date(currentUser.trialEndDate).getTime() - Date.now();
    trialDaysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 group text-left cursor-pointer focus:outline-none"
          title="NoChurn - AI Retention Employee"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-900 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-800 transition-colors">
            <Sparkles className="w-5 h-5 text-blue-100" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-gray-900 leading-none">
                NoChurn<span className="text-blue-900 font-black">.ai</span>
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                AI Employee
              </span>
            </div>
            <p className="text-[11px] text-gray-600 hidden sm:block font-normal">
              Your AI Retention Employee
            </p>
          </div>
        </button>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-md mx-4 lg:mx-8 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customers by company, email, domain..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-all"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Right Actions & Status */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Action Queue CTA */}
        <button
          onClick={() => onNavigate('action-queue')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span>Action Queue</span>
        </button>

        {/* 14-Day Free Trial Remaining / Trial Expired Badge */}
        {currentUser && isTrialing && !isTrialExpired && (
          <button
            onClick={() => onNavigate('billing')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
            title="14-day free trial active"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-700" />
            <span>14-day free trial • {trialDaysRemaining} days remaining</span>
          </button>
        )}
        {currentUser && isTrialExpired && (
          <button
            onClick={() => onNavigate('pricing', { expired: 'true' })}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-xs text-amber-900 font-bold hover:bg-amber-100 transition-colors cursor-pointer animate-pulse"
            title="Your 14-day free trial has ended. Click to choose a plan."
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            <span>Trial ended • Choose plan</span>
          </button>
        )}

        {/* 10m Fast Value Onboarding CTA */}
        {onOpenOnboarding && (
          <button
            onClick={onOpenOnboarding}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>Fast-Value Setup</span>
          </button>
        )}

        {/* Gemini Engine Indicator */}
        <div
          className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50/80 border border-blue-200/70 text-xs text-blue-900"
          title={geminiReady ? 'Gemini 3.8 Flash API connected' : 'Algorithmic + Gemini Engine'}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-700 animate-pulse" />
          <span className="font-medium text-blue-900">Gemini 3.8 Flash</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg relative transition-colors focus:outline-none"
            title="Daily alerts and updates"
          >
            <Bell className="w-5 h-5" />
            {totalUnread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                {totalUnread}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Daily Churn Digests</h4>
                  <p className="text-xs text-gray-700">Scheduled 9:00 AM local digest</p>
                </div>
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    onNavigate('alerts');
                  }}
                  className="text-xs text-blue-900 hover:underline font-medium"
                >
                  View All
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {alerts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-700">No recent alerts</div>
                ) : (
                  alerts.slice(0, 3).map((al) => (
                    <div key={al.id} className="p-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 leading-tight">
                            {al.title}
                          </p>
                          <p className="text-[11px] text-gray-700 mt-1">
                            ${al.mrrAtRisk.toLocaleString()} MRR flagged across {al.customersCount} accounts.
                          </p>
                          <div className="mt-2 space-y-1">
                            {al.customers.slice(0, 2).map((cust) => (
                              <button
                                key={cust.id}
                                onClick={() => {
                                  setShowNotifications(false);
                                  onOpenCustomer(cust.id);
                                }}
                                className="w-full text-left flex items-center justify-between px-2 py-1 rounded bg-gray-50 hover:bg-blue-50/60 text-[11px] text-gray-700 hover:text-blue-900 border border-gray-200/60"
                              >
                                <span className="font-medium truncate">{cust.name}</span>
                                <span className="font-semibold text-red-600 text-[10px]">Score {cust.score}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    onNavigate('alerts');
                  }}
                  className="text-xs font-medium text-blue-900 hover:text-blue-950 flex items-center justify-center gap-1 w-full py-1"
                >
                  Configure Slack & Digest Webhooks <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown or Guest Auth Buttons */}
        {currentUser ? (
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-blue-900 text-white font-medium text-xs flex items-center justify-center ring-1 ring-gray-200">
                {currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase() || 'CS'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-gray-900 leading-none">{currentUser.name}</div>
                <div className="text-[10px] text-blue-800 font-medium">{currentUser.plan} Tier</div>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="font-semibold text-sm text-gray-900">{currentUser.name}</div>
                  <div className="text-xs text-gray-600 truncate">{currentUser.email}</div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {currentUser.twoFactorEnabled ? (
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> 2FA Active ({currentUser.twoFactorMethod === 'authenticator' ? 'App' : 'SMS'})
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> 2FA Inactive
                      </span>
                    )}
                  </div>
                </div>

                <div className="py-1 text-xs">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('settings/billing');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between text-gray-700 hover:text-gray-900"
                  >
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-gray-500" />
                      Billing & Subscription
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      {currentUser.billingStatus === 'trialing' || currentUser.selectedPlan === 'starter'
                        ? 'Trial'
                        : 'Active'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenPricing();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between text-gray-700 hover:text-gray-900"
                  >
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-gray-500" />
                      Plans & Pricing
                    </span>
                    <span className="text-[10px] font-semibold text-blue-900 uppercase">Upgrade</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('settings/security');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 hover:text-gray-900"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
                    Two-Factor Authentication (2FA)
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('settings/sessions');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 hover:text-gray-900"
                  >
                    <Laptop className="w-3.5 h-3.5 text-gray-500" />
                    Active Sessions Management
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('security');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 hover:text-gray-900"
                  >
                    <Shield className="w-3.5 h-3.5 text-gray-500" />
                    Security & Trust Center
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('privacy');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 hover:text-gray-900"
                  >
                    <FileText className="w-3.5 h-3.5 text-gray-500" />
                    Privacy Policy
                  </button>
                </div>

                <div className="border-t border-gray-100 pt-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-600" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log in</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
