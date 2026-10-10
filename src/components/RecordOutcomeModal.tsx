import React, { useState } from 'react';
import { Customer, CustomerRetentionAction, ChurnReasonType } from '../types';
import { X, CheckCircle2, TrendingUp, AlertTriangle, ShieldCheck, DollarSign } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface RecordOutcomeModalProps {
  customer: Customer;
  actionItem?: CustomerRetentionAction;
  mode: 'recovered' | 'churned';
  onClose: () => void;
  onSaveOutcome: (data: {
    customerId: string;
    status: 'recovered' | 'churned';
    mrrProtected?: number;
    churnReason?: ChurnReasonType;
    churnNotes?: string;
    interventionUsed?: string;
    competitorName?: string;
  }) => void;
}

export const RecordOutcomeModal: React.FC<RecordOutcomeModalProps> = ({
  customer,
  actionItem,
  mode,
  onClose,
  onSaveOutcome
}) => {
  // Form states
  const [mrrProtected, setMrrProtected] = useState<number>(customer.mrr || 850);
  const [interventionUsed, setInterventionUsed] = useState<string>(
    'Founder Personal Call'
  );
  const [churnReason, setChurnReason] = useState<ChurnReasonType>('missing_feature');
  const [competitorName, setCompetitorName] = useState<string>('');
  const [outreachAttempted, setOutreachAttempted] = useState<string>('Yes, within 24h');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    onSaveOutcome({
      customerId: customer.id,
      status: mode,
      mrrProtected: mode === 'recovered' ? mrrProtected : 0,
      churnReason: mode === 'churned' ? churnReason : undefined,
      churnNotes: notes,
      interventionUsed,
      competitorName: churnReason === 'competitor' ? competitorName : undefined
    });

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div
          className={`p-5 flex items-center justify-between border-b ${
            mode === 'recovered'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-950'
              : 'bg-red-50 border-red-100 text-red-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                mode === 'recovered'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              {mode === 'recovered' ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base">
                {mode === 'recovered'
                  ? `Celebrate Retention: ${customer.name}`
                  : `Log Churn Outcome: ${customer.name}`}
              </h3>
              <p className="text-xs opacity-80">
                {mode === 'recovered'
                  ? 'Record saved MRR to measure real platform ROI'
                  : 'Record cancellation attribution to train future prevention models'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {mode === 'recovered' ? (
            <>
              {/* MRR Protected */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Monthly Recurring Revenue Protected ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 font-bold text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={mrrProtected}
                    onChange={(e) => setMrrProtected(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-xl text-sm font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
                <p className="text-[11px] text-gray-600 mt-1">
                  Annualized ARR protected: <strong className="text-emerald-700">{formatCurrency(mrrProtected * 12)} / year</strong>.
                </p>
              </div>

              {/* Primary Intervention Used */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Primary Intervention Used
                </label>
                <select
                  value={interventionUsed}
                  onChange={(e) => setInterventionUsed(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="Founder Personal Call">Founder Personal Executive Call</option>
                  <option value="Technical / Bug Escalation">Technical / Bug Hotfix Escalation</option>
                  <option value="Concession / Price Discount">Price Concession / Discount Offer</option>
                  <option value="Additional Training / Seat Re-allocation">Team Training & Re-onboarding</option>
                  <option value="Billing / Invoice Flex">Flexible Billing & Invoice Resolution</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Customer Feedback & Resolution Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Spoke with CTO Rohan; deployed webhook hotfix and credited current month. They renewed for the annual term."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </>
          ) : (
            <>
              {/* Primary Reason for Cancellation */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Primary Reason for Cancellation
                </label>
                <select
                  value={churnReason}
                  onChange={(e) => setChurnReason(e.target.value as ChurnReasonType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="missing_feature">Missing Feature / Product Gap</option>
                  <option value="poor_onboarding">Poor Onboarding / Lack of Value Adoption</option>
                  <option value="support_issue">Unresolved Support / Technical Instability</option>
                  <option value="pricing">Pricing / Budgetary Cuts</option>
                  <option value="competitor">Switched to Competitor</option>
                  <option value="company_closed">Client Business Closed / Downsized</option>
                  <option value="payment_failure">Payment Failure / Involuntary Dunning</option>
                  <option value="unknown">Unknown / Ghosted Outreach</option>
                </select>
              </div>

              {/* Competitor Name (if competitor selected) */}
              {churnReason === 'competitor' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Which Competitor did they choose?
                  </label>
                  <input
                    type="text"
                    value={competitorName}
                    onChange={(e) => setCompetitorName(e.target.value)}
                    placeholder="e.g. Gainsight, ChurnZero, Vitally"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              )}

              {/* Was outreach attempted? */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Was Retention Outreach Attempted?
                </label>
                <select
                  value={outreachAttempted}
                  onChange={(e) => setOutreachAttempted(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-800"
                >
                  <option value="Yes, within 24h">Yes, within 24 hours of alert</option>
                  <option value="Yes, late">Yes, but after significant delay (&gt;7 days)</option>
                  <option value="No outreach">No outreach was conducted</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Post-Mortem Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Summarize customer exit interview or cancellation trigger..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </>
          )}

          {/* AI Learning Disclaimer */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <span>
              <strong>Closed-Loop AI Training:</strong> This outcome record will be anonymized and fed back into your workspace retention models to refine future churn intervention playbooks.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                mode === 'recovered'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {mode === 'recovered' ? (
                <>
                  <DollarSign className="w-3.5 h-3.5" />
                  Confirm Recovery & Update Saved MRR
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Record Churn & Update Analytics
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
