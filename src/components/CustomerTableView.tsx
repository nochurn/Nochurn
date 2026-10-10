import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  AlertCircle,
  Download,
  Trash2,
  Undo2,
  Database,
  CheckSquare,
  Square,
  MinusSquare,
  AlertTriangle
} from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency, getRiskColorClass } from '../utils/formatters';

interface CustomerTableViewProps {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onLimitChange: (l: number) => void;
  onSearchChange: (s: string) => void;
  searchValue: string;
  onFilterChange: (key: string, value: string) => void;
  filters: {
    riskLevel: string;
    mrrRange: string;
    plan: string;
    factor: string;
  };
  onSortChange: (sortBy: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSelectCustomer: (cust: Customer) => void;
  onBatchAnalyze: () => void;
  isBatchAnalyzing: boolean;
  onMarkSaved: (id: string) => void;
  onDeleteCustomer?: (id: string) => Promise<boolean> | void;
  onDeleteCustomers?: (ids: string[]) => Promise<boolean> | void;
  onClearDemoData?: () => Promise<number> | void;
  onUndoDelete?: () => Promise<boolean> | void;
  lastDeletedBatch?: { id: string; customers: Customer[]; timestamp: string } | null;
}

export const CustomerTableView: React.FC<CustomerTableViewProps> = ({
  customers,
  total,
  page,
  limit,
  totalPages,
  onPageChange,
  onLimitChange,
  onSearchChange,
  searchValue,
  onFilterChange,
  filters,
  onSortChange,
  sortBy,
  sortOrder,
  onSelectCustomer,
  onBatchAnalyze,
  isBatchAnalyzing,
  onMarkSaved,
  onDeleteCustomer,
  onDeleteCustomers,
  onClearDemoData,
  onUndoDelete,
  lastDeletedBatch
}) => {
  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState<boolean>(false);
  const [confirmClearDemo, setConfirmClearDemo] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Check demo data presence
  const hasDemoAccounts = useMemo(() => {
    return customers.some(c => c.is_demo_data === true || c.isDemo === true);
  }, [customers]);

  // Select all / deselect all
  const allCurrentPageSelected = useMemo(() => {
    if (customers.length === 0) return false;
    return customers.every(c => selectedIds.has(c.id));
  }, [customers, selectedIds]);

  const someCurrentPageSelected = useMemo(() => {
    return customers.some(c => selectedIds.has(c.id)) && !allCurrentPageSelected;
  }, [customers, selectedIds, allCurrentPageSelected]);

  const handleToggleSelectAll = () => {
    if (allCurrentPageSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      customers.forEach(c => next.add(c.id));
      setSelectedIds(next);
    }
  };

  const handleToggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleExecuteSingleDelete = async (id: string) => {
    if (!onDeleteCustomer) return;
    setIsDeleting(true);
    try {
      await onDeleteCustomer(id);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } finally {
      setIsDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const handleExecuteBulkDelete = async () => {
    if (!onDeleteCustomers || selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await onDeleteCustomers(Array.from(selectedIds));
      setSelectedIds(new Set());
    } finally {
      setIsDeleting(false);
      setConfirmBulkDelete(false);
    }
  };

  const handleExecuteClearDemo = async () => {
    if (!onClearDemoData) return;
    setIsDeleting(true);
    try {
      await onClearDemoData();
      setSelectedIds(new Set());
    } finally {
      setIsDeleting(false);
      setConfirmClearDemo(false);
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-900" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-900" />
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden relative">
      {/* Undo Notification Bar */}
      {lastDeletedBatch && onUndoDelete && (
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs transition-all animate-in fade-in duration-200 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-amber-300 font-semibold">
              Deleted {lastDeletedBatch.customers.length} account{lastDeletedBatch.customers.length > 1 ? 's' : ''}:
            </span>
            <span className="text-slate-300 truncate max-w-md">
              {lastDeletedBatch.customers.map(c => c.name || c.company_name).slice(0, 3).join(', ')}
              {lastDeletedBatch.customers.length > 3 ? ` +${lastDeletedBatch.customers.length - 3} more` : ''}
            </span>
          </div>
          <button
            onClick={() => onUndoDelete()}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5 text-blue-900" />
            <span>Undo Delete</span>
          </button>
        </div>
      )}

      {/* Table Header & Controls Bar */}
      <div className="p-4 border-b border-gray-200 bg-gray-50/50 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 leading-tight">Customer Retention Pipeline</h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Showing <span className="font-mono tabular-nums font-semibold text-gray-900">{customers.length}</span> of <span className="font-mono tabular-nums font-semibold text-gray-900">{total}</span> monitored accounts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Clear Demo Data Button */}
            {hasDemoAccounts && onClearDemoData && (
              <button
                onClick={() => setConfirmClearDemo(true)}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Remove sample demo accounts to keep only real imported customers"
              >
                <Database className="w-3.5 h-3.5 text-amber-700" />
                <span>Clear Demo Accounts</span>
              </button>
            )}

            <button
              onClick={onBatchAnalyze}
              disabled={isBatchAnalyzing}
              className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              {isBatchAnalyzing ? 'Scoring with AI...' : 'Batch Score with AI'}
            </button>

            <a
              href="/api/imports/template"
              download
              className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              CSV Template
            </a>
          </div>
        </div>

        {/* Bulk Action Bar when items selected */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-950 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-900 font-mono tabular-nums bg-white px-2 py-0.5 rounded border border-blue-200">
                {selectedIds.size}
              </span>
              <span className="font-medium">account{selectedIds.size > 1 ? 's' : ''} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-2.5 py-1 text-gray-600 hover:text-gray-900 text-xs font-medium"
              >
                Deselect All
              </button>
              {onDeleteCustomers && (
                <button
                  onClick={() => setConfirmBulkDelete(true)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedIds.size})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-gray-200/60 text-xs">
          {/* Search Box */}
          <div className="col-span-2 sm:col-span-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by name, email, domain..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-900"
              />
            </div>
          </div>

          {/* Risk Filter */}
          <div>
            <select
              value={filters.riskLevel}
              onChange={(e) => onFilterChange('riskLevel', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-900"
            >
              <option value="all">Risk: All Tiers</option>
              <option value="critical">Critical (80-100)</option>
              <option value="high">High (60-79)</option>
              <option value="medium">Medium (30-59)</option>
              <option value="low">Low (&lt; 30)</option>
            </select>
          </div>

          {/* MRR Range */}
          <div>
            <select
              value={filters.mrrRange}
              onChange={(e) => onFilterChange('mrrRange', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-900"
            >
              <option value="all">MRR: All Amounts</option>
              <option value="<500">&lt; $500 /mo</option>
              <option value="500-1500">$500 - $1,500 /mo</option>
              <option value=">1500">&gt; $1,500 /mo</option>
            </select>
          </div>

          {/* Plan */}
          <div>
            <select
              value={filters.plan}
              onChange={(e) => onFilterChange('plan', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-900"
            >
              <option value="all">Plan: All Tiers</option>
              <option value="Enterprise">Enterprise</option>
              <option value="Growth">Growth</option>
              <option value="Starter">Starter</option>
              <option value="Pro">Pro</option>
            </select>
          </div>

          {/* Key Factor */}
          <div>
            <select
              value={filters.factor}
              onChange={(e) => onFilterChange('factor', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-900"
            >
              <option value="all">Factor: All Drivers</option>
              <option value="payment">Billing / Payment Issues</option>
              <option value="usage">Low Usage / Inactive</option>
              <option value="support">Unresolved Tickets</option>
              <option value="email">Low Email Engagement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-700">
          <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              {/* Checkbox Column */}
              <th className="py-3 px-3 w-10 text-center">
                <button
                  onClick={handleToggleSelectAll}
                  className="text-gray-500 hover:text-blue-900 focus:outline-none"
                  title={allCurrentPageSelected ? 'Deselect all' : 'Select all on page'}
                >
                  {allCurrentPageSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-900" />
                  ) : someCurrentPageSelected ? (
                    <MinusSquare className="w-4 h-4 text-blue-900" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </th>

              <th
                onClick={() => onSortChange('name')}
                className="py-3 px-3 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Customer / Account</span>
                  {getSortIcon('name')}
                </div>
              </th>

              <th
                onClick={() => onSortChange('riskScore')}
                className="py-3 px-3 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Risk Score</span>
                  {getSortIcon('riskScore')}
                </div>
              </th>

              <th
                onClick={() => onSortChange('mrr')}
                className="py-3 px-3 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>MRR</span>
                  {getSortIcon('mrr')}
                </div>
              </th>

              <th className="py-3 px-3">Plan</th>

              <th
                onClick={() => onSortChange('lastLogin')}
                className="py-3 px-3 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Last Login</span>
                  {getSortIcon('lastLogin')}
                </div>
              </th>

              <th className="py-3 px-3">Tickets</th>
              <th className="py-3 px-3">Payment</th>
              <th className="py-3 px-3">Top Risk Factor</th>
              <th className="py-3 px-3">Recommended Action</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-gray-500">
                  <AlertCircle className="w-7 h-7 mx-auto text-gray-400 mb-2" />
                  <p className="font-semibold text-gray-800">No accounts match the active query.</p>
                  <p className="text-xs text-gray-500 mt-1">Try clearing filters, searching a different keyword, or importing accounts.</p>
                </td>
              </tr>
            ) : (
              customers.map((cust) => {
                const isSelected = selectedIds.has(cust.id);
                const riskClasses = getRiskColorClass(cust.riskCategory);
                const isDemo = cust.is_demo_data === true || cust.isDemo === true;
                const custName = cust.company_name || cust.name || 'Unnamed Account';
                const email = cust.email || 'No email';

                return (
                  <tr
                    key={cust.id}
                    className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/60' : cust.status === 'saved' ? 'bg-emerald-50/20' : ''
                    }`}
                    onClick={() => onSelectCustomer(cust)}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3 text-center" onClick={(e) => handleToggleSelectRow(cust.id, e)}>
                      <button className="text-gray-400 hover:text-blue-900 focus:outline-none">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-900" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-300" />
                        )}
                      </button>
                    </td>

                    {/* Name & Domain */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                          {custName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate flex items-center gap-1.5">
                            <span>{custName}</span>
                            {isDemo && (
                              <span className="text-[9px] font-semibold text-amber-700 bg-amber-100 px-1 rounded">
                                Demo
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate font-mono">{email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Risk Score */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[11px] font-mono tabular-nums flex items-center gap-1 ${riskClasses.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${riskClasses.dot}`}></span>
                          {cust.riskScore}
                        </span>
                        {cust.isAiAnalyzed && (
                          <Sparkles className="w-3 h-3 text-blue-900" title="Analyzed with Gemini" />
                        )}
                      </div>
                    </td>

                    {/* MRR */}
                    <td className="py-3 px-3 font-semibold text-gray-900 font-mono tabular-nums whitespace-nowrap">
                      {formatCurrency(cust.mrr)}
                    </td>

                    {/* Plan */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="text-[11px] font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {cust.plan || 'Starter'}
                      </span>
                    </td>

                    {/* Days Since Login */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`font-mono tabular-nums font-medium ${cust.lastLoginDays > 14 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                        {cust.lastLoginDays}d ago
                      </span>
                    </td>

                    {/* Open Tickets */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {cust.openTicketsCount > 0 ? (
                        <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-mono tabular-nums">
                          {cust.openTicketsCount} open
                        </span>
                      ) : (
                        <span className="text-gray-400 font-mono">0</span>
                      )}
                    </td>

                    {/* Payment Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          cust.paymentStatus === 'Current' || cust.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : cust.paymentStatus === 'Retried'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {cust.paymentStatus || 'Current'}
                      </span>
                    </td>

                    {/* Top Risk Factor */}
                    <td className="py-3 px-3 max-w-[180px] truncate" title={cust.topFactors?.[0]?.factor || cust.risk_reason}>
                      <span className="text-[11px] text-gray-700 truncate block">
                        {cust.topFactors?.[0]?.factor || cust.risk_reason || 'Normal engagement cadence'}
                      </span>
                    </td>

                    {/* Recommended Action */}
                    <td className="py-3 px-3 max-w-[190px] truncate" title={cust.recommendedAction || cust.recommended_action}>
                      <span className="text-[11px] font-medium text-blue-900 truncate block">
                        {cust.recommendedAction || cust.recommended_action || 'Proactive check-in'}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectCustomer(cust)}
                          className="px-2 py-1 text-[11px] font-semibold text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          Details
                        </button>

                        {cust.status !== 'saved' ? (
                          <button
                            onClick={() => onMarkSaved(cust.id)}
                            title="Mark customer as saved"
                            className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Saved
                          </span>
                        )}

                        {onDeleteCustomer && (
                          <button
                            onClick={() => setConfirmDeleteId(cust.id)}
                            title="Delete customer record"
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-700">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-800 focus:outline-none"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-gray-600 font-mono tabular-nums">
            Page {page} of {totalPages || 1}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(5, totalPages || 1) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold font-mono tabular-nums transition-colors cursor-pointer ${
                  page === p
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal: Single Delete */}
      {confirmDeleteId && (() => {
        const targetCust = customers.find(c => c.id === confirmDeleteId);
        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3 text-red-600">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-gray-900 text-sm">Delete Customer Account?</h4>
                  <p className="text-xs text-gray-500">
                    Are you sure you want to permanently remove this account from your active portfolio?
                  </p>
                </div>
              </div>

              {targetCust && (
                <div className="p-3 bg-red-50/60 border border-red-200/80 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Account:</span>
                    <strong className="text-gray-900 font-semibold">{targetCust.company_name || targetCust.name}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Monthly Revenue (MRR):</span>
                    <strong className="text-gray-900 font-mono font-semibold">{formatCurrency(targetCust.mrr || 0)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Risk Level:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      (targetCust.riskCategory === 'critical' || (targetCust.riskScore ?? 0) >= 80)
                        ? 'bg-red-100 text-red-800'
                        : (targetCust.riskCategory === 'high' || (targetCust.riskScore ?? 0) >= 60)
                        ? 'bg-orange-100 text-orange-800'
                        : (targetCust.riskCategory === 'medium' || (targetCust.riskScore ?? 0) >= 30)
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {targetCust.riskCategory ? targetCust.riskCategory.toUpperCase() : `Score ${targetCust.riskScore ?? 0}`}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleExecuteSingleDelete(confirmDeleteId)}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-xs"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirmation Modal: Bulk Delete */}
      {confirmBulkDelete && (() => {
        const selectedList = customers.filter(c => selectedIds.has(c.id));
        const selectedTotalMrr = selectedList.reduce((sum, c) => sum + (c.mrr || 0), 0);
        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3 text-red-600">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Delete {selectedIds.size} Selected Accounts?</h4>
                  <p className="text-xs text-gray-500">
                    All selected customer records and their telemetry will be removed from your dashboard.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-red-50/60 border border-red-200/80 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Selected Count:</span>
                  <strong className="text-gray-900 font-bold">{selectedIds.size} customer accounts</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Total MRR to Remove:</span>
                  <strong className="text-red-700 font-mono font-bold">{formatCurrency(selectedTotalMrr)}</strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setConfirmBulkDelete(false)}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteBulkDelete}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-xs"
                >
                  {isDeleting ? 'Deleting...' : `Confirm Delete (${selectedIds.size} accounts)`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirmation Modal: Clear Demo Data */}
      {confirmClearDemo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Clear All Sample Demo Accounts?</h4>
                <p className="text-xs text-gray-500">
                  This will remove all pre-loaded demo accounts. Your imported CSV customer records will remain completely intact. You can restore demo data anytime.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setConfirmClearDemo(false)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteClearDemo}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-xs"
              >
                {isDeleting ? 'Clearing...' : 'Clear Demo Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
