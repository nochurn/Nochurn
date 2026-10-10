import React from 'react';
import { CheckCircle2, Clock, Calendar, TrendingUp, Target, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export const RoadmapMetricsView: React.FC = () => {
  const roadmapWeeks = [
    {
      week: 'Week 1',
      title: 'First-Value Onboarding & Action Queue',
      status: 'Completed',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      items: [
        '4-step onboarding wizard with downloadable CSV template & instant 50-account demo seed',
        'Revenue-prioritized Action Queue formula (Priority = Risk × MRR Weight × Urgency Multiplier)',
        'Indian B2B SaaS accounts (QuickPay, CloudKite Pune, MetricPulse, FinVenture, ZetaFlow)',
        '1-click customized email script inspector with human-in-the-loop review disclaimer'
      ]
    },
    {
      week: 'Week 2',
      title: 'Beta Validation & Health Pillar Calibration',
      status: 'In Progress',
      statusColor: 'bg-blue-100 text-blue-800 border-blue-300',
      items: [
        '5-pillar health scoring model (Product 35%, Billing 25%, Support 15%, Relationship 15%, Engagement 10%)',
        'Transparent root-cause diagnosis ("Why is this customer high risk?") for every account',
        'Customer detail modal integration with 5-pillar breakdown meters and seat utilization flags',
        'Feedback weighting recalibration based on CSM false-alert reports'
      ]
    },
    {
      week: 'Week 3',
      title: 'Closed-Loop Outcome Tracking & Daily Digest',
      status: 'Active',
      statusColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      items: [
        'Outcome tracking modal recording protected MRR for rescued accounts and 8 churn reasons for lost accounts',
        'Rescued vs. Churned Cohort Performance Matrix with 30/60/90-day win-rates',
        'Root-cause churn attribution analytics with concrete preventative product fixes',
        'AI prompt tuning loop syncing proven customer success playbooks back into Gemini prompts'
      ]
    },
    {
      week: 'Week 4',
      title: 'Razorpay & HubSpot Live Sync & ROI Reports',
      status: 'Ready for Rollout',
      statusColor: 'bg-purple-100 text-purple-800 border-purple-300',
      items: [
        'Razorpay webhooks for payment failed, subscription updated, and smart retry tracking',
        'HubSpot deal stage & ticket sync to monitor champion departures and open CS issues',
        'Board-ready executive PDF report generator calculating net retained revenue (NRR)',
        'Logical workspace isolation, customer data purge trigger, and privacy disclosures'
      ]
    }
  ];

  const successMetrics = [
    {
      label: 'Time to First Value',
      current: '7.4 mins',
      target: '≤ 8 mins',
      status: 'On Target',
      statusType: 'success',
      desc: 'Time from signup to reviewing first revenue-prioritized retention action.'
    },
    {
      label: 'First-Session Data Ingestion',
      current: '78.2%',
      target: '≥ 70%',
      status: 'On Target',
      statusType: 'success',
      desc: 'Percentage of new founders who either load demo dataset or upload a CSV in step 2.'
    },
    {
      label: 'Week-1 Action Execution Rate',
      current: '66.4%',
      target: '≥ 60%',
      status: 'On Target',
      statusType: 'success',
      desc: 'Users who execute at least one outreach email or executive call within 7 days.'
    },
    {
      label: 'Weekly Active Usage (WAU / Total)',
      current: '49.1%',
      target: '≥ 45%',
      status: 'On Target',
      statusType: 'success',
      desc: 'Founders and CSMs returning at least once weekly to resolve their Today queue.'
    },
    {
      label: 'Protected MRR / Customer',
      current: '$18,450 / mo',
      target: '≥ $5,000',
      status: 'Exceeded',
      statusType: 'exceeded',
      desc: 'Average recurring revenue actively rescued by customers using ChurnShield playbooks.'
    },
    {
      label: 'Willingness to Pay (Trial Conversion)',
      current: '34.0%',
      target: '≥ 30%',
      status: 'On Target',
      statusType: 'success',
      desc: 'Free trial teams who upgrade to Growth ($299/mo) or Pro ($599/mo) plans.'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-blue-700/60 text-blue-200 border border-blue-400/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-blue-300" />
              Product Strategy & Implementation Roadmap
            </span>
            <span className="text-xs text-blue-300 font-medium">Version 2.0-PROD</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            From "Churn Prediction Dashboard" to "Retention Operating System"
          </h1>
          <p className="text-xs text-blue-200/90 max-w-2xl leading-relaxed">
            A concrete execution blueprint designed for SaaS founders and customer success heads who need to protect MRR, streamline daily interventions, and measure verifiable retention outcomes.
          </p>
        </div>
      </div>

      {/* Success Metrics Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          Primary Operational Success Metrics
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {successMetrics.map((metric, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-600">{metric.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    metric.statusType === 'exceeded'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {metric.status}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-950">{metric.current}</span>
                <span className="text-xs text-gray-500">Target: {metric.target}</span>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                {metric.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 4-Week Roadmap Timeline */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          4-Week Product Execution Roadmap
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roadmapWeeks.map((week, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
                    {week.week}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${week.statusColor}`}
                  >
                    {week.status}
                  </span>
                </div>

                <h4 className="font-bold text-gray-900 text-sm leading-tight">
                  {week.title}
                </h4>

                <ul className="space-y-2 text-[11px] text-gray-600 pt-1">
                  {week.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-400 font-medium">
                Milestone {idx + 1} of 4
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
