import React from 'react';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  MessageSquare,
  FileText,
  CreditCard,
  Settings,
  TrendingUp,
  Gift,
  Clock,
  AlertCircle
} from 'lucide-react';
import { authService } from '../services/authService';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  totalCustomers: number;
  atRiskCount: number;
  messagesReadyCount?: number;
  onOpenPricing: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  totalCustomers,
  atRiskCount,
  messagesReadyCount,
  onOpenPricing
}) => {
  const user = authService.getCurrentUser();
  const isTrialExpired = user?.billingStatus === 'trial_expired' || Boolean(user?.trialEndDate && new Date(user.trialEndDate).getTime() <= Date.now() && user.billingStatus !== 'active');
  const isActive = user?.billingStatus === 'active';
  const isTrialing = !isActive && !isTrialExpired;

  let daysRemaining = 14;
  if (user?.trialEndDate) {
    const diff = new Date(user.trialEndDate).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
  const menuItems = [
    {
      id: 'home',
      label: 'Home',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      badge: totalCustomers ? `${totalCustomers}` : null
    },
    {
      id: 'ai-employee',
      label: 'AI Employee',
      icon: Sparkles,
      badge: 'Main',
      badgeColor: 'bg-emerald-100 text-emerald-800 font-bold'
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      badge: (messagesReadyCount && messagesReadyCount > 0) ? `${messagesReadyCount} Ready` : null,
      badgeColor: 'bg-blue-100 text-blue-900 font-bold'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      badge: 'Daily',
      badgeColor: 'bg-gray-100 text-gray-700'
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: CreditCard,
      badge: 'Razorpay',
      badgeColor: 'bg-blue-100 text-blue-900'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <div className="p-3">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-700">
          AI Employee MVP
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id || (item.id === 'home' && (activeView === 'dashboard' || activeView === 'action-queue'));
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-900 text-white shadow-xs font-semibold'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      isActive
                        ? 'bg-blue-800 text-blue-100'
                        : item.badgeColor || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Subscription & Trial Status Widget */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/70">
        <div className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
              isTrialExpired
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : isActive
                ? 'bg-blue-50 text-blue-900 border-blue-100'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {isTrialExpired ? 'Trial Expired' : isActive ? 'Active Plan' : '14-Day Free Trial'}
            </span>
            <span className="text-xs font-bold text-gray-900">
              {isTrialExpired ? 'Expired' : isActive ? `$${user?.planPrice || 149}/mo` : `${daysRemaining} days left`}
            </span>
          </div>

          <div className="mt-2 text-[11px] text-gray-700 flex items-center gap-1.5">
            {isTrialExpired ? (
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            )}
            <span>
              <strong>AI Employee</strong> {isTrialExpired ? 'paused' : 'online & active'}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => onNavigate('billing')}
              className={`flex-1 text-center py-1.5 px-2 rounded-lg text-white text-[11px] font-semibold transition-colors cursor-pointer ${
                isTrialExpired
                  ? 'bg-amber-700 hover:bg-amber-800'
                  : 'bg-blue-900 hover:bg-blue-800'
              }`}
            >
              {isTrialExpired ? 'Choose Plan' : 'Plans & Billing'}
            </button>
          </div>
        </div>

        <div className="mt-2.5 px-1 flex items-center justify-between text-[10px] text-gray-700">
          <span>Morning Scan: 9:00 AM</span>
          <span className={isTrialExpired ? 'text-amber-700 font-medium' : 'text-emerald-700 font-medium'}>
            {isTrialExpired ? 'Paused' : 'Ready'}
          </span>
        </div>
      </div>
    </aside>
  );
};
