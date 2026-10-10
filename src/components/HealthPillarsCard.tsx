import React from 'react';
import { Customer } from '../types';
import { calculateHealthPillars } from '../utils/retentionEngine';
import { Activity, CreditCard, Headphones, HeartHandshake, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

interface HealthPillarsCardProps {
  customer: Customer;
  showDetails?: boolean;
}

export const HealthPillarsCard: React.FC<HealthPillarsCardProps> = ({ customer, showDetails = true }) => {
  const pillars = calculateHealthPillars(customer);

  const pillarItems = [
    {
      id: 'product',
      label: 'Product Adoption',
      weight: '35%',
      score: pillars.productScore,
      icon: Activity,
      color: pillars.productScore > 70 ? 'bg-red-500' : pillars.productScore > 40 ? 'bg-amber-500' : 'bg-emerald-500',
      textColor: pillars.productScore > 70 ? 'text-red-700' : pillars.productScore > 40 ? 'text-amber-700' : 'text-emerald-700',
      meta: `${pillars.activeSeats || 0}/${pillars.totalSeats || 10} seats active (${pillars.seatUtilizationRate || 0}%)`
    },
    {
      id: 'billing',
      label: 'Billing Health',
      weight: '25%',
      score: pillars.billingScore,
      icon: CreditCard,
      color: pillars.billingScore > 70 ? 'bg-red-500' : pillars.billingScore > 40 ? 'bg-amber-500' : 'bg-emerald-500',
      textColor: pillars.billingScore > 70 ? 'text-red-700' : pillars.billingScore > 40 ? 'text-amber-700' : 'text-emerald-700',
      meta: customer.paymentStatus === 'Failed' ? 'Payment Failed' : customer.paymentStatus === 'Retried' ? 'Payment Retried 2x' : `Current (Renews in ${pillars.renewalDaysLeft || 45}d)`
    },
    {
      id: 'support',
      label: 'Support Health',
      weight: '15%',
      score: pillars.supportScore,
      icon: Headphones,
      color: pillars.supportScore > 70 ? 'bg-red-500' : pillars.supportScore > 40 ? 'bg-amber-500' : 'bg-emerald-500',
      textColor: pillars.supportScore > 70 ? 'text-red-700' : pillars.supportScore > 40 ? 'text-amber-700' : 'text-emerald-700',
      meta: `${customer.openTicketsCount || 0} open tickets`
    },
    {
      id: 'relationship',
      label: 'Relationship Health',
      weight: '15%',
      score: pillars.relationshipScore,
      icon: HeartHandshake,
      color: pillars.relationshipScore > 70 ? 'bg-red-500' : pillars.relationshipScore > 40 ? 'bg-amber-500' : 'bg-emerald-500',
      textColor: pillars.relationshipScore > 70 ? 'text-red-700' : pillars.relationshipScore > 40 ? 'text-amber-700' : 'text-emerald-700',
      meta: customer.npsScore ? `NPS: ${customer.npsScore}/10` : `Admin inactive ${customer.lastLoginDays}d`
    },
    {
      id: 'engagement',
      label: 'Engagement Health',
      weight: '10%',
      score: pillars.engagementScore,
      icon: Mail,
      color: pillars.engagementScore > 70 ? 'bg-red-500' : pillars.engagementScore > 40 ? 'bg-amber-500' : 'bg-emerald-500',
      textColor: pillars.engagementScore > 70 ? 'text-red-700' : pillars.engagementScore > 40 ? 'text-amber-700' : 'text-emerald-700',
      meta: `${customer.emailOpenRate || 10}% email open rate`
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
            5-Pillar Churn Health Signals
          </h4>
        </div>
        <span className="text-[11px] font-semibold text-gray-500">
          Composite Score: <strong className="text-gray-900">{customer.riskScore}/100</strong>
        </span>
      </div>

      {/* 5 Pillars Horizontal Meters */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {pillarItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="bg-gray-50 rounded-lg p-2.5 border border-gray-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <div className="flex items-center gap-1 text-gray-700 font-semibold truncate">
                  <Icon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                <span className="text-[10px] text-gray-600 shrink-0">({item.weight})</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden my-1">
                <div
                  className={`h-full ${item.color} rounded-full transition-all duration-300`}
                  style={{ width: `${Math.min(100, Math.max(8, item.score))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-600 mt-1">
                <span className="truncate">{item.meta}</span>
                <span className={`font-bold ${item.textColor}`}>{item.score} pts</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Root Cause Diagnosis Box */}
      {showDetails && (
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-blue-950">Primary Risk Diagnosis: </span>
            <span className="text-blue-900">{pillars.rootCauseDiagnosis}</span>
          </div>
        </div>
      )}
    </div>
  );
};
