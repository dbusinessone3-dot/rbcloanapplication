'use client';

import { CheckCircle2, ExternalLink, ReceiptText, XCircle } from 'lucide-react';
import { reviewLoanApplicationPaymentAction } from '@/app/(admin)/admin/actions';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { useLanguage } from '@/components/language-provider';
import { dateText, money } from '@/lib/format';
import type { LoanApplicationPayment } from '@/lib/types';

export function AdminApplicationPaymentsView({ items }: { items: LoanApplicationPayment[] }) {
  const { t, locale } = useLanguage();

  return <>
    <div className="section-head">
      <div>
        <h1 className="section-title">{t('applicationPayments')}</h1>
        <p className="muted">{t('applicationPaymentsAdminHelp')}</p>
      </div>
    </div>

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
            <div><span>{t('requiredSavings')}</span><strong>{money(item.expected_amount, locale)}</strong></div>
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
  </>;
}
