'use client';

import { CheckCircle2, ExternalLink, ReceiptText, XCircle } from 'lucide-react';
import { reviewLoanApplicationPaymentAction } from '@/app/(admin)/admin/actions';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { useLanguage } from '@/components/language-provider';
import { dateText, money } from '@/lib/format';
import type { LoanApplicationPayment } from '@/lib/types';

export function AdminApplicationPaymentsView({ items, loadError }: { items: LoanApplicationPayment[]; loadError?: string | null }) {
  const { t, locale } = useLanguage();
  const pendingCount = items.filter((item) => item.status === 'submitted').length;

  return <div className="admin-page-stack">
    <div className="admin-page-intro">
      <div><span>Application payment review</span><h1>{t('applicationPayments')}</h1><p>{t('applicationPaymentsAdminHelp')}</p></div>
      <div className="admin-intro-count"><strong>{pendingCount}</strong><span>Pending approval</span></div>
    </div>

    {loadError ? <div className="alert error admin-setup-alert"><strong>Application payment data could not be loaded.</strong><span>{loadError}</span><small>Run <code>supabase/patch-v15-create-loan-application-payments-and-reload.sql</code> in Supabase SQL Editor, then refresh this page.</small></div> : null}

    {!loadError && pendingCount > 0 ? <div className="alert success admin-payment-queue-alert"><strong>{pendingCount} application fee payment{pendingCount === 1 ? '' : 's'} waiting for approval.</strong><span>Open each payment proof, review the transaction, then approve or reject it.</span></div> : null}

    {items.length ? <div className="admin-deposit-request-list">
      {items.map((item) => <article className="card" key={item.id}>
        <div className="card-body">
          <div className="admin-profile-head">
            <div className="list-meta">
              <div className="list-icon"><ReceiptText size={20}/></div>
              <div>
                <div className="list-title">{item.profiles?.full_name || item.profiles?.email || 'User'}</div>
                <div className="list-subtitle">{item.profiles?.phone || '—'} • {dateText(item.created_at, locale)}</div>
              </div>
            </div>
            <StatusBadge status={item.status}/>
          </div>

          <div className="admin-deposit-request-summary">
            <div><span>{t('requestedLoanAmount')}</span><strong>{money(item.requested_amount, locale)}</strong></div>
            <div><span>{t('applicationFeeAmount')}</span><strong>{money(item.expected_amount, locale)}</strong></div>
            <div><span>{t('paymentMethod')}</span><strong>{item.payment_method}</strong></div>
            <div><span>{t('receiverReference')}</span><strong>{item.receiver_reference || '—'}</strong></div>
            <div><span>{t('transactionId')}</span><strong>{item.transaction_id}</strong></div>
          </div>

          {item.payment_screenshot_url ? <a className="payment-proof-note payment-proof-link" href={item.payment_screenshot_url} target="_blank" rel="noreferrer">
            <CheckCircle2 size={18}/><span>{t('paymentProofUploaded')}</span><ExternalLink size={15}/>
          </a> : null}

          {item.status === 'submitted' ? <form action={reviewLoanApplicationPaymentAction} className="form-grid admin-payment-review">
            <input type="hidden" name="payment_id" value={item.id}/>
            <div className="field"><label>{t('adminNote')}</label><textarea className="textarea" name="admin_note"/></div>
            <div className="admin-review-actions">
              <button className="primary-btn" name="decision" value="approve"><CheckCircle2 size={18}/>{t('approve')}</button>
              <button className="danger-btn" name="decision" value="reject"><XCircle size={18}/>{t('reject')}</button>
            </div>
          </form> : null}

          {item.status === 'verified' ? <div className="deposit-status-admin verified"><CheckCircle2 size={20}/><span>{t('paymentApprovedSubmitUnlocked')}</span></div> : null}
          {item.status === 'rejected' ? <div className="alert error" style={{marginTop:16}}>{item.admin_note || t('paymentRejected')}</div> : null}
          {item.status === 'used' ? <div className="alert success" style={{marginTop:16}}>{t('paymentUsedForApplication')}</div> : null}
        </div>
      </article>)}
    </div> : <div className="card"><EmptyState/></div>}
  </div>;
}
