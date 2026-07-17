'use client';

import { Banknote, CheckCircle2, ExternalLink, ShieldAlert } from 'lucide-react';
import { reviewCashoutAction, reviewCashoutDepositRequestAction } from '@/app/(admin)/admin/actions';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { useLanguage } from '@/components/language-provider';
import { dateText, money } from '@/lib/format';
import type { Cashout, UserCashoutDeposit } from '@/lib/types';

export function AdminCashoutsView({ items, depositItems }: { items: Cashout[]; depositItems: UserCashoutDeposit[] }) {
  const { t, locale } = useLanguage();

  return <>
    <div className="section-head">
      <div>
        <h1 className="section-title">{t('manageCashouts')}</h1>
        <p className="muted">{t('manageCashoutsHelp')}</p>
      </div>
    </div>

    <section className="section admin-cashout-deposit-section">
      <div className="section-head">
        <div>
          <h2 className="section-title">{t('firstCashoutDepositPayments')}</h2>
          <p className="muted small">{t('firstCashoutDepositHelp')}</p>
        </div>
      </div>

      {depositItems.length ? <div className="admin-deposit-request-list">
        {depositItems.map((item) => <article className="card" key={item.user_id}>
          <div className="card-body">
            <div className="admin-profile-head">
              <div className="list-meta">
                <div className="list-icon"><Banknote size={21} /></div>
                <div>
                  <div className="list-title">{item.profiles?.full_name || item.profiles?.email || 'User'}</div>
                  <div className="list-subtitle">{item.profiles?.phone || '—'} · {dateText(item.updated_at, locale)}</div>
                </div>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <div className="admin-deposit-request-summary">
              <div><span>{t('depositAmount')}</span><strong>{money(item.deposit_amount, locale)}</strong></div>
              {item.loan_applications ? <div><span>{t('approvedLoan')}</span><strong>{money(item.loan_applications.approved_amount || item.loan_applications.requested_amount, locale)}</strong></div> : null}
              <div><span>{t('paymentMethod')}</span><strong>{item.payment_method || '—'}</strong></div>
              <div><span>{t('receiverReference')}</span><strong>{item.receiver_reference || '—'}</strong></div>
              <div><span>{t('transactionId')}</span><strong>{item.transaction_id || '—'}</strong></div>
            </div>

            {item.status === 'submitted' ? <form action={reviewCashoutDepositRequestAction} className="form-grid admin-payment-review">
              <input type="hidden" name="user_id" value={item.user_id} />
              {item.payment_screenshot_url ? (
                <a className="payment-proof-note payment-proof-link" href={item.payment_screenshot_url} target="_blank" rel="noreferrer">
                  <CheckCircle2 size={18} /><span>{t('paymentProofUploaded')}</span><ExternalLink size={15} />
                </a>
              ) : (
                <div className="payment-proof-note"><ShieldAlert size={18} /><span>{t('noDepositProofDirectConfirm')}</span></div>
              )}
              <div className="field"><label>{t('adminNote')}</label><textarea className="textarea" name="admin_note" /></div>
              <div className="admin-review-actions">
                <button className="primary-btn" name="decision" value="verify_payment"><CheckCircle2 size={18} />{t('approveDeposit')}</button>
                <button className="danger-btn" name="decision" value="reject_payment">{t('rejectPayment')}</button>
              </div>
            </form> : null}

            {item.status === 'verified' ? (
              <div className="deposit-status-admin verified"><CheckCircle2 size={20} /><span>{t('depositVerifiedOnce')}</span></div>
            ) : null}
            {item.status === 'payment_rejected' ? (
              <div className="alert error" style={{ marginTop: 16 }}>{item.admin_note || t('paymentRejected')}</div>
            ) : null}
          </div>
        </article>)}
      </div> : <div className="card"><EmptyState /></div>}
    </section>

    <section className="section">
      <div className="section-head">
        <div>
          <h2 className="section-title">{t('cashoutRequests')}</h2>
          <p className="muted small">{t('cashoutRequestsAdminHelp')}</p>
        </div>
      </div>

      {items.length ? <div style={{ display: 'grid', gap: 14 }}>
        {items.map((item) => {
          const depositVerified = Boolean(item.profiles?.cashout_deposit_verified_at);
          return <article className="card" key={item.id}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start' }}>
                <div>
                  <div className="list-title">{item.profiles?.full_name || item.profiles?.email || 'User'} · {item.loan_applications?.application_no}</div>
                  <div className="list-subtitle">{item.payment_method} · {dateText(item.created_at, locale)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>{money(item.requested_amount, locale)}</strong>
                  <div style={{ marginTop: 5 }}><StatusBadge status={item.status} /></div>
                </div>
              </div>

              <div className={`cashout-admin-deposit-state ${depositVerified ? 'verified' : 'blocked'}`}>
                {depositVerified ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
                <span>{depositVerified ? t('oneTimeDepositVerifiedAdmin') : t('oneTimeDepositApprovalBlocked')}</span>
              </div>

              <form action={reviewCashoutAction} className="form-grid" style={{ marginTop: 16 }}>
                <input type="hidden" name="cashout_id" value={item.id} />
                <div className="field"><label>{t('adminNote')}</label><input className="input" name="admin_note" defaultValue={item.admin_note || ''} /></div>
                <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                  <button className="secondary-btn" name="decision" value="approve" disabled={!depositVerified}>{t('approve')}</button>
                  <button className="primary-btn" name="decision" value="complete" disabled={!depositVerified}>{t('complete')}</button>
                  <button className="danger-btn" name="decision" value="reject">{t('reject')}</button>
                </div>
              </form>
            </div>
          </article>;
        })}
      </div> : <div className="card"><EmptyState /></div>}
    </section>
  </>;
}
