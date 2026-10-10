import {
  Customer,
  AiEmployeeStatus,
  AiEmployeeSettings,
  RetentionMessage,
  Top5CustomerPriority,
  DailyRetentionBrief
} from '../types';
import { identifyTop5Priorities, generatePersonalizedDrafts } from '../utils/aiEmployeeEngine';
import { apiService } from './api';

const STORAGE_KEY_SETTINGS = 'nochurn_ai_employee_settings';
const STORAGE_KEY_MESSAGES = 'nochurn_ai_employee_messages';
const STORAGE_KEY_REPORTS = 'nochurn_ai_employee_reports';
const STORAGE_KEY_LAST_SCAN = 'nochurn_ai_employee_last_scan';
const STORAGE_KEY_LATEST_TOP5 = 'nochurn_ai_employee_latest_top5';

class AiEmployeeService {
  private status: AiEmployeeStatus = 'READY';
  private lastErrorMessage: string | null = null;
  private settings: AiEmployeeSettings;
  private messages: RetentionMessage[] = [];
  private reports: DailyRetentionBrief[] = [];
  private latestTop5: Top5CustomerPriority[] = [];
  private lastScanAt: string | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    this.settings = this.loadSettings();
    this.messages = this.loadMessages();
    this.reports = this.loadReports();
    this.latestTop5 = this.loadLatestTop5();
    this.lastScanAt = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_LAST_SCAN) : null;
    if (this.lastScanAt && this.latestTop5.length > 0) {
      this.status = 'COMPLETED';
    }
    if (typeof window !== 'undefined') {
      this.syncOutboundQueue().catch(() => {});
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }

  private loadSettings(): AiEmployeeSettings {
    const defaultSettings: AiEmployeeSettings = {
      dailyScanEnabled: true,
      scanTime: '09:00',
      timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC',
      messageTone: 'Empathetic',
      minimumRisk: 60,
      dailyPriorityCount: 5,
      ownerNotificationEmail: ''
    };

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
        if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
      } catch (e) {
        // fallback
      }
    }
    return defaultSettings;
  }

  private saveSettings(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
    }
  }

  private loadMessages(): RetentionMessage[] {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [];
  }

  private saveMessages(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(this.messages));
    }
  }

  private loadReports(): DailyRetentionBrief[] {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_REPORTS);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [];
  }

  private saveReports(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(this.reports));
    }
  }

  private loadLatestTop5(): Top5CustomerPriority[] {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_LATEST_TOP5);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [];
  }

  private saveLatestTop5(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LATEST_TOP5, JSON.stringify(this.latestTop5));
    }
  }

  public getStatus(): AiEmployeeStatus {
    return this.status;
  }

  public getLastError(): string | null {
    return this.lastErrorMessage;
  }

  public getLastScanAt(): string | null {
    return this.lastScanAt;
  }

  public getLatestTop5(): Top5CustomerPriority[] {
    return [...this.latestTop5];
  }

  public getNextScanAt(): string {
    const now = new Date();
    const [hours, minutes] = this.settings.scanTime.split(':').map(Number);
    const next = new Date();
    next.setHours(hours || 9, minutes || 0, 0, 0);
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    return next.toISOString();
  }

  public getSettings(): AiEmployeeSettings {
    return { ...this.settings };
  }

  public async updateSettings(newSettings: Partial<AiEmployeeSettings>): Promise<AiEmployeeSettings> {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.notify();
    return this.settings;
  }

  public getMessages(filterStatus?: string, filterChannel?: string): RetentionMessage[] {
    let result = [...this.messages];
    if (filterStatus && filterStatus !== 'all') {
      result = result.filter(m => m.status === filterStatus);
    }
    if (filterChannel && filterChannel !== 'all') {
      result = result.filter(m => m.channel === filterChannel);
    }
    return result;
  }

  public getReports(): DailyRetentionBrief[] {
    return [...this.reports];
  }

  /**
   * Run the AI Employee Scan workflow:
   * 1. Check for duplicate scan in progress
   * 2. Validate customer data
   * 3. Calculates priority scores (Risk 50%, Revenue 25%, Engagement 15%, Support 10%)
   * 4. Selects Top 5
   * 5. Prepares WhatsApp + Email messages in "ready" (Ready for Review) status
   * 6. Builds the Morning Retention Brief
   */
  public async runScan(customers: Customer[], ownerEmail?: string): Promise<{
    top5: Top5CustomerPriority[];
    messages: RetentionMessage[];
    report: DailyRetentionBrief;
  }> {
    // Prevent duplicate concurrent scans (Section 3)
    if (this.status === 'WORKING') {
      throw new Error('Scan in progress... Please wait for the current analysis to finish.');
    }

    if (!Array.isArray(customers) || customers.length === 0) {
      this.status = 'READY';
      this.notify();
      throw new Error('Import customers to run your first retention scan.');
    }

    this.status = 'WORKING';
    this.lastErrorMessage = null;
    this.notify();

    // Responsive delay to execute the pipeline
    await new Promise(r => setTimeout(r, 600));

    try {
      // 1. Identify Top 5 using priority formula
      const top5 = identifyTop5Priorities(customers, this.settings.messageTone, this.messages);

      // 2. Prepare drafts in "ready" (Ready for Review) status
      const now = new Date().toISOString();

      top5.forEach(priority => {
        const cust = priority.customer;

        // WhatsApp draft
        const existingWa = this.messages.find(m => m.customerId === cust.id && m.channel === 'whatsapp');
        if (!existingWa) {
          const waMsg: RetentionMessage = {
            id: `msg-wa-${cust.id}-${Date.now()}`,
            customerId: cust.id,
            customerName: cust.name || cust.company_name || 'Customer',
            companyName: cust.company_name,
            customerEmail: cust.email,
            customerPhone: (cust as any).phone || (cust as any).customerPhone || '',
            channel: 'whatsapp',
            content: priority.whatsappDraft,
            reason: priority.whyAtRisk,
            status: 'ready',
            createdAt: now,
            mrrProtected: priority.revenueAtRisk,
            deliveryStatus: 'not_connected'
          };
          this.messages.unshift(waMsg);
        }

        // Email draft
        const existingEmail = this.messages.find(m => m.customerId === cust.id && m.channel === 'email');
        if (!existingEmail) {
          const emailMsg: RetentionMessage = {
            id: `msg-em-${cust.id}-${Date.now()}`,
            customerId: cust.id,
            customerName: cust.name || cust.company_name || 'Customer',
            companyName: cust.company_name,
            customerEmail: cust.email,
            channel: 'email',
            subject: priority.emailSubject,
            content: priority.emailDraft,
            reason: priority.whyAtRisk,
            status: 'ready',
            createdAt: now,
            mrrProtected: priority.revenueAtRisk,
            deliveryStatus: 'not_connected'
          };
          this.messages.unshift(emailMsg);
        }
      });

      this.saveMessages();

      // 3. Save single authoritative Top 5
      this.latestTop5 = top5;
      this.saveLatestTop5();

      // 4. Calculate brief metrics strictly from actual data (Requirement 8)
      const atRiskList = customers.filter(c => (c.risk_score ?? c.riskScore ?? 0) >= (this.settings.minimumRisk || 60));
      const revenueAtRisk = atRiskList.reduce((acc, c) => acc + (c.mrr || 0), 0);
      const readyCount = this.messages.filter(m => m.status === 'ready').length;
      const queuedCount = this.messages.filter(m => m.status === 'queued').length;
      const sentCount = this.messages.filter(m => m.status === 'sent').length;
      const failedCount = this.messages.filter(m => m.status === 'failed').length;
      const recoveredCount = customers.filter(c => c.status === 'saved' || c.outcomeStatus === 'recovered').length;

      const report: DailyRetentionBrief = {
        id: `brief-${Date.now()}`,
        date: now,
        status: 'COMPLETED',
        customersAnalyzed: customers.length,
        customersAtRisk: atRiskList.length,
        revenueAtRisk,
        top5,
        messagesReady: readyCount,
        messagesAwaitingApproval: readyCount,
        messagesQueued: queuedCount,
        messagesSent: sentCount,
        messagesFailed: failedCount,
        customersRecovered: recoveredCount,
        ownerNotified: false,
        ownerNotificationEmail: ownerEmail || this.settings.ownerNotificationEmail || '',
        ownerNotificationStatus: 'pending_credentials',
        createdAt: now
      };

      // Add report to history (max 15)
      this.reports = [report, ...this.reports.slice(0, 14)];
      this.saveReports();

      this.lastScanAt = now;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_LAST_SCAN, now);
      }

      this.status = 'COMPLETED';
      this.lastErrorMessage = null;
      this.notify();

      // Automatically attempt owner brief notification without blocking UI
      if (report.ownerNotificationEmail) {
        this.sendOwnerBrief(report.ownerNotificationEmail).catch(() => {});
      }

      return { top5, messages: this.messages, report };
    } catch (err: any) {
      console.error('[AI Employee Error] Scan failed:', err);
      this.status = 'ERROR';
      this.lastErrorMessage = err?.message || 'AI retention scan could not be completed.';
      this.notify();
      throw err;
    }
  }

  /**
   * Approves a retention message draft:
   * 1. Marks status APPROVED (with approvedAt timestamp).
   * 2. Automatically enqueues into backend sending queue (Requirement 3 & 7).
   * 3. Backend queue automatically calls WhatsApp/Resend provider.
   *    If configured: transitions to SENT (or FAILED).
   *    If NOT configured: stays in QUEUED state with note (never faking sent).
   */
  public async approveMessage(messageId: string): Promise<RetentionMessage> {
    const idx = this.messages.findIndex(m => m.id === messageId);
    if (idx === -1) throw new Error('Message not found');

    const now = new Date().toISOString();
    this.messages[idx].status = 'approved';
    this.messages[idx].approvedAt = now;
    this.saveMessages();
    this.syncTop5DraftStatus(this.messages[idx].customerId);
    this.notify();

    // Enqueue message into reliable backend sending queue
    try {
      const enqueueRes = await apiService.enqueueRetentionMessages([{
        messageId: this.messages[idx].id,
        channel: this.messages[idx].channel,
        customerId: this.messages[idx].customerId,
        customerName: this.messages[idx].customerName,
        recipientPhone: this.messages[idx].customerPhone,
        recipientEmail: this.messages[idx].customerEmail,
        subject: this.messages[idx].subject,
        content: this.messages[idx].content,
        isApproved: true
      }]);

      if (enqueueRes.items && enqueueRes.items.length > 0) {
        const item = enqueueRes.items[0];
        if (item.status === 'SENT') {
          this.messages[idx].status = 'sent';
          this.messages[idx].sentAt = item.sentAt || now;
          this.messages[idx].providerMessageId = item.providerMessageId;
          this.messages[idx].failureReason = undefined;
        } else if (item.status === 'FAILED') {
          this.messages[idx].status = 'failed';
          this.messages[idx].failedAt = item.failedAt || now;
          this.messages[idx].failureReason = item.error;
        } else if (item.status === 'QUEUED') {
          this.messages[idx].status = 'queued';
          this.messages[idx].queuedAt = item.queuedAt || now;
          this.messages[idx].failureReason = item.error;
        }
        this.saveMessages();
        this.syncTop5DraftStatus(this.messages[idx].customerId);
        this.notify();
      }
    } catch (err: any) {
      console.warn('[Queue enqueue error]:', err?.message);
    }

    return this.messages[idx];
  }

  /**
   * Approves all ready message drafts in batch and enqueues them into sending queue.
   */
  public async approveAll(channel?: 'whatsapp' | 'email'): Promise<{ approvedCount: number }> {
    const readyMessages = this.messages.filter(m => m.status === 'ready' && (!channel || m.channel === channel));
    if (readyMessages.length === 0) return { approvedCount: 0 };

    const now = new Date().toISOString();
    readyMessages.forEach(m => {
      m.status = 'approved';
      m.approvedAt = now;
    });

    this.saveMessages();
    this.notify();

    // Enqueue in batch
    try {
      const enqueueRes = await apiService.enqueueRetentionMessages(readyMessages.map(m => ({
        messageId: m.id,
        channel: m.channel,
        customerId: m.customerId,
        customerName: m.customerName,
        recipientPhone: m.customerPhone,
        recipientEmail: m.customerEmail,
        subject: m.subject,
        content: m.content,
        isApproved: true
      })));

      if (enqueueRes.items) {
        enqueueRes.items.forEach(item => {
          const m = this.messages.find(msg => msg.id === item.messageId);
          if (m) {
            if (item.status === 'SENT') {
              m.status = 'sent';
              m.sentAt = item.sentAt || now;
              m.providerMessageId = item.providerMessageId;
              m.failureReason = undefined;
            } else if (item.status === 'FAILED') {
              m.status = 'failed';
              m.failedAt = item.failedAt || now;
              m.failureReason = item.error;
            } else if (item.status === 'QUEUED') {
              m.status = 'queued';
              m.queuedAt = item.queuedAt || now;
              m.failureReason = item.error;
            }
          }
        });
        this.saveMessages();
        this.notify();
      }
    } catch (err) {
      console.warn('[Batch enqueue error]:', err);
    }

    return { approvedCount: readyMessages.length };
  }

  public async rejectMessage(messageId: string): Promise<RetentionMessage> {
    const idx = this.messages.findIndex(m => m.id === messageId);
    if (idx === -1) throw new Error('Message not found');

    this.messages[idx].status = 'rejected';
    this.saveMessages();

    // Synchronize Top 5 status
    this.syncTop5DraftStatus(this.messages[idx].customerId);

    this.notify();
    return this.messages[idx];
  }

  public async editMessage(messageId: string, newContent: string, newSubject?: string): Promise<RetentionMessage> {
    const idx = this.messages.findIndex(m => m.id === messageId);
    if (idx === -1) throw new Error('Message not found');

    this.messages[idx].content = newContent;
    if (newSubject !== undefined) {
      this.messages[idx].subject = newSubject;
    }
    this.saveMessages();

    // Update in latestTop5
    const msg = this.messages[idx];
    const topIdx = this.latestTop5.findIndex(t => t.customer.id === msg.customerId);
    if (topIdx >= 0) {
      if (msg.channel === 'whatsapp') {
        this.latestTop5[topIdx].whatsappDraft = newContent;
      } else {
        this.latestTop5[topIdx].emailDraft = newContent;
        if (newSubject) this.latestTop5[topIdx].emailSubject = newSubject;
      }
      this.saveLatestTop5();
    }

    this.notify();
    return this.messages[idx];
  }

  public async regenerateMessage(messageId: string, customer: Customer): Promise<RetentionMessage> {
    const idx = this.messages.findIndex(m => m.id === messageId);
    if (idx === -1) throw new Error('Message not found');

    const msg = this.messages[idx];
    const drafts = generatePersonalizedDrafts(
      customer,
      'Personal Check-in',
      this.settings.messageTone === 'Direct' ? 'Empathetic' : 'Direct'
    );

    if (msg.channel === 'whatsapp') {
      msg.content = drafts.whatsappDraft;
    } else {
      msg.subject = drafts.emailSubject;
      msg.content = drafts.emailDraft;
    }

    // Reset status to ready for review
    msg.status = 'ready';
    this.saveMessages();

    // Update in latestTop5
    const topIdx = this.latestTop5.findIndex(t => t.customer.id === customer.id);
    if (topIdx >= 0) {
      if (msg.channel === 'whatsapp') {
        this.latestTop5[topIdx].whatsappDraft = drafts.whatsappDraft;
        this.latestTop5[topIdx].whatsappDraftStatus = 'ready';
      } else {
        this.latestTop5[topIdx].emailSubject = drafts.emailSubject;
        this.latestTop5[topIdx].emailDraft = drafts.emailDraft;
        this.latestTop5[topIdx].emailDraftStatus = 'ready';
      }
      this.saveLatestTop5();
    }

    this.notify();
    return msg;
  }

  /**
   * Records that message was copied for manual dispatch (Sections 6 & 7)
   */
  public async markCopied(messageId: string): Promise<RetentionMessage> {
    const idx = this.messages.findIndex(m => m.id === messageId);
    if (idx === -1) throw new Error('Message not found');

    const msg = this.messages[idx];
    msg.status = 'copied';
    msg.copiedAt = new Date().toISOString();
    msg.deliveryStatus = 'not_connected';

    this.saveMessages();
    this.syncTop5DraftStatus(msg.customerId);
    this.notify();
    return msg;
  }

  /**
   * Dispatches an approved retention message through real WhatsApp Business Cloud API or Resend Email API.
   * Strict status progression: READY -> APPROVED -> SENDING -> SENT (or FAILED).
   * Never fakes delivery.
   */
  public async sendMessage(messageId: string): Promise<{ success: boolean; message: RetentionMessage; deliveryStatus: string; error?: string }> {
    const idx = this.messages.findIndex(m => m.id === messageId);
    if (idx === -1) throw new Error('Message not found');

    const msg = this.messages[idx];

    // 1. Require message approval before sending (Requirement 1 & 2)
    if (msg.status !== 'approved') {
      throw new Error('Message must be approved before sending. Please click Approve first.');
    }

    // 2. Set to SENDING state while provider call is in flight (Requirement 5)
    msg.status = 'sending';
    this.saveMessages();
    this.syncTop5DraftStatus(msg.customerId);
    this.notify();

    try {
      const sendRes = await apiService.sendRetentionMessage({
        messageId: msg.id,
        channel: msg.channel,
        recipientEmail: msg.customerEmail,
        recipientPhone: msg.customerPhone,
        subject: msg.subject,
        content: msg.content,
        customerId: msg.customerId,
        customerName: msg.customerName,
        isApproved: true
      });

      if (sendRes.success && sendRes.status === 'SENT') {
        msg.status = 'sent';
        msg.sentAt = sendRes.sentAt || new Date().toISOString();
        msg.providerMessageId = sendRes.providerMessageId;
        msg.deliveryStatus = 'queued'; // Queued with provider; only marked 'delivered' when confirmed by webhook
        msg.failureReason = undefined;

        this.saveMessages();
        this.syncTop5DraftStatus(msg.customerId);
        this.notify();

        return {
          success: true,
          message: msg,
          deliveryStatus: 'queued'
        };
      } else {
        msg.status = 'failed';
        msg.failedAt = new Date().toISOString();
        msg.failureReason = sendRes.error || 'Provider rejected message send';
        msg.deliveryStatus = 'failed';

        this.saveMessages();
        this.syncTop5DraftStatus(msg.customerId);
        this.notify();

        return {
          success: false,
          message: msg,
          deliveryStatus: 'failed',
          error: msg.failureReason
        };
      }
    } catch (err: any) {
      msg.status = 'failed';
      msg.failedAt = new Date().toISOString();
      msg.failureReason = err?.message || 'Network error communicating with outbound dispatch server';
      msg.deliveryStatus = 'failed';

      this.saveMessages();
      this.syncTop5DraftStatus(msg.customerId);
      this.notify();

      return {
        success: false,
        message: msg,
        deliveryStatus: 'failed',
        error: msg.failureReason
      };
    }
  }

  public async sendOwnerBrief(email?: string): Promise<{ success: boolean; message: string; status: 'sent' | 'pending_credentials' | 'failed' }> {
    const targetEmail = email || this.settings.ownerNotificationEmail || 'owner@company.com';
    let briefStatus: 'sent' | 'pending_credentials' | 'failed' = 'pending_credentials';
    let briefMsg = `Daily Retention Brief prepared for ${targetEmail}. Email integration is not configured yet.`;

    try {
      const serverRes = await apiService.triggerDailyCronScan(targetEmail);
      if (serverRes && serverRes.brief) {
        briefStatus = serverRes.brief.ownerNotificationStatus || 'pending_credentials';
        briefMsg = serverRes.brief.ownerNotificationMessage || serverRes.message || briefMsg;
      }
    } catch {
      // Offline fallback
    }

    if (this.reports.length > 0) {
      this.reports[0].ownerNotificationEmail = targetEmail;
      this.reports[0].ownerNotified = briefStatus === 'sent';
      this.reports[0].ownerNotificationStatus = briefStatus;
      this.saveReports();
      this.notify();
    }

    return {
      success: briefStatus === 'sent',
      status: briefStatus,
      message: briefMsg
    };
  }

  private syncTop5DraftStatus(customerId: string): void {
    const topIdx = this.latestTop5.findIndex(t => t.customer.id === customerId);
    if (topIdx >= 0) {
      const wa = this.messages.find(m => m.customerId === customerId && m.channel === 'whatsapp');
      const em = this.messages.find(m => m.customerId === customerId && m.channel === 'email');

      const waStatus = (wa?.status as any) || 'ready';
      const emStatus = (em?.status as any) || 'ready';

      this.latestTop5[topIdx].whatsappDraftStatus = waStatus;
      this.latestTop5[topIdx].emailDraftStatus = emStatus;

      if (waStatus === 'sent' && emStatus === 'sent') {
        this.latestTop5[topIdx].messageStatus = 'sent';
      } else if (waStatus === 'sending' || emStatus === 'sending') {
        this.latestTop5[topIdx].messageStatus = 'sending';
      } else if (waStatus === 'queued' || emStatus === 'queued') {
        this.latestTop5[topIdx].messageStatus = 'queued';
      } else if (waStatus === 'failed' && emStatus === 'failed') {
        this.latestTop5[topIdx].messageStatus = 'failed';
      } else if (waStatus === 'copied' || emStatus === 'copied') {
        this.latestTop5[topIdx].messageStatus = 'copied';
      } else if (waStatus === 'approved' || emStatus === 'approved') {
        this.latestTop5[topIdx].messageStatus = 'approved';
      } else {
        this.latestTop5[topIdx].messageStatus = 'ready';
      }

      this.saveLatestTop5();
    }
  }

  /**
   * Synchronizes local message statuses with the backend outbound sending queue.
   */
  public async syncOutboundQueue(): Promise<void> {
    try {
      const res = await apiService.fetchQueueItems();
      if (res && res.items && Array.isArray(res.items)) {
        let changed = false;
        res.items.forEach((item: any) => {
          const m = this.messages.find(msg => msg.id === item.messageId);
          if (m) {
            const targetStatus = item.status.toLowerCase();
            if (m.status !== targetStatus && (targetStatus === 'sent' || targetStatus === 'failed' || targetStatus === 'queued' || targetStatus === 'sending')) {
              m.status = targetStatus as any;
              if (item.sentAt) m.sentAt = item.sentAt;
              if (item.failedAt) m.failedAt = item.failedAt;
              if (item.providerMessageId) m.providerMessageId = item.providerMessageId;
              if (item.error) m.failureReason = item.error;
              changed = true;
            }
          }
        });
        if (changed) {
          this.saveMessages();
          this.messages.forEach(m => this.syncTop5DraftStatus(m.customerId));
          this.notify();
        }
      }
    } catch {
      // offline fallback
    }
  }
}

export const aiEmployeeService = new AiEmployeeService();
