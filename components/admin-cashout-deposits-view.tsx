'use client';

import { Banknote, CheckCircle2, ExternalLink } from 'lucide-react';
import { reviewCashoutDepositRequestAction } from '@/app/(admin)/admin/actions';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { useLanguage } from '@/components/language-provider';
import { dateText, money } from '@/lib/format';
import type { UserCashoutDeposit } from '@/lib/types';

export function AdminCashoutDepositsView({ items }: { items: UserCashoutDeposit[] }) {
  const { t, locale } = useLanguage();
  return <>
    <div className="section-head"><div><h1 className="section-title">{t('cashoutDepositRequests')}</h1><p className="muted">{t('oneTimeDepositAdminHelp')}</p></div></div>
    {items.length ? <div className="admin-deposit-request-list">{items.map((item) => <article className="card" key={item.user_id}><div className="card-body">
      <div className="admin-profile-head">
        <div className="list-meta"><div className="list-icon"><Banknote size={21}/></div><div><div className="list-title">{item.profiles?.full_name || item.profiles?.email || 'User'}</div><div className="list-subtitle">{item.profiles?.phone || '—'} · {dateText(item.updated_at, locale)}</div></div></div>
        <StatusBadge status={item.status}/>
      </div>

      <div className="admin-deposit-request-summary">
        <div><span>{t('depositAmount')}</span><strong>{money(item.deposit_amount, locale)}</strong></div>
        {item.loan_applications ? <div><span>{t('approvedLoan')}</span><strong>{money(item.loan_applications.approved_amount || item.loan_applications.requested_amount, locale)}</strong></div> : null}
        {item.loan_applications ? <div><span>{t('loanInfo')}</span><strong>{item.loan_applications.application_no}</strong></div> : null}
        {item.payment_method ? <div><span>{t('paymentMethod')}</span><strong>{item.payment_method}</strong></div> : null}
        {item.receiver_reference ? <div><span>{t('receiverReference')}</span><strong>{item.receiver_reference}</strong></div> : null}
        {item.transaction_id ? <div><span>{t('transactionId')}</span><strong>{item.transaction_id}</strong></div> : null}
      </div>

      {item.status === 'submitted' ? <form action={reviewCashoutDepositRequestAction} className="form-grid admin-payment-review">
        <input type="hidden" name="user_id" value={item.user_id}/>
        {item.payment_screenshot_url ? <a className="payment-proof-note payment-proof-link" href={item.payment_screenshot_url} target="_blank" rel="noreferrer"><CheckCircle2 size={18}/><span>{t('paymentProofUploaded')}</span><ExternalLink size={15}/></a> : null}
        <div className="field"><label>{t('adminNote')}</label><textarea className="textarea" name="admin_note"/></div>
        <div className="admin-review-actions"><button className="primary-btn" name="decision" value="verify_payment"><CheckCircle2 size={18}/>{t('verifyPayment')}</button><button className="danger-btn" name="decision" value="reject_payment">{t('rejectPayment')}</button></div>
      </form> : null}

      {item.status === 'verified' ? <div className="deposit-status-admin verified"><CheckCircle2 size={20}/><span>{t('depositVerifiedOnce')}</span></div> : null}
      {item.status === 'payment_rejected' ? <div className="alert error" style={{marginTop:16}}>{item.admin_note || t('paymentRejected')}</div> : null}
    </div></article>)}</div> : <div className="card"><EmptyState/></div>}
  </>;
}
