import React, { useState, useRef } from 'react';
import {
  Database,
  CreditCard,
  Activity,
  MessageSquare,
  Mail,
  UploadCloud,
  Check,
  RefreshCw,
  Clock,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IntegrationStatus } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ValidationErrorItem {
  row: number;
  field: string;
  reason: string;
  data?: Record<string, string>;
}

interface ImportResultSummary {
  totalRows: number;
  validRowsCount: number;
  failedRowsCount: number;
  importedCount: number;
  skippedCount: number;
  overwrittenCount: number;
  newlyAddedCount: number;
  errors: ValidationErrorItem[];
  dashboardSummary?: {
    totalCustomers: number;
    totalMrr: number;
    avgChurnScore: number;
    atRiskMrr: number;
    atRiskCount: number;
  };
  message?: string;
  documentSummary?: string;
  fileType?: 'csv' | 'pdf';
}

interface DataIntegrationViewProps {
  integrations: IntegrationStatus[];
  onSyncAll: () => Promise<void>;
  onSyncOne: (id: string) => Promise<void>;
  onToggleIntegration: (id: string, current: boolean) => Promise<void>;
  onImportCustomers: (payload: {
    rawCsv?: string;
    rawPdfBase64?: string;
    fileType?: 'csv' | 'pdf';
    customers?: any[];
    fileName?: string;
    deduplicationMode?: 'overwrite' | 'skip';
    validateOnly?: boolean;
    importValidOnly?: boolean;
  }) => Promise<any>;
  isSyncing: boolean;
  onNavigate?: (view: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const REQUIRED_COLUMNS = [
  { key: 'email', label: 'email', desc: 'Valid contact or billing email (Required)' },
  { key: 'mrr', label: 'mrr', desc: 'Monthly recurring revenue >= 0 (Required)' },
  { key: 'signup_date', label: 'signup_date', desc: 'ISO 8601 or YYYY-MM-DD (Required)' }
];

const PREFERRED_COLUMNS = [
  { key: 'customer_id', label: 'customer_id', desc: 'Unique account identifier' },
  { key: 'company_name', label: 'company_name', desc: 'Customer account / company name' },
  { key: 'plan', label: 'plan', desc: 'Starter, Growth, Pro, or Enterprise' },
  { key: 'risk_score', label: 'risk_score', desc: 'Churn risk score (0-100)' },
  { key: 'risk_level', label: 'risk_level', desc: 'Critical, High, Medium, or Low' },
  { key: 'last_login_days_ago', label: 'last_login_days_ago', desc: 'Days elapsed since last session' },
  { key: 'last_activity_date', label: 'last_activity_date', desc: 'Date of last active user telemetry' },
  { key: 'active_users_7d', label: 'active_users_7d', desc: 'Active team seats in past 7 days' },
  { key: 'usage_score_percent', label: 'usage_score_percent', desc: 'Product feature utilization percentage' },
  { key: 'open_support_tickets', label: 'open_support_tickets', desc: 'Unresolved support cases' },
  { key: 'payment_status', label: 'payment_status', desc: 'Current, Retried, Failed, or Disputed' },
  { key: 'renewal_date', label: 'renewal_date', desc: 'Next contract renewal date' },
  { key: 'risk_reason', label: 'risk_reason', desc: 'Primary qualitative driver of risk' },
  { key: 'recommended_action', label: 'recommended_action', desc: 'Recommended retention playbook' },
  { key: 'account_owner', label: 'account_owner', desc: 'CSM or executive account owner' }
];

export const DataIntegrationView: React.FC<DataIntegrationViewProps> = ({
  integrations,
  onSyncAll,
  onSyncOne,
  onToggleIntegration,
  onImportCustomers,
  isSyncing,
  onNavigate,
  onShowToast
}) => {
  const [autoSync, setAutoSync] = useState(true);
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [rawPdfBase64, setRawPdfBase64] = useState<string>('');
  const [fileType, setFileType] = useState<'csv' | 'pdf' | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [missingHeaders, setMissingHeaders] = useState<string[]>([]);
  const [parsedPreview, setParsedPreview] = useState<Record<string, string>[]>([]);
  const [totalParsedRows, setTotalParsedRows] = useState<number>(0);
  const [deduplicationMode, setDeduplicationMode] = useState<'overwrite' | 'skip'>('overwrite');

  // Import State & Modal
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportResultSummary | null>(null);
  const [showErrorList, setShowErrorList] = useState(false);
  const [importSuccessAlert, setImportSuccessAlert] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getIcon = (id: string) => {
    switch (id) {
      case 'razorpay':
        return <CreditCard className="w-5 h-5 text-blue-600" />;
      case 'supabase':
        return <Database className="w-5 h-5 text-emerald-600" />;
      case 'mixpanel':
        return <Activity className="w-5 h-5 text-purple-600" />;
      case 'intercom':
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
      case 'sendgrid':
        return <Mail className="w-5 h-5 text-cyan-600" />;
      default:
        return <Database className="w-5 h-5 text-gray-600" />;
    }
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const csvCols = [
      'email',
      'mrr',
      'signup_date',
      'customer_id',
      'company_name',
      'plan',
      'risk_score',
      'risk_level',
      'last_login_days_ago',
      'last_activity_date',
      'active_users_7d',
      'usage_score_percent',
      'open_support_tickets',
      'payment_status',
      'renewal_date',
      'risk_reason',
      'recommended_action',
      'account_owner'
    ].join(',');

    const sampleRows = [
      'billing@acmeworks.io,2400,2025-01-15,cust_101,Acme Corporation,Enterprise,88,High,22,2026-03-10,12,35,3,Current,2026-05-15,Severe login drop and unresolved ticket,Schedule VIP executive sync,Alex Vance',
      'finance@apexcloud.co,1200,2024-11-20,cust_102,Apex Cloud Ltd,Growth,55,Medium,14,2026-03-20,8,68,1,Current,2026-06-01,Feature adoption slowdown,Offer annual contract concession,Sarah Jenkins',
      'ops@streamline.dev,299,2025-06-01,cust_103,StreamLine App,Starter,22,Low,2,2026-03-26,5,92,0,Current,2026-08-01,Healthy baseline engagement,Proactive tips sequence,Alex Vance'
    ].join('\n');

    const fullContent = `${csvCols}\n${sampleRows}`;
    const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nochurn_customer_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('Downloaded official NoChurn CSV template.', 'success');
  };

  // Download Sample PDF Report
  const handleDownloadSamplePdf = () => {
    try {
      const doc = new jsPDF();
      
      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 28, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('ChurnShield AI — SaaS Customer Telemetry & QBR Audit', 14, 18);

      // Subheading & Meta
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Document Generated: ${new Date().toLocaleDateString()} | Ingestion Format: Multimodal PDF`, 14, 36);

      // Executive Context
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Executive Portfolio Overview & Account Telemetry', 14, 46);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const summaryText = 'This customer telemetry document contains active contracts, recurring revenue metrics, and usage engagement indicators for AI churn risk scoring and proactive retention analysis.';
      doc.text(doc.splitTextToSize(summaryText, 180), 14, 53);

      // Customers Table
      autoTable(doc, {
        startY: 64,
        head: [['Customer ID', 'Account Name', 'Billing Email', 'Plan', 'MRR', 'Signup Date', 'Last Login', 'Health', 'Tickets', 'NPS']],
        body: [
          ['pdf-101', 'Acme Corporation', 'billing@acmeworks.io', 'Growth', '$1,200', '2025-01-15', '2026-03-10', '72', '1', '8'],
          ['pdf-102', 'Apex Cloudworks', 'finance@apexcloud.co', 'Pro', '$2,400', '2024-11-20', '2026-02-14', '35', '4', '4'],
          ['pdf-103', 'Nexus Stream Dev', 'ops@nexusstream.dev', 'Starter', '$299', '2025-06-01', '2026-03-12', '88', '0', '9'],
          ['pdf-104', 'FinEdge Analytics', 'billing@finedge.tech', 'Growth', '$850', '2025-03-10', '2026-02-28', '45', '2', '5'],
          ['pdf-105', 'Vanguard Metrics', 'admin@vanguardmetrics.com', 'Pro', '$3,200', '2024-09-01', '2026-03-14', '92', '0', '10'],
          ['pdf-106', 'Starlight Media Org', 'finance@starlightmedia.io', 'Growth', '$1,450', '2025-05-18', '2026-03-05', '62', '3', '7']
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 130;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('Key Risk & Health Findings:', 14, finalY + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('• Apex Cloudworks (pdf-102): Health score degraded to 35 with 4 unresolved support tickets and last login over 30 days ago.', 14, finalY + 20);
      doc.text('• FinEdge Analytics (pdf-104): NPS dropped to 5 with reduced active seat usage over the past two billing cycles.', 14, finalY + 26);
      doc.text('• Vanguard Metrics (pdf-105): Exceptional product engagement (Health 92, NPS 10) with annual expansion potential.', 14, finalY + 32);

      doc.save('churnshield_sample_customer_report.pdf');
      if (onShowToast) onShowToast('Downloaded sample PDF customer report with telemetry tables.', 'success');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      if (onShowToast) onShowToast('Failed to generate sample PDF report', 'error');
    }
  };

  // Process File selection (Supports CSV and PDF up to 30MB)
  const handleFileProcess = (file: File) => {
    setFileError(null);
    setMissingHeaders([]);
    setImportSuccessAlert(null);

    const nameLower = file.name.toLowerCase();
    const isCsv = nameLower.endsWith('.csv');
    const isPdf = nameLower.endsWith('.pdf');

    // 1. Validate file extension (.csv or .pdf)
    if (!isCsv && !isPdf) {
      setFileError('Invalid file type. Please upload a .csv spreadsheet or .pdf report document.');
      return;
    }

    // 2. Validate max file size (Expanded to 30MB = 30 * 1024 * 1024 bytes)
    const MAX_SIZE = 30 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileError(`File size exceeds 30MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB). Please upload a file up to 30MB.`);
      return;
    }

    setFileName(file.name);
    setFileSizeBytes(file.size);

    if (isPdf) {
      setFileType('pdf');
      setRawCsvText('');
      setMissingHeaders([]);
      setParsedPreview([]);
      setTotalParsedRows(0);

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target?.result as string;
        if (!base64Data) {
          setFileError('The selected PDF file is empty or could not be read.');
          return;
        }
        setRawPdfBase64(base64Data);
      };
      reader.onerror = () => {
        setFileError('Failed to read PDF file. Please try selecting the file again.');
      };
      reader.readAsDataURL(file);
    } else {
      setFileType('csv');
      setRawPdfBase64('');

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text || !text.trim()) {
          setFileError('The selected CSV file is empty.');
          return;
        }
        setRawCsvText(text);
        validateHeaderAndPreview(text);
      };
      reader.onerror = () => {
        setFileError('Failed to read CSV file.');
      };
      reader.readAsText(file);
    }
  };

  // Pre-validate headers & create preview for CSV
  const validateHeaderAndPreview = (csvText: string) => {
    const cleanCsv = csvText.replace(/^[\uFEFF\uFFFE]/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleanCsv.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length < 1) {
      setFileError('CSV file must contain at least one data row.');
      return;
    }

    // Smart delimiter detection (, ; \t |)
    const sampleLine = lines[0];
    const commaCount = (sampleLine.match(/,/g) || []).length;
    const semiCount = (sampleLine.match(/;/g) || []).length;
    const tabCount = (sampleLine.match(/\t/g) || []).length;
    const pipeCount = (sampleLine.match(/\|/g) || []).length;
    let delimiter = ',';
    if (semiCount > commaCount && semiCount > tabCount && semiCount > pipeCount) delimiter = ';';
    else if (tabCount > commaCount && tabCount > semiCount && tabCount > pipeCount) delimiter = '\t';
    else if (pipeCount > commaCount && pipeCount > semiCount && pipeCount > tabCount) delimiter = '|';

    const parseLine = (line: string, delim: string): string[] => {
      const vals: string[] = [];
      let inQuote = false;
      let curVal = '';
      for (let chIdx = 0; chIdx < line.length; chIdx++) {
        const char = line[chIdx];
        if (char === '"' || char === "'") {
          if (inQuote && line[chIdx + 1] === char) {
            curVal += char;
            chIdx++;
          } else {
            inQuote = !inQuote;
          }
        } else if (char === delim && !inQuote) {
          vals.push(curVal.trim().replace(/^["']|["']$/g, ''));
          curVal = '';
        } else {
          curVal += char;
        }
      }
      vals.push(curVal.trim().replace(/^["']|["']$/g, ''));
      return vals;
    };

    // Parse header row
    const rawHeaders = parseLine(lines[0], delimiter).map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    
    // Check aliases
    const foundKeys: Record<string, boolean> = {};
    rawHeaders.forEach((h) => {
      const clean = h.replace(/[^a-z0-9]/g, '');
      if (['customerid', 'id', 'custid', 'accountid', 'clientid', 'uid', 'uuid', 'userid', 'companyid', 'accountnumber', 'accid', 'cid', 'externalid', 'code'].includes(clean)) foundKeys['customer_id'] = true;
      if (['customername', 'name', 'company', 'companyname', 'account', 'accountname', 'organization', 'org', 'orgname', 'client', 'clientname', 'customer', 'business', 'businessname', 'accounttitle', 'entity', 'title'].includes(clean)) foundKeys['customer_name'] = true;
      if (['email', 'workemail', 'contactemail', 'primaryemail', 'useremail', 'billingemail', 'mail', 'emailaddress', 'contact', 'loginemail', 'address'].includes(clean)) foundKeys['email'] = true;
      if (['plan', 'subscription', 'tier', 'pricingtier', 'package', 'planlevel', 'product', 'serviceplan', 'level', 'type', 'subscriptiontier', 'planname'].includes(clean)) foundKeys['plan'] = true;
      if (['mrr', 'monthlyrevenue', 'monthlyrecurringrevenue', 'revenue', 'arr', 'amount', 'monthlyamount', 'billingamount', 'spend', 'price', 'subscriptionfee', 'recurring', 'value', 'total', 'cost', 'rate', 'fee'].includes(clean)) foundKeys['mrr'] = true;
      if (['signupdate', 'startdate', 'customersince', 'createdat', 'creationdate', 'joined', 'joinedat', 'date', 'registrationdate', 'added', 'created', 'start', 'since', 'onboardingdate', 'timestamp'].includes(clean)) foundKeys['signup_date'] = true;
    });

    const missing: string[] = [];
    REQUIRED_COLUMNS.forEach((col) => {
      if (!foundKeys[col.key]) {
        missing.push(col.key);
      }
    });

    setMissingHeaders(missing);
    setTotalParsedRows(Math.max(1, lines.length - 1));

    // Build preview rows
    const previewList: Record<string, string>[] = [];
    const previewCount = Math.min(6, lines.length);
    const startIdx = lines[0].includes('@') ? 0 : 1;
    for (let i = startIdx; i < previewCount; i++) {
      const vals = parseLine(lines[i], delimiter);
      const rowObj: Record<string, string> = {};
      rawHeaders.forEach((h, idx) => {
        rowObj[h] = vals[idx] !== undefined ? vals[idx] : '';
      });
      previewList.push(rowObj);
    }
    setParsedPreview(previewList);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  // Execute Import (CSV or PDF)
  const handleExecuteImport = async (importValidOnly: boolean = true) => {
    if (!rawCsvText && !rawPdfBase64) return;

    setIsProcessing(true);
    try {
      const res = await onImportCustomers({
        rawCsv: fileType === 'csv' ? rawCsvText : undefined,
        rawPdfBase64: fileType === 'pdf' ? rawPdfBase64 : undefined,
        fileType: fileType || 'csv',
        fileName: fileName || (fileType === 'pdf' ? 'customers_import.pdf' : 'customers_import.csv'),
        deduplicationMode,
        importValidOnly
      });

      const summary: ImportResultSummary = {
        totalRows: res.totalRows || totalParsedRows || res.validRowsCount || 0,
        validRowsCount: res.validRowsCount || 0,
        failedRowsCount: res.failedRowsCount || 0,
        importedCount: res.importedCount || res.validRowsCount || 0,
        skippedCount: res.skippedCount || 0,
        overwrittenCount: res.overwrittenCount || 0,
        newlyAddedCount: res.newlyAddedCount || 0,
        errors: res.errors || [],
        dashboardSummary: res.dashboardSummary,
        message: res.message,
        documentSummary: res.documentSummary,
        fileType: res.fileType || fileType || 'csv'
      };

      setImportSummary(summary);
      setSummaryModalOpen(true);

      if (summary.failedRowsCount === 0) {
        setImportSuccessAlert(
          fileType === 'pdf'
            ? `Successfully extracted and scored ${summary.importedCount} customers from "${fileName}" using Gemini 3.8 Flash AI.`
            : `Successfully imported ${summary.importedCount} customers with automated Gemini churn scoring.`
        );
      }

      if (onShowToast) {
        onShowToast(
          summary.failedRowsCount === 0
            ? `Import complete: ${summary.importedCount} accounts active.`
            : `Import processed: ${summary.validRowsCount} valid, ${summary.failedRowsCount} failed rows.`,
          summary.failedRowsCount === 0 ? 'success' : 'info'
        );
      }
    } catch (err: any) {
      setFileError(err.message || 'Import failed. Please check your data format.');
      if (err.missingColumns && Array.isArray(err.missingColumns)) {
        setMissingHeaders(err.missingColumns);
      }
      if (onShowToast) onShowToast(err.message || 'Import failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Error CSV
  const handleDownloadErrorCsv = () => {
    if (!importSummary || !importSummary.errors || importSummary.errors.length === 0) return;

    const headers = ['row_number', 'field_name', 'error_reason', 'raw_data'];
    const rows = importSummary.errors.map((err) => {
      const rawDataStr = err.data ? Object.entries(err.data).map(([k, v]) => `${k}=${v}`).join('; ') : '';
      return [
        err.row,
        `"${err.field}"`,
        `"${err.reason.replace(/"/g, '""')}"`,
        `"${rawDataStr.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_errors_${fileName || 'churnshield'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResetImport = () => {
    setRawCsvText('');
    setRawPdfBase64('');
    setFileType(null);
    setFileName('');
    setFileSizeBytes(0);
    setFileError(null);
    setMissingHeaders([]);
    setParsedPreview([]);
    setTotalParsedRows(0);
    setSummaryModalOpen(false);
    setImportSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Data Integrations & Ingestion</h2>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              Automated 24h Sync
            </span>
          </div>
          <p className="text-xs text-gray-700 mt-1">
            Connect your SaaS billing, product analytics, customer support, or upload bulk customer telemetry for Gemini churn scoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <Clock className="w-3.5 h-3.5 text-blue-900" />
            <span>Auto-sync every 24h:</span>
            <button
              onClick={() => setAutoSync(!autoSync)}
              className="text-blue-900 font-bold focus:outline-none"
            >
              {autoSync ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  Active
                </span>
              ) : (
                <span className="text-gray-400">Paused</span>
              )}
            </button>
          </div>

          <button
            onClick={onSyncAll}
            disabled={isSyncing}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing APIs...' : 'Sync All Integrations'}
          </button>
        </div>
      </div>

      {/* Connected API Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from(new Map<string, IntegrationStatus>(integrations.map((item) => [item.id, item])).values()).map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                    {getIcon(item.id)}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{item.name}</h4>
                    <span className="text-[10px] uppercase font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                      {item.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.isConnected
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item.isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-700 mt-3 leading-relaxed">{item.description}</p>

              <div className="mt-4 p-2.5 bg-gray-50 rounded-lg text-xs space-y-1 border border-gray-100">
                <div className="flex items-center justify-between text-gray-700">
                  <span>API Key Token:</span>
                  <span className="font-mono text-[11px] text-gray-800">{item.apiKeyMasked}</span>
                </div>
                <div className="flex items-center justify-between text-gray-700">
                  <span>Synced Records:</span>
                  <span className="font-semibold text-gray-900">{item.syncedRecordsCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-gray-700">
                  <span>Last Sync:</span>
                  <span className="text-gray-800">
                    {item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => onToggleIntegration(item.id, item.isConnected)}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900"
              >
                {item.isConnected ? 'Disconnect API' : 'Connect API'}
              </button>

              <button
                onClick={() => onSyncOne(item.id)}
                disabled={isSyncing || !item.isConnected}
                className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-3 h-3 text-gray-500" />
                Sync Now
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* File Ingestion Section (CSV & PDF up to 30MB) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-900" />
                SaaS Customer Telemetry & Document Ingestion
              </h3>
              <span className="text-[11px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full border border-blue-200">
                Expanded Limit: Up to 30MB
              </span>
              <span className="text-[11px] font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-600" />
                CSV + PDF
              </span>
            </div>
            <p className="text-xs text-gray-700 mt-1">
              Upload bulk CSV telemetry or PDF account audits and statements up to 30MB. Gemini 3.8 Flash extracts accounts and scores churn risk in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4 text-blue-900" />
              Download Sample CSV
            </button>

            <button
              onClick={handleDownloadSamplePdf}
              className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4 text-purple-700" />
              Download Sample PDF Report
            </button>
          </div>
        </div>

        {/* Global Success Banner */}
        {importSuccessAlert && (
          <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-medium flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{importSuccessAlert}</span>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-colors shadow-xs shrink-0"
              >
                View Live Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Format & Column Specifications */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-gray-900">
              <HelpCircle className="w-4 h-4 text-blue-900" />
              <span>File Ingestion Specifications (Expanded 30MB Limit • CSV & PDF Supported)</span>
            </div>
            <span className="text-[11px] text-gray-600 font-medium">Max single file: 30MB</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="font-semibold text-gray-800 block mb-1.5">CSV Required Columns:</span>
              <ul className="space-y-1 text-gray-700 font-mono text-[11px]">
                {REQUIRED_COLUMNS.map((col) => (
                  <li key={col.key} className="flex items-baseline gap-2">
                    <span className="font-bold text-blue-950 bg-blue-50 px-1.5 py-0.5 rounded">{col.label}</span>
                    <span className="font-sans text-gray-600 text-[11px]">— {col.desc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <span className="font-semibold text-gray-800 block mb-1.5">CSV Preferred Columns:</span>
              <ul className="space-y-1 text-gray-700 font-mono text-[11px] max-h-48 overflow-y-auto pr-1">
                {PREFERRED_COLUMNS.map((col) => (
                  <li key={col.key} className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-800 bg-gray-200/60 px-1.5 py-0.5 rounded">{col.label}</span>
                    <span className="font-sans text-gray-600 text-[11px]">— {col.desc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="font-bold text-purple-950 flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                PDF Document Understanding:
              </span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Upload customer summaries, quarterly reviews, invoices, or billing audits in <strong>.pdf</strong> up to 30MB. Gemini multimodal AI reads tables and text to automatically build tracked customer profiles.
              </p>
            </div>
          </div>
        </div>

        {/* File Error Alert */}
        {fileError && (
          <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <div>{fileError}</div>
              {missingHeaders.length > 0 && (
                <div className="mt-1 font-mono text-[11px] text-red-700">
                  Missing: {missingHeaders.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header Validation Failure Warning (CSV only) */}
        {fileType === 'csv' && missingHeaders.length > 0 && !fileError && (
          <div className="p-3.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Header Validation Warning: Missing Required Columns</span>
            </div>
            <p className="text-amber-800">
              Your CSV file is missing the following required column(s):{' '}
              <strong className="font-mono text-amber-950 bg-amber-100 px-1 py-0.5 rounded">
                {missingHeaders.join(', ')}
              </strong>. Please update your file or download our template before importing.
            </p>
          </div>
        )}

        {/* Drag and Drop Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer relative ${
            fileName
              ? 'border-blue-500 bg-blue-50/20'
              : 'border-gray-300 hover:border-blue-900 bg-gray-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.pdf,application/pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />
          {fileType === 'pdf' ? (
            <FileText className="w-10 h-10 text-purple-700 mx-auto mb-2" />
          ) : (
            <UploadCloud className="w-10 h-10 text-blue-900/70 mx-auto mb-2" />
          )}
          <h4 className="text-sm font-bold text-gray-900">
            {fileName ? fileName : 'Drag & drop your .csv or .pdf file here, or click to browse'}
          </h4>
          <p className="text-xs text-gray-600 mt-1">
            {fileSizeBytes > 0
              ? `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB (${(fileSizeBytes / 1024).toFixed(1)} KB) — ${
                  fileType === 'pdf'
                    ? 'PDF Document selected • Gemini Multimodal extraction enabled'
                    : `${totalParsedRows} data row(s) detected`
                }`
              : 'Accepted formats: .csv, .pdf | Maximum file size: 30MB'}
          </p>
        </div>

        {/* PDF Document Preview Card */}
        {fileType === 'pdf' && rawPdfBase64 && (
          <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-100 text-purple-800 rounded-lg">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-bold text-purple-950 text-sm">{fileName}</h4>
                  <p className="text-purple-700 text-[11px]">
                    Size: {(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • Ready for AI Extraction
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-purple-200/70 text-purple-900 rounded-full font-bold text-[11px] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-700" />
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-purple-900/80 text-[11px] leading-relaxed">
              Gemini AI will read this PDF document directly, identify all accounts, parse MRR/plan information, evaluate risk signals, and synthesize proactive retention action recommendations into your dashboard.
            </p>
          </div>
        )}

        {/* Deduplication Option & Action Controls */}
        {(rawCsvText || rawPdfBase64) && (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="text-xs font-bold text-gray-900 block">
                  Deduplication Strategy (if customer_id already exists):
                </label>
                <div className="flex items-center gap-6 mt-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deduplication"
                      value="overwrite"
                      checked={deduplicationMode === 'overwrite'}
                      onChange={() => setDeduplicationMode('overwrite')}
                      className="text-blue-900 focus:ring-blue-900"
                    />
                    <span className="font-semibold text-gray-800">Overwrite existing records</span>
                    <span className="text-gray-500 text-[11px]">(Update telemetry & re-score)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deduplication"
                      value="skip"
                      checked={deduplicationMode === 'skip'}
                      onChange={() => setDeduplicationMode('skip')}
                      className="text-blue-900 focus:ring-blue-900"
                    />
                    <span className="font-semibold text-gray-800">Skip duplicates</span>
                    <span className="text-gray-500 text-[11px]">(Keep existing unchanged)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleResetImport}
                  disabled={isProcessing}
                  className="px-3.5 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-semibold transition-colors"
                >
                  Clear File
                </button>

                <button
                  onClick={() => handleExecuteImport(true)}
                  disabled={isProcessing || (fileType === 'csv' && missingHeaders.length > 0)}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isProcessing
                    ? 'Processing with Gemini...'
                    : fileType === 'pdf'
                    ? 'Process & Import PDF'
                    : 'Process & Import CSV'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data Preview Table (CSV only) */}
        {fileType === 'csv' && parsedPreview.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">
                File Preview ({parsedPreview.length} of {totalParsedRows} data rows shown)
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                Columns matched: {Object.keys(parsedPreview[0]).length}
              </span>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-100 text-gray-800 font-semibold text-[10px] uppercase tracking-wider">
                  <tr>
                    {Object.keys(parsedPreview[0]).map((key) => (
                      <th key={key} className="py-2.5 px-3 whitespace-nowrap">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                  {parsedPreview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {Object.values(row).map((val, vIdx) => (
                        <td key={vIdx} className="py-2 px-3 truncate max-w-[160px]">
                          {val || <span className="text-gray-400 font-sans italic">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* IMPORT SUMMARY DIALOG / MODAL */}
      {summaryModalOpen && importSummary && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  importSummary.failedRowsCount === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {importSummary.failedRowsCount === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-700" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {importSummary.failedRowsCount === 0
                        ? 'Import Completed Successfully'
                        : 'Import Summary & Validation Report'}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                      {importSummary.fileType?.toUpperCase() || (fileType === 'pdf' ? 'PDF' : 'CSV')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    File: <span className="font-semibold text-gray-700">{fileName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSummaryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Summary AI Highlight (if PDF) */}
            {importSummary.documentSummary && (
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-purple-950">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Gemini Multimodal Document Insights:</span>
                </div>
                <p className="text-purple-900 leading-relaxed text-[11px]">
                  {importSummary.documentSummary}
                </p>
              </div>
            )}

            {/* Metric Summary Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center">
                <span className="text-[10px] font-semibold uppercase text-gray-500 block">Total Records</span>
                <span className="text-xl font-extrabold text-gray-900 mt-0.5 block">{importSummary.totalRows}</span>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="text-[10px] font-semibold uppercase text-emerald-700 block">Imported Active</span>
                <span className="text-xl font-extrabold text-emerald-700 mt-0.5 block">{importSummary.validRowsCount}</span>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
                <span className="text-[10px] font-semibold uppercase text-red-700 block">Failed Records</span>
                <span className="text-xl font-extrabold text-red-700 mt-0.5 block">{importSummary.failedRowsCount}</span>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                <span className="text-[10px] font-semibold uppercase text-blue-900 block">
                  {deduplicationMode === 'skip' ? 'Skipped Dups' : 'Overwritten'}
                </span>
                <span className="text-xl font-extrabold text-blue-900 mt-0.5 block">
                  {deduplicationMode === 'skip' ? importSummary.skippedCount : importSummary.overwrittenCount}
                </span>
              </div>
            </div>

            {/* Live Dashboard Impact Banner */}
            {importSummary.dashboardSummary && (
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-blue-950">
                  <ShieldCheck className="w-4 h-4 text-blue-900" />
                  <span>Real-Time Dashboard Metrics Updated</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-blue-950">
                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <span className="text-[10px] text-gray-500 uppercase block">Monitored Customers</span>
                    <strong className="text-sm">{importSummary.dashboardSummary.totalCustomers}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <span className="text-[10px] text-gray-500 uppercase block">Total Portfolio MRR</span>
                    <strong className="text-sm">{formatCurrency(importSummary.dashboardSummary.totalMrr)}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <span className="text-[10px] text-gray-500 uppercase block">Avg Churn Score</span>
                    <strong className="text-sm">{importSummary.dashboardSummary.avgChurnScore}/100</strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <span className="text-[10px] text-gray-500 uppercase block">At-Risk MRR</span>
                    <strong className="text-sm text-orange-600">{formatCurrency(importSummary.dashboardSummary.atRiskMrr)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Failed Rows / Error Details Section */}
            {importSummary.failedRowsCount > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowErrorList(!showErrorList)}
                    className="text-xs font-bold text-red-700 hover:text-red-900 flex items-center gap-1.5"
                  >
                    {showErrorList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <span>
                      {showErrorList ? 'Hide error breakdown' : `View ${importSummary.errors.length} failed row issues`}
                    </span>
                  </button>

                  <button
                    onClick={handleDownloadErrorCsv}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-red-600" />
                    Download Error CSV
                  </button>
                </div>

                {showErrorList && (
                  <div className="max-h-56 overflow-y-auto border border-red-200 bg-red-50/40 rounded-xl p-3 divide-y divide-red-100 text-xs">
                    {importSummary.errors.map((err, errIdx) => (
                      <div key={errIdx} className="py-2 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between text-red-900 font-semibold">
                          <span>Row {err.row}</span>
                          <span className="font-mono text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                            field: {err.field}
                          </span>
                        </div>
                        <p className="text-red-700 text-[11px] mt-0.5">{err.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setSummaryModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-semibold transition-colors"
              >
                Close
              </button>

              {onNavigate && (
                <button
                  onClick={() => {
                    setSummaryModalOpen(false);
                    onNavigate('dashboard');
                  }}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  View in Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
