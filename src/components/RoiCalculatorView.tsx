import React, { useState, useRef, useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Download,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Calendar,
  Sparkles,
  Sliders,
  Settings2,
  X,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  getROIInsights,
  getHighRiskMRR,
  getMediumRiskMRR,
  getTotalMRR,
  getTotalCustomers,
  ROIConfig
} from '../utils/customerSelectors';
import { generateRoiPdfReport } from '../utils/generatePdfReport';

interface RoiCalculatorViewProps {
  customers: Customer[];
  onShowToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
  onNavigate?: (view: string) => void;
}

export const RoiCalculatorView: React.FC<RoiCalculatorViewProps> = ({
  customers,
  onShowToast,
  onNavigate
}) => {
  // Live rescued customers from canonical customer store
  const actualSaved = useMemo(() => {
    return customers.filter(c => c.status === 'saved' || c.outcomeStatus === 'recovered');
  }, [customers]);

  const actualSavedMrr = useMemo(() => {
    return actualSaved.reduce((sum, c) => sum + (c.mrrProtected ?? c.mrr ?? 0), 0);
  }, [actualSaved]);

  // Interactive ROI parameters
  const [highRiskSaveRate, setHighRiskSaveRate] = useState<number>(0.20); // 20%
  const [mediumRiskSaveRate, setMediumRiskSaveRate] = useState<number>(0.10); // 10%
  const [monthlyCost, setMonthlyCost] = useState<number>(299); // $299 / mo USD
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');

  // Compute live ROI insights strictly driven by canonical customer dataset
  const roiConfig: ROIConfig = useMemo(() => ({
    highRiskSaveRate,
    mediumRiskSaveRate,
    monthlyCost,
    period
  }), [highRiskSaveRate, mediumRiskSaveRate, monthlyCost, period]);

  const insights = useMemo(() => {
    return getROIInsights(customers, roiConfig);
  }, [customers, roiConfig]);

  // PDF Generation State
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [reportPeriodTitle, setReportPeriodTitle] = useState<string>('Q1 Executive Revenue Retention Audit');
  const [reportPreparedFor, setReportPreparedFor] = useState<string>('Founders & Board of Directors');
  const [reportDataSource, setReportDataSource] = useState<'actual' | 'simulated'>('actual');

  const triggerToast = (msg: string) => {
    if (onShowToast) onShowToast(msg, 'success');
  };

  const handleDownloadReport = async (dataSource: 'actual' | 'simulated' = reportDataSource) => {
    setIsGeneratingPdf(true);
    try {
      const isSim = dataSource === 'simulated';
      const count = isSim ? Math.max(1, Math.round(customers.length * 0.15)) : actualSaved.length;
      const mrr = isSim ? insights.estimatedRecoveredMrr : actualSavedMrr;
      const annual = mrr * 12;
      const net = isSim ? insights.netMonthlyValue : (mrr - monthlyCost);
      const multiplier = isSim ? insights.multiplier : (monthlyCost > 0 ? Math.round((mrr / monthlyCost) * 10) / 10 : 0);

      const reportElement = reportRef.current;
      if (!reportElement) {
        generateRoiPdfReport({
          periodTitle: reportPeriodTitle,
          preparedFor: reportPreparedFor,
          savedCount: count,
          monthlyMrrSaved: mrr,
          planCost: monthlyCost,
          roiMultiplier: multiplier,
          annualSaved: annual,
          netMonthlyGain: net,
          customers,
          includeSimulation: isSim
        });
        triggerToast(`PDF Report generated for ${formatCurrency(mrr)} saved MRR.`);
        setShowConfigModal(false);
        return;
      }

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`nochurn_retention_roi_${Date.now()}.pdf`);

      triggerToast(`PDF Report downloaded: ${formatCurrency(mrr)} MRR (${multiplier}x ROI)`);
      setShowConfigModal(false);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      if (onShowToast) onShowToast('Failed to generate PDF report', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-900" />
            Retention ROI Calculator & Board Reports
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Quantify the exact return on investment from proactive churn prevention across your canonical customer base.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate Executive PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Live Derived ROI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estimated Recovered MRR */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-bold uppercase text-emerald-800">Projected Recovered MRR</span>
          <div className="text-2xl font-black text-emerald-700 font-mono tabular-nums mt-2">
            {formatCurrency(insights.estimatedRecoveredMrr)}
            <span className="text-xs font-normal text-gray-500"> /mo</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Based on {Math.round(highRiskSaveRate * 100)}% high-risk & {Math.round(mediumRiskSaveRate * 100)}% med-risk save rate
          </p>
        </div>

        {/* Net Monthly Value */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs">
          <span className="text-xs font-bold uppercase text-blue-900">Net Monthly Gain</span>
          <div className="text-2xl font-black text-blue-900 font-mono tabular-nums mt-2">
            {formatCurrency(insights.netMonthlyValue)}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            After deducting {formatCurrency(monthlyCost)} monthly platform cost
          </p>
        </div>

        {/* ROI Multiplier */}
        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs">
          <span className="text-xs font-bold uppercase text-purple-900">ROI Multiple</span>
          <div className="text-2xl font-black text-purple-900 font-mono tabular-nums mt-2">
            {insights.multiplier}x
            <span className="text-xs font-semibold text-purple-700 ml-1.5">
              ({insights.roiPercentage}%)
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Return per $1 spent on retention tooling
          </p>
        </div>

        {/* Annualized Saved Value */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-bold uppercase text-gray-700">Annual Run-Rate Saved</span>
          <div className="text-2xl font-black text-gray-900 font-mono tabular-nums mt-2">
            {formatCurrency(insights.annualSaved)}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {formatCurrency(insights.annualNetGain)} net annual value generated
          </p>
        </div>
      </div>

      {/* Interactive Controls & Live Formula Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Interactive Controls Panel */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-5 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-900" />
              Retention Model Controls
            </h3>
            <span className="text-[11px] font-semibold text-gray-500">Live Recalibration</span>
          </div>

          {/* High-Risk Save Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-800">High-Risk Save Rate:</span>
              <span className="font-mono tabular-nums font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                {Math.round(highRiskSaveRate * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.01"
              value={highRiskSaveRate}
              onChange={(e) => setHighRiskSaveRate(parseFloat(e.target.value))}
              className="w-full accent-blue-900 cursor-pointer"
            />
            <p className="text-[11px] text-gray-500">
              Accounts scored &ge; 80 (High Risk pool: {formatCurrency(insights.highRiskMrr)})
            </p>
          </div>

          {/* Medium-Risk Save Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-800">Medium-Risk Save Rate:</span>
              <span className="font-mono tabular-nums font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                {Math.round(mediumRiskSaveRate * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.30"
              step="0.01"
              value={mediumRiskSaveRate}
              onChange={(e) => setMediumRiskSaveRate(parseFloat(e.target.value))}
              className="w-full accent-blue-900 cursor-pointer"
            />
            <p className="text-[11px] text-gray-500">
              Accounts scored 50-79 (Medium Risk pool: {formatCurrency(insights.mediumRiskMrr)})
            </p>
          </div>

          {/* Monthly Platform Cost */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-800">Monthly Tooling Cost:</span>
              <span className="font-mono tabular-nums font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                {formatCurrency(monthlyCost)}
              </span>
            </div>
            <input
              type="number"
              min="0"
              step="50"
              value={monthlyCost}
              onChange={(e) => setMonthlyCost(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-mono font-semibold"
            />
          </div>

          {/* Period Toggle */}
          <div className="space-y-1.5 pt-2">
            <span className="text-xs font-semibold text-gray-800 block">Calculation Horizon:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPeriod('monthly')}
                className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  period === 'monthly'
                    ? 'bg-blue-900 text-white border-blue-900 shadow-2xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setPeriod('annual')}
                className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  period === 'annual'
                    ? 'bg-blue-900 text-white border-blue-900 shadow-2xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Annual (12 Mo)
              </button>
            </div>
          </div>
        </div>

        {/* Live Mathematical Formula & Actual Rescued Accounts */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-5 lg:col-span-2">
          <div>
            <h3 className="font-bold text-sm text-gray-900">Authoritative ROI Mathematical Formula</h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Live calculation driven directly from your current active customer records:
            </p>
          </div>

          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs space-y-2 font-mono">
            <div className="text-emerald-400 font-bold">
              Estimated Recovered MRR = (HighRisk_MRR × {Math.round(highRiskSaveRate * 100)}%) + (MedRisk_MRR × {Math.round(mediumRiskSaveRate * 100)}%)
            </div>
            <div className="text-slate-300">
              = ({formatCurrency(insights.highRiskMrr)} × {highRiskSaveRate}) + ({formatCurrency(insights.mediumRiskMrr)} × {mediumRiskSaveRate})
            </div>
            <div className="text-white font-bold pt-1 border-t border-slate-700">
              = {formatCurrency(insights.estimatedRecoveredMrr)} /month
            </div>
            <div className="text-blue-300 pt-1">
              Net Gain = {formatCurrency(insights.estimatedRecoveredMrr)} − {formatCurrency(monthlyCost)} cost = <strong className="text-white">{formatCurrency(insights.netMonthlyValue)}</strong>
            </div>
          </div>

          {/* Actual Rescued Accounts Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700">
                Logged Rescued Accounts ({actualSaved.length})
              </h4>
              <span className="text-xs text-emerald-700 font-semibold font-mono tabular-nums">
                Total Real MRR Preserved: {formatCurrency(actualSavedMrr)}
              </span>
            </div>

            {actualSaved.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
                <CheckCircle2 className="w-6 h-6 text-gray-400 mx-auto" />
                <p className="text-xs font-semibold text-gray-800">No accounts marked as rescued yet.</p>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  When you execute interventions from the Action Queue or Customer Table and save accounts, they will be logged here and counted toward realized ROI.
                </p>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('action-queue')}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition-colors"
                  >
                    <span>Open Action Queue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">Account</th>
                      <th className="py-2 px-3">Plan</th>
                      <th className="py-2 px-3 font-right">Preserved MRR</th>
                      <th className="py-2 px-3">Intervention Notes</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {actualSaved.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{c.company_name || c.name}</td>
                        <td className="py-2.5 px-3 text-gray-600">{c.plan}</td>
                        <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-emerald-700">
                          {formatCurrency(c.mrrProtected ?? c.mrr)}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 truncate max-w-xs">{c.savedNotes || 'Personalized retention intervention'}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Saved
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF Export Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-900" />
                Configure Executive Board PDF Report
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-gray-800">Report Title:</label>
                <input
                  type="text"
                  value={reportPeriodTitle}
                  onChange={(e) => setReportPeriodTitle(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-800">Prepared For:</label>
                <input
                  type="text"
                  value={reportPreparedFor}
                  onChange={(e) => setReportPreparedFor(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-800">Report Scope & Mode:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReportDataSource('actual')}
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      reportDataSource === 'actual'
                        ? 'border-blue-900 bg-blue-50 text-blue-950 font-bold'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div>Realized Savings Only</div>
                    <div className="text-[11px] font-normal text-gray-500">
                      {actualSaved.length} logged accounts ({formatCurrency(actualSavedMrr)})
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportDataSource('simulated')}
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      reportDataSource === 'simulated'
                        ? 'border-blue-900 bg-blue-50 text-blue-950 font-bold'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div>Projected Model (Pipeline)</div>
                    <div className="text-[11px] font-normal text-gray-500">
                      Based on current at-risk cohort ({formatCurrency(insights.estimatedRecoveredMrr)}/mo)
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDownloadReport(reportDataSource)}
                disabled={isGeneratingPdf}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGeneratingPdf ? 'Rendering PDF...' : 'Download PDF Document'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
