import React, { useState, useMemo, useEffect } from 'react';
import { Customer, RetentionMessage } from '../types';
import {
  MessageSquare,
  Mail,
  CheckCircle2,
  XCircle,
  Edit3,
  RefreshCw,
  Send,
  AlertCircle,
  Clock,
  Filter,
  Check,
  X,
  ExternalLink,
  Copy,
  AlertTriangle,
  Shield,
  Sliders,
  CheckCheck
} from 'lucide-react';
import { aiEmployeeService } from '../services/aiEmployeeService';
import { fetchOutboundStatus, OutboundStatusResponse } from '../services/api';
import { OutboundConfigGuidanceModal } from './OutboundConfigGuidanceModal';

interface MessagesViewProps {
  customers: Customer[];
  messages: RetentionMessage[];
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onRefreshMessages?: () => void;
  onNavigate?: (tab: string) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  customers,
  messages,
  onShowToast,
  onRefreshMessages,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'ready' | 'approved' | 'queued' | 'sending' | 'sent' | 'copied' | 'failed' | 'all'>('ready');
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'email'>('all');

  // Outbound credentials status
  const [outboundStatus, setOutboundStatus] = useState<OutboundStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);

  // Configuration guidance modal state
  const [guidanceChannel, setGuidanceChannel] = useState<'whatsapp' | 'email' | null>(null);

  // Edit Modal State
  const [editingMessage, setEditingMessage] = useState<RetentionMessage | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [editSubject, setEditSubject] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Load real outbound configuration status
  const loadOutboundConfigStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const status = await fetchOutboundStatus();
      setOutboundStatus(status);
    } catch {
      // Fallback
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const top5CustomerIds = useMemo(() => {
    return new Set(aiEmployeeService.getLatestTop5().map(t => t.customer.id));
  }, [messages]);

  useEffect(() => {
    loadOutboundConfigStatus();
  }, []);

  // Filter messages based on active tab and channel
  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      if (activeTab === 'all') {
        // show all
      } else if (activeTab === 'failed') {
        if (m.status !== 'failed' && m.status !== 'rejected') return false;
      } else if (m.status !== activeTab) {
        return false;
      }
      if (channelFilter !== 'all' && m.channel !== channelFilter) return false;
      return true;
    });
  }, [messages, activeTab, channelFilter]);

  const counts = useMemo(() => {
    return {
      all: messages.length,
      ready: messages.filter(m => m.status === 'ready').length,
      approved: messages.filter(m => m.status === 'approved').length,
      queued: messages.filter(m => m.status === 'queued').length,
      sending: messages.filter(m => m.status === 'sending').length,
      sent: messages.filter(m => m.status === 'sent').length,
      copied: messages.filter(m => m.status === 'copied').length,
      failed: messages.filter(m => m.status === 'failed' || m.status === 'rejected').length
    };
  }, [messages]);

  // Actions
  const handleCopy = async (msg: RetentionMessage) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(msg.content);
      }
      await aiEmployeeService.markCopied(msg.id);
      onShowToast(`Copied ${msg.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} message to clipboard (status set to COPIED).`, 'success');
      if (onRefreshMessages) onRefreshMessages();
    } catch {
      onShowToast('Could not copy to clipboard', 'error');
    }
  };

  const handleApprove = async (msg: RetentionMessage) => {
    setIsProcessing(msg.id);
    try {
      await aiEmployeeService.approveMessage(msg.id);
      onShowToast(`Approved message for ${msg.customerName}. Enqueued into sending queue.`, 'success');
      if (onRefreshMessages) onRefreshMessages();
    } catch {
      onShowToast('Failed to approve message', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleApproveAll = async () => {
    setIsProcessing('all');
    try {
      const res = await aiEmployeeService.approveAll(channelFilter === 'all' ? undefined : channelFilter);
      onShowToast(`Approved ${res.approvedCount} message(s). Enqueued into sending queue.`, 'success');
      if (onRefreshMessages) onRefreshMessages();
    } catch {
      onShowToast('Failed to approve messages', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (msg: RetentionMessage) => {
    setIsProcessing(msg.id);
    try {
      await aiEmployeeService.rejectMessage(msg.id);
      onShowToast(`Rejected draft for ${msg.customerName}.`, 'info');
      if (onRefreshMessages) onRefreshMessages();
    } catch {
      onShowToast('Failed to reject message', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRegenerate = async (msg: RetentionMessage) => {
    setIsProcessing(msg.id);
    try {
      const targetCustomer = customers.find(c => c.id === msg.customerId) || {
        id: msg.customerId,
        name: msg.customerName,
        email: msg.customerEmail
      } as Customer;

      await aiEmployeeService.regenerateMessage(msg.id, targetCustomer);
      onShowToast(`Regenerated copy for ${msg.customerName}.`, 'success');
      if (onRefreshMessages) onRefreshMessages();
    } catch {
      onShowToast('Failed to regenerate message', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessage) return;
    try {
      await aiEmployeeService.editMessage(editingMessage.id, editContent, editSubject || undefined);
      onShowToast('Message updated successfully.', 'success');
      setEditingMessage(null);
      if (onRefreshMessages) onRefreshMessages();
    } catch {
      onShowToast('Failed to save edit', 'error');
    }
  };

  /**
   * Real send button handler:
   * 1. Requires message approval
   * 2. Checks configuration: If NOT configured, shows guidance and never fakes dispatch
   * 3. If configured: Dispatches through backend to real external provider
   * 4. Updates strict message status: SENDING -> SENT (or FAILED)
   */
  const handleSendMessage = async (msg: RetentionMessage) => {
    const isWa = msg.channel === 'whatsapp';
    const isConfigured = isWa
      ? outboundStatus?.whatsapp.configured
      : outboundStatus?.email.configured;

    // IF NOT CONFIGURED: Do NOT pretend to send.
    if (!isConfigured) {
      if (isWa) {
        onShowToast('WhatsApp sending is not configured yet.', 'info');
        setGuidanceChannel('whatsapp');
      } else {
        onShowToast('Email sending is not configured yet.', 'info');
        setGuidanceChannel('email');
      }
      return;
    }

    // Require message approval
    if (msg.status !== 'approved') {
      try {
        await aiEmployeeService.approveMessage(msg.id);
      } catch {
        onShowToast('Message must be approved before sending.', 'error');
        return;
      }
    }

    setIsProcessing(msg.id);
    try {
      const result = await aiEmployeeService.sendMessage(msg.id);
      if (result.success) {
        onShowToast(
          isWa
            ? `WhatsApp message successfully dispatched via WhatsApp Business Cloud API!`
            : `Email successfully dispatched via Resend API!`,
          'success'
        );
      } else {
        onShowToast(
          `Provider rejected message: ${result.error || 'Check outbound integration status in Settings.'}`,
          'error'
        );
      }
      if (onRefreshMessages) onRefreshMessages();
    } catch (err: any) {
      onShowToast(`Failed to dispatch message: ${err?.message || 'Network error'}`, 'error');
      if (onRefreshMessages) onRefreshMessages();
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-900" />
            <span>Outreach Messages &amp; Real Dispatch</span>
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Review personalized retention messages. Direct sending uses real WhatsApp Business Cloud API &amp; Resend Email API. No simulated sends.
          </p>
        </div>

        {/* Integration Status Quick Indicator & Channel Filter */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 text-xs">
          {/* Outbound Health Quick Pill */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
            <div className="flex items-center gap-1.5" title="WhatsApp Business Cloud API Status">
              <span className={`w-2 h-2 rounded-full ${outboundStatus?.whatsapp.configured ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="font-semibold text-[11px] text-gray-700">WhatsApp:</span>
              <span className="text-[11px] text-gray-500">
                {outboundStatus?.whatsapp.configured ? 'Ready' : 'Unconfigured'}
              </span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1.5" title="Resend Email API Status">
              <span className={`w-2 h-2 rounded-full ${outboundStatus?.email.configured ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="font-semibold text-[11px] text-gray-700">Email:</span>
              <span className="text-[11px] text-gray-500">
                {outboundStatus?.email.configured ? 'Ready' : 'Unconfigured'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">Channel:</span>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <option value="all">All Channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </select>
          </div>
        </div>
      </div>

      {/* Strict Status Tabs: READY, APPROVED, QUEUED, SENDING, SENT, COPIED, FAILED, ALL */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-2 text-xs font-bold">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ready')}
            className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'ready'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>Ready for Review</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'ready' ? 'bg-blue-800 text-white' : 'bg-gray-200 text-gray-800'
            }`}>
              {counts.ready}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>Approved</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'approved' ? 'bg-emerald-700 text-white' : 'bg-gray-200 text-gray-800'
            }`}>
              {counts.approved}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('queued')}
            className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'queued'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Sending Queue</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'queued' ? 'bg-amber-700 text-white' : 'bg-gray-200 text-gray-800'
            }`}>
              {counts.queued}
            </span>
          </button>

          {counts.sending > 0 && (
            <button
              onClick={() => setActiveTab('sending')}
              className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'sending'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Sending (In-Flight)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'sending' ? 'bg-purple-700 text-white' : 'bg-gray-200 text-gray-800'
              }`}>
                {counts.sending}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('sent')}
            className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'sent'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Sent via Provider</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'sent' ? 'bg-emerald-800 text-white' : 'bg-gray-200 text-gray-800'
            }`}>
              {counts.sent}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('copied')}
            className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'copied'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copied (Manual Dispatch)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'copied' ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-800'
            }`}>
              {counts.copied}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('failed')}
            className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'failed'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>Rejected / Failed</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'failed' ? 'bg-red-700 text-white' : 'bg-gray-200 text-gray-800'
            }`}>
              {counts.failed}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'all'
                ? 'bg-gray-800 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>All Messages</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
            }`}>
              {counts.all}
            </span>
          </button>
        </div>

        {/* Batch Action: Approve All Ready Drafts */}
        {counts.ready > 0 && (
          <button
            onClick={handleApproveAll}
            disabled={isProcessing === 'all'}
            className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Approve All {counts.ready} Ready</span>
          </button>
        )}
      </div>

      {/* Sending Queue Diagnostic Notice Banner */}
      {counts.queued > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Automatic Sending Queue Active:</strong> {counts.queued} message(s) awaiting delivery.
              {!outboundStatus?.whatsapp.configured && !outboundStatus?.email.configured
                ? ' Messages will remain safely queued and will automatically dispatch once provider credentials are added server-side.'
                : ' Background worker is actively dispatching messages with duplicate prevention.'}
            </span>
          </div>
          <button
            onClick={() => {
              if (onRefreshMessages) onRefreshMessages();
              loadOutboundConfigStatus();
            }}
            className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold shrink-0 cursor-pointer"
          >
            Sync Queue
          </button>
        </div>
      )}

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 space-y-2">
          <MessageSquare className="w-8 h-8 text-gray-400 mx-auto" />
          <h3 className="font-bold text-gray-800 text-sm">No Messages in this category</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {activeTab === 'ready'
              ? 'Your AI Employee prepares messages during morning scans. Run a scan from the Home dashboard to generate new drafts.'
              : activeTab === 'sent'
              ? 'No messages have been confirmed dispatched by external providers yet.'
              : activeTab === 'copied'
              ? 'No messages have been copied for manual dispatch yet.'
              : 'No message records matched the active filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((msg) => {
            const isWa = msg.channel === 'whatsapp';
            const isConfigured = isWa
              ? outboundStatus?.whatsapp.configured
              : outboundStatus?.email.configured;

            return (
              <div
                key={msg.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4 transition-all hover:border-gray-300"
              >
                {/* Message Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isWa ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-blue-100 text-blue-900 border border-blue-200'
                    }`}>
                      {isWa ? <MessageSquare className="w-3 h-3 text-emerald-700" /> : <Mail className="w-3 h-3 text-blue-700" />}
                      <span>{isWa ? 'WhatsApp' : 'Email'}</span>
                    </span>

                    <h3 className="font-bold text-sm text-gray-900">{msg.customerName}</h3>
                    {isWa && msg.customerPhone ? (
                      <span className="text-xs text-emerald-800 font-mono font-medium">({msg.customerPhone})</span>
                    ) : (
                      <span className="text-xs text-gray-500 font-mono">({msg.customerEmail})</span>
                    )}

                    {top5CustomerIds.has(msg.customerId) && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                        ⭐ Top 5 Priority
                      </span>
                    )}

                    {/* Strict Status Badges (READY, APPROVED, SENDING, SENT, COPIED, FAILED) */}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      msg.status === 'ready'
                        ? 'bg-amber-100 text-amber-900 border-amber-200'
                        : msg.status === 'approved'
                        ? 'bg-blue-100 text-blue-900 border-blue-200'
                        : msg.status === 'sending'
                        ? 'bg-purple-100 text-purple-900 border-purple-300 animate-pulse'
                        : msg.status === 'sent'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : msg.status === 'copied'
                        ? 'bg-slate-100 text-slate-800 border-slate-300'
                        : msg.status === 'rejected'
                        ? 'bg-gray-100 text-gray-700 border-gray-300'
                        : 'bg-red-100 text-red-900 border-red-300'
                    }`}>
                      {msg.status === 'ready'
                        ? 'DRAFT (Ready for Review)'
                        : msg.status === 'approved'
                        ? 'APPROVED (Ready to Send)'
                        : msg.status === 'sending'
                        ? 'SENDING (Calling Provider API...)'
                        : msg.status === 'sent'
                        ? 'SENT (External Provider Confirmed)'
                        : msg.status === 'copied'
                        ? 'COPIED (Manual Dispatch)'
                        : msg.status === 'rejected'
                        ? 'REJECTED'
                        : 'FAILED'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Reason */}
                <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200/60">
                  <span className="font-semibold text-gray-700">Reason: </span>
                  <span>{msg.reason}</span>
                </div>

                {/* Content Box */}
                <div className="space-y-1 text-xs">
                  {msg.subject && (
                    <div className="font-bold text-gray-900 pb-1">
                      Subject: {msg.subject}
                    </div>
                  )}
                  <div className={`p-3.5 rounded-xl border font-sans text-xs text-gray-800 leading-relaxed whitespace-pre-wrap ${
                    isWa ? 'bg-emerald-50/40 border-emerald-100' : 'bg-blue-50/40 border-blue-100'
                  }`}>
                    {msg.content}
                  </div>
                </div>

                {/* Failure Banner when FAILED */}
                {msg.status === 'failed' && msg.failureReason && (
                  <div className="text-xs text-red-900 bg-red-50/80 border border-red-200 p-3 rounded-xl flex items-start gap-2.5">
                    <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="font-bold">Provider Send Request Failed:</p>
                      <p className="text-[11px] font-mono text-red-800 leading-relaxed">{msg.failureReason}</p>
                    </div>
                  </div>
                )}

                {/* Sent Confirmation Banner when SENT */}
                {msg.status === 'sent' && (
                  <div className="text-xs text-emerald-950 bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold">
                          Successfully Dispatched via {isWa ? 'WhatsApp Business Cloud API' : 'Resend Email API'}
                        </p>
                        {msg.sentAt && (
                          <span className="text-[10px] text-emerald-800 font-mono">
                            {new Date(msg.sentAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {msg.providerMessageId && (
                        <p className="text-[11px] font-mono text-emerald-800">
                          Provider Message ID: {msg.providerMessageId}
                        </p>
                      )}
                      <p className="text-[10px] text-emerald-700 italic pt-0.5">
                        Queued with provider. Webhook confirmation required for final delivered status.
                      </p>
                    </div>
                  </div>
                )}

                {/* Copied Notice when COPIED */}
                {msg.status === 'copied' && (
                  <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copied to clipboard for manual dispatch. Not marked as SENT until dispatched through external provider.</span>
                    </div>
                    {msg.copiedAt && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(msg.copiedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}

                {/* Configuration Notice when APPROVED */}
                {msg.status === 'approved' && !isConfigured && (
                  <div className="text-[11px] text-amber-900 bg-amber-50/80 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        {isWa ? 'WhatsApp' : 'Email'} sending is not configured yet. Server environment variables required for automated dispatch.
                      </span>
                    </div>
                    <button
                      onClick={() => setGuidanceChannel(msg.channel)}
                      className="text-amber-800 font-bold hover:underline shrink-0 text-[11px] cursor-pointer"
                    >
                      View Setup Guide
                    </button>
                  </div>
                )}

                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-2">
                    {msg.status !== 'sent' && (
                      <>
                        <button
                          onClick={() => {
                            setEditingMessage(msg);
                            setEditContent(msg.content);
                            setEditSubject(msg.subject || '');
                          }}
                          className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleRegenerate(msg)}
                          disabled={isProcessing === msg.id}
                          className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isProcessing === msg.id ? 'animate-spin' : ''}`} />
                          <span>Regenerate</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleCopy(msg)}
                      className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                      title="Copy message text to clipboard"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{msg.status === 'copied' ? 'Copy Again' : 'Copy Draft'}</span>
                    </button>

                    {!isWa && msg.customerEmail && (
                      <a
                        href={`mailto:${encodeURIComponent(msg.customerEmail)}?subject=${encodeURIComponent(msg.subject || '')}&body=${encodeURIComponent(msg.content)}`}
                        onClick={() => handleCopy(msg)}
                        className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Mail Client</span>
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* READY STATUS: APPROVE OR REJECT */}
                    {msg.status === 'ready' && (
                      <>
                        <button
                          onClick={() => handleReject(msg)}
                          disabled={isProcessing === msg.id}
                          className="px-3 py-1.5 text-red-700 hover:bg-red-50 rounded-lg font-semibold cursor-pointer"
                        >
                          Reject
                        </button>

                        <button
                          onClick={() => handleApprove(msg)}
                          disabled={isProcessing === msg.id}
                          className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        {/* Direct Approve & Send */}
                        <button
                          onClick={() => handleSendMessage(msg)}
                          disabled={isProcessing === msg.id}
                          className={`px-4 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer text-white ${
                            isWa
                              ? 'bg-emerald-600 hover:bg-emerald-700'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Approve &amp; Send</span>
                        </button>
                      </>
                    )}

                    {/* APPROVED STATUS: SEND BUTTON */}
                    {msg.status === 'approved' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendMessage(msg)}
                          disabled={isProcessing === msg.id}
                          className={`px-4 py-1.5 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all ${
                            isWa
                              ? 'bg-emerald-600 hover:bg-emerald-700'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isWa ? 'Send via WhatsApp' : 'Send via Resend'}</span>
                        </button>
                      </div>
                    )}

                    {/* SENDING STATUS: SPINNER */}
                    {msg.status === 'sending' && (
                      <span className="inline-flex items-center gap-1.5 font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-lg text-xs animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending to Provider API...</span>
                      </span>
                    )}

                    {/* COPIED STATUS: SEND PROVIDER OPTION */}
                    {msg.status === 'copied' && (
                      <button
                        onClick={() => handleSendMessage(msg)}
                        disabled={isProcessing === msg.id}
                        className={`px-3 py-1 text-white rounded-lg font-semibold flex items-center gap-1 shadow-2xs cursor-pointer text-xs ${
                          isWa
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <Send className="w-3 h-3" />
                        <span>Dispatch via {isWa ? 'WhatsApp API' : 'Resend API'}</span>
                      </button>
                    )}

                    {/* FAILED STATUS: RETRY SEND */}
                    {msg.status === 'failed' && (
                      <button
                        onClick={() => handleSendMessage(msg)}
                        disabled={isProcessing === msg.id}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer text-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Send</span>
                      </button>
                    )}

                    {/* SENT STATUS */}
                    {msg.status === 'sent' && (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-lg text-xs">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Sent via {isWa ? 'WhatsApp' : 'Resend'}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingMessage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm text-gray-900">
                Edit {editingMessage.channel.toUpperCase()} Message for {editingMessage.customerName}
              </h3>
              <button
                onClick={() => setEditingMessage(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editingMessage.channel === 'email' && (
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-gray-700">Subject:</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg text-xs font-sans"
                />
              </div>
            )}

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-gray-700">Message Body:</label>
              <textarea
                rows={6}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg text-xs leading-relaxed font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 text-xs">
              <button
                onClick={() => setEditingMessage(null)}
                className="px-3.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold shadow-2xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Outbound Configuration Guidance Modal */}
      <OutboundConfigGuidanceModal
        isOpen={Boolean(guidanceChannel)}
        channel={guidanceChannel || 'whatsapp'}
        onClose={() => setGuidanceChannel(null)}
        onNavigateToSettings={() => {
          setGuidanceChannel(null);
          if (onNavigate) onNavigate('settings');
        }}
      />
    </div>
  );
};
