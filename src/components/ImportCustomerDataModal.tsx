import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  RefreshCw,
  FileCheck
} from 'lucide-react';

interface ImportCustomerDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCustomers: (payload: {
    rawCsv?: string;
    rawPdfBase64?: string;
    fileType?: 'csv' | 'pdf';
    fileName?: string;
  }) => Promise<any>;
  onLoadDemoData: () => Promise<number | void>;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

// Common fields supported
const COMMON_FIELDS = [
  { key: 'customer_name', label: 'name / customer_name', desc: 'Customer / account name' },
  { key: 'email', label: 'email', desc: 'Primary contact email' },
  { key: 'phone', label: 'phone', desc: 'Phone or mobile number' },
  { key: 'last_purchase_date', label: 'last_purchase_date', desc: 'Last purchase / order date' },
  { key: 'total_spent', label: 'total_spent', desc: 'Total amount spent or LTV' },
  { key: 'total_orders', label: 'total_orders', desc: 'Total number of orders / purchases' },
  { key: 'last_login_date', label: 'last_login_date', desc: 'Last sign-in or active date' },
  { key: 'support_tickets', label: 'support_tickets', desc: 'Open / total support tickets' },
  { key: 'city', label: 'city', desc: 'Customer city location' },
  { key: 'country', label: 'country', desc: 'Customer country location' },
  { key: 'customer_id', label: 'customer_id', desc: 'Account or user ID' },
  { key: 'plan', label: 'plan', desc: 'Subscription tier (Starter, Growth, Pro)' },
  { key: 'monthly_revenue', label: 'monthly_revenue / mrr', desc: 'Monthly recurring revenue' }
];

export const ImportCustomerDataModal: React.FC<ImportCustomerDataModalProps> = ({
  isOpen,
  onClose,
  onImportCustomers,
  onLoadDemoData,
  onShowToast
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'csv' | 'pdf' | null>(null);
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [rawPdfBase64, setRawPdfBase64] = useState<string>('');
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [totalRowsCount, setTotalRowsCount] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Reset modal internal state
  const resetFileState = () => {
    setSelectedFile(null);
    setFileType(null);
    setRawCsvText('');
    setRawPdfBase64('');
    setDetectedColumns([]);
    setPreviewRows([]);
    setPreviewHeaders([]);
    setTotalRowsCount(0);
    setValidationError(null);
    if (csvInputRef.current) csvInputRef.current.value = '';
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const handleClose = () => {
    if (!isProcessing) {
      resetFileState();
      onClose();
    }
  };

  // Helper to parse line with quotes & delimiter
  const parseLine = (line: string, delim: string): string[] => {
    const vals: string[] = [];
    let inQuote = false;
    let curVal = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        if (inQuote && line[i + 1] === char) {
          curVal += char;
          i++;
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

  // Process CSV file
  const handleCsvFile = (file: File) => {
    setValidationError(null);
    setSelectedFile(file);
    setFileType('csv');

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      if (!text.trim()) {
        setValidationError('The selected CSV file is empty. Please choose a file with customer records.');
        return;
      }

      setRawCsvText(text);

      // Clean BOM & normalize lines
      const clean = text.replace(/^[\uFEFF\uFFFE]/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = clean.split('\n').filter((l) => l.trim().length > 0);

      if (lines.length < 1) {
        setValidationError('CSV file contains no readable rows.');
        return;
      }

      // Detect delimiter
      const sample = lines[0];
      const commaCount = (sample.match(/,/g) || []).length;
      const semiCount = (sample.match(/;/g) || []).length;
      const tabCount = (sample.match(/\t/g) || []).length;
      let delim = ',';
      if (semiCount > commaCount && semiCount > tabCount) delim = ';';
      else if (tabCount > commaCount && tabCount > semiCount) delim = '\t';

      const headers = parseLine(lines[0], delim).map((h) => h.trim());
      setPreviewHeaders(headers);

      // Detect available customer columns from common fields
      const detected: string[] = [];
      headers.forEach((h) => {
        const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (['customerid', 'id', 'custid', 'accountid', 'clientid', 'uid', 'userid'].includes(cleanH)) {
          if (!detected.includes('customer_id')) detected.push('customer_id');
        } else if (['customername', 'name', 'company', 'companyname', 'account', 'accountname', 'client', 'organization'].includes(cleanH)) {
          if (!detected.includes('customer_name')) detected.push('customer_name');
        } else if (['email', 'workemail', 'contactemail', 'primaryemail', 'useremail', 'billingemail', 'mail'].includes(cleanH)) {
          if (!detected.includes('email')) detected.push('email');
        } else if (['phone', 'phonenumber', 'mobile', 'cell', 'telephone', 'contactnumber', 'tel'].includes(cleanH)) {
          if (!detected.includes('phone')) detected.push('phone');
        } else if (['lastpurchasedate', 'lastpurchase', 'purchasedate', 'lastorderdate', 'lastorder', 'lastpaymentdate'].includes(cleanH)) {
          if (!detected.includes('last_purchase_date')) detected.push('last_purchase_date');
        } else if (['totalspent', 'totalspend', 'spent', 'totalsales', 'revenue', 'ltv', 'customerlifetimevalue'].includes(cleanH)) {
          if (!detected.includes('total_spent')) detected.push('total_spent');
        } else if (['totalorders', 'orders', 'ordercount', 'orderscount', 'numberoforders', 'purchases'].includes(cleanH)) {
          if (!detected.includes('total_orders')) detected.push('total_orders');
        } else if (['lastlogin', 'lastlogindate', 'lastlogin_date', 'lastactive', 'lastactivedate', 'lastseen'].includes(cleanH)) {
          if (!detected.includes('last_login_date')) detected.push('last_login_date');
        } else if (['supporttickets', 'supporttickets30d', 'tickets', 'ticketslast30days', 'opentickets', 'openticketscount'].includes(cleanH)) {
          if (!detected.includes('support_tickets')) detected.push('support_tickets');
        } else if (['city', 'location', 'town'].includes(cleanH)) {
          if (!detected.includes('city')) detected.push('city');
        } else if (['country', 'nation', 'region'].includes(cleanH)) {
          if (!detected.includes('country')) detected.push('country');
        } else if (['plan', 'tier', 'package', 'subscriptiontier', 'planname'].includes(cleanH)) {
          if (!detected.includes('plan')) detected.push('plan');
        } else if (['subscription', 'subscriptionstatus', 'substatus', 'status'].includes(cleanH)) {
          if (!detected.includes('subscription')) detected.push('subscription');
        } else if (['signupdate', 'startdate', 'createdat', 'creationdate', 'joined', 'joineddate', 'date'].includes(cleanH)) {
          if (!detected.includes('signup_date')) detected.push('signup_date');
        } else if (['lastactivedate', 'lastactive', 'lastactivity', 'lastactivitydate', 'lastseen'].includes(cleanH)) {
          if (!detected.includes('last_active_date')) detected.push('last_active_date');
        } else if (['lastlogin', 'lastlogindate', 'lastlogindays', 'lastlogindaysago', 'inactivedays'].includes(cleanH)) {
          if (!detected.includes('last_login')) detected.push('last_login');
        } else if (['monthlyrevenue', 'mrr', 'revenue', 'arr', 'amount', 'monthlyamount', 'spend', 'price', 'value', 'fee'].includes(cleanH)) {
          if (!detected.includes('monthly_revenue')) detected.push('monthly_revenue');
        }
      });

      setDetectedColumns(detected);
      setTotalRowsCount(Math.max(0, lines.length - 1));

      // Build small preview rows (up to 5 rows)
      const preview: Record<string, string>[] = [];
      const maxRows = Math.min(6, lines.length);
      for (let i = 1; i < maxRows; i++) {
        const vals = parseLine(lines[i], delim);
        if (vals.every((v) => !v.trim())) continue;
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = vals[idx] !== undefined ? vals[idx] : '';
        });
        preview.push(rowObj);
      }
      setPreviewRows(preview);
    };

    reader.onerror = () => {
      setValidationError('Failed to read the CSV file. Please try again.');
    };

    reader.readAsText(file);
  };

  // Process PDF file
  const handlePdfFile = (file: File) => {
    setValidationError(null);
    setSelectedFile(file);
    setFileType('pdf');

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;
      if (!base64Data) {
        setValidationError('Failed to read the PDF file.');
        return;
      }
      setRawPdfBase64(base64Data);
    };

    reader.onerror = () => {
      setValidationError('Failed to read the PDF file.');
    };

    reader.readAsDataURL(file);
  };

  // Handle native file selection
  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setValidationError('Please select a valid .csv file.');
        return;
      }
      handleCsvFile(file);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setValidationError('Please select a valid .pdf file.');
        return;
      }
      handlePdfFile(file);
    }
  };

  // Trigger import
  const handleConfirmImport = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setValidationError(null);

    try {
      if (fileType === 'csv') {
        await onImportCustomers({
          rawCsv: rawCsvText,
          fileName: selectedFile.name,
          fileType: 'csv'
        });
        if (onShowToast) onShowToast(`Successfully imported customer records from ${selectedFile.name}!`, 'success');
      } else if (fileType === 'pdf') {
        await onImportCustomers({
          rawPdfBase64: rawPdfBase64,
          fileName: selectedFile.name,
          fileType: 'pdf'
        });
        if (onShowToast) onShowToast(`Successfully parsed and imported customer accounts from ${selectedFile.name}!`, 'success');
      }
      handleClose();
    } catch (err: any) {
      console.error('Import failed:', err);
      setValidationError(err?.message || 'Failed to import customer records. Please check the file format.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Try demo data
  const handleTryDemoData = async () => {
    setIsProcessing(true);
    setValidationError(null);
    try {
      const count = await onLoadDemoData();
      if (onShowToast) {
        onShowToast(`🎉 Demo customer dataset loaded! Ready for morning AI scan.`, 'success');
      }
      handleClose();
    } catch (err: any) {
      console.error('Failed to load demo data:', err);
      setValidationError('Failed to load demo dataset. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs">
              <UploadCloud className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Import Customer Data</h2>
              <p className="text-xs text-gray-500">
                Upload your customer records to power risk calculations and AI retention drafts.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Hidden native file inputs */}
          <input
            type="file"
            ref={csvInputRef}
            onChange={handleCsvChange}
            accept=".csv,text/csv"
            className="hidden"
          />
          <input
            type="file"
            ref={pdfInputRef}
            onChange={handlePdfChange}
            accept=".pdf,application/pdf"
            className="hidden"
          />

          {!selectedFile ? (
            /* Choice Screen: 3 Primary Actions */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Upload CSV */}
                <button
                  type="button"
                  onClick={() => csvInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-blue-900/30 hover:border-blue-900 bg-blue-50/30 hover:bg-blue-50/70 rounded-2xl text-left transition-all group cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <FileSpreadsheet className="w-5 h-5 text-blue-200" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <span>Upload CSV</span>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-900 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Select a .csv file from your computer. We automatically detect customer fields.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-blue-100 text-[11px] font-semibold text-blue-900">
                    Supports .csv files
                  </div>
                </button>

                {/* 2. Upload PDF */}
                <button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-gray-300 hover:border-indigo-600 bg-gray-50/50 hover:bg-indigo-50/40 rounded-2xl text-left transition-all group cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-900 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5 text-indigo-200" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <span>Upload PDF</span>
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-900 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Upload customer contracts, invoices, or retention audit reports in PDF format.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200 text-[11px] font-semibold text-indigo-900">
                    Supports .pdf files
                  </div>
                </button>
              </div>

              {/* Supported Columns Guide */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                  Supported Customer Columns:
                </span>
                <div className="flex flex-wrap gap-1.5 text-[11px] text-gray-600 font-mono">
                  {COMMON_FIELDS.map((f) => (
                    <span
                      key={f.key}
                      className="px-2 py-0.5 bg-white border border-gray-200 rounded-md font-medium text-gray-700"
                    >
                      {f.key}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500">
                  Headers are matched flexibly (e.g. "mrr" or "revenue" for monthly_revenue, "name" for customer_name).
                </p>
              </div>

              {/* 3. Try Demo Data */}
              <div className="pt-2">
                <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Want to test the full retention workflow first?</span>
                    </div>
                    <p className="text-xs text-amber-800">
                      Load 15 sample B2B SaaS accounts with real behavioral churn telemetry and renewal signals.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleTryDemoData}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Try Demo Data</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Preview Screen (File Selected) */
            <div className="space-y-4">
              {/* Selected File Card */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0">
                    {fileType === 'pdf' ? <FileText className="w-4 h-4" /> : <FileCheck className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">{selectedFile.name}</div>
                    <div className="text-[11px] text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {fileType === 'csv' ? `${totalRowsCount} rows detected` : 'PDF Document'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetFileState}
                  disabled={isProcessing}
                  className="text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
                >
                  Choose Different File
                </button>
              </div>

              {/* Detected Columns (CSV only) */}
              {fileType === 'csv' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">
                      Detected Customer Columns ({detectedColumns.length}):
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Validated
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {detectedColumns.map((col) => (
                      <span
                        key={col}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <code>{col}</code>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Rows Preview Table (CSV only) */}
              {fileType === 'csv' && previewRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">
                      Data Preview (Showing first {previewRows.length} rows):
                    </span>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs max-h-52 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                        <tr>
                          {previewHeaders.slice(0, 6).map((h) => (
                            <th key={h} className="px-3 py-2 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {previewRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-gray-50/60">
                            {previewHeaders.slice(0, 6).map((h) => (
                              <td key={h} className="px-3 py-2 whitespace-nowrap text-gray-700 font-mono text-[11px]">
                                {row[h] || <span className="text-gray-400 italic">empty</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PDF Preview Notice */}
              {fileType === 'pdf' && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5 text-xs text-indigo-950">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-700" />
                    <span>PDF Document Ready for Processing</span>
                  </div>
                  <p className="text-indigo-800 text-[11px] leading-relaxed">
                    Customer tables and telemetry will be parsed and added to your workspace.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>

          {selectedFile ? (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing Data...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Import Customer Data</span>
                </>
              )}
            </button>
          ) : (
            <div className="text-[11px] text-gray-500">
              Select CSV, PDF, or try Demo Data to continue
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
