'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { Building2, CalendarDays, FileCheck2, HandCoins, ReceiptText, Send, ShieldCheck, Smartphone } from 'lucide-react';
import { depositAction } from '@/app/(user)/actions';
import { ActionMessage } from '@/components/action-message';
import { SubmitButton } from '@/components/submit-button';
import { StatusBadge } from '@/components/status-badge';
import { useLanguage } from '@/components/language-provider';
import { dateText, money } from '@/lib/format';
import type { ActionState, Installment, LoanApplication } from '@/lib/types';

const initial: ActionState = { ok: false, message: '' };

const paymentOptions = [
  { value: 'bkash', label: 'bKash', icon: Smartphone },
  { value: 'nagad', label: 'Nagad', icon: Smartphone },
  { value: 'rocket', label: 'Rocket', icon: Send },
  { value: 'bank', label: 'Bank', icon: Building2 },
] as const;

export function LoanDetailView({ loan, installments }: { loan: LoanApplication; installments: Installment[] }) {
  const { t, locale } = useLanguage();
  const [state, action] = useActionState(depositAction, initial);
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentOptions)[number]['value']>('bkash');
  const canDeposit = ['deposit_pending', 'approved', 'submitted', 'under_review'].includes(loan.status);
  const isApproved = ['approved', 'cashout_requested', 'cashout_completed', 'running', 'completed'].includes(loan.status);
  const isRejected = loan.status === 'rejected';

  const summaryCards = useMemo(
    () => [
      { label: t('approvedLoan'), value: money(loan.approved_amount || loan.requested_amount, locale), tone: 'sky' },
      { label: t('requiredSavings'), value: money(loan.required_savings_amount, locale), tone: 'green' },
      { label: t('monthlyInstallment'), value: money(loan.monthly_installment, locale), tone: 'pink' },
      { label: t('totalPayable'), value: money(loan.total_payable, locale), tone: 'amber' },
    ],
    [loan, locale, t],
  );

  return (
    <div className="page-stack">
      <div className="section-head loan-page-head">
        <div>
          <div className="muted small">{loan.application_no}</div>
          <h1 className="section-title">{t('loanInfo')}</h1>
        </div>
        <StatusBadge status={loan.status} />
      </div>

      {isApproved ? <section className="user-loan-decision approved"><ShieldCheck size={28}/><div><strong>Your loan application is approved</strong><p>Admin review is complete. You can view the approved amount and continue to cash out.</p></div><StatusBadge status={loan.status}/></section> : null}
      {!isApproved && !isRejected ? <section className="user-loan-decision waiting"><CalendarDays size={28}/><div><strong>Application under admin review</strong><p>Your application was submitted successfully. You will receive a notification when an admin approves or rejects it.</p></div><StatusBadge status={loan.status}/></section> : null}
      {isRejected ? <section className="user-loan-decision rejected"><FileCheck2 size={28}/><div><strong>Application was not approved</strong><p>{loan.rejection_reason || 'Please review the admin feedback.'}</p></div><StatusBadge status={loan.status}/></section> : null}

      <section className="mobile-summary-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className={`mini-summary-card ${card.tone}`}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="content-grid loan-detail-layout">
        <div className="card mobile-look-card">
          <div className="card-header mobile-card-header">
            <div>
              <div className="mobile-card-kicker">{t('details')}</div>
              <h2 className="section-title">{t('loanInfo')}</h2>
            </div>
            {isApproved ? <Link href={`/loan/cashout?loan=${loan.id}`} className="primary-btn">{t('cashout')}</Link> : <span className="secondary-btn loan-review-pill">{loan.status === 'under_review' ? t('underReview') : t('submitted')}</span>}
          </div>
          <div className="card-body summary-list">
            <div className="summary-row"><span className="muted">{t('amount')}</span><strong>{money(loan.approved_amount || loan.requested_amount, locale)}</strong></div>
            <div className="summary-row"><span className="muted">{t('duration')}</span><strong>{loan.duration_months} {t('months')}</strong></div>
            <div className="summary-row"><span className="muted">{t('monthlyIncome')}</span><strong>{money(loan.monthly_income, locale)}</strong></div>
            <div className="summary-row"><span className="muted">{t('monthlyInstallment')}</span><strong>{money(loan.monthly_installment, locale)}</strong></div>
            <div className="summary-row"><span className="muted">{t('requiredSavings')}</span><strong>{money(loan.required_savings_amount, locale)}</strong></div>
            <div className="summary-row"><span className="muted">{t('totalPayable')}</span><strong>{money(loan.total_payable, locale)}</strong></div>
            <div className="summary-row"><span className="muted">{t('purpose')}</span><strong>{loan.loan_purpose || '—'}</strong></div>
            <div className="summary-row"><span className="muted">{t('submitted')}</span><strong>{dateText(loan.submitted_at || loan.created_at, locale)}</strong></div>
            {loan.admin_note ? <div className="alert success">{loan.admin_note}</div> : null}
            {loan.rejection_reason ? <div className="alert error">{loan.rejection_reason}</div> : null}

            <div className="progress-row mobile-progress-row">
              <div className="progress-step done"><div className="progress-dot"><FileCheck2 size={16} /></div>{t('submitted')}</div>
              <div className={`progress-step ${['approved', 'cashout_requested', 'cashout_completed', 'running', 'completed'].includes(loan.status) ? 'done' : ''}`}><div className="progress-dot"><HandCoins size={16} /></div>{t('approved')}</div>
              <div className={`progress-step ${['running', 'completed'].includes(loan.status) ? 'done' : ''}`}><div className="progress-dot"><ReceiptText size={16} /></div>{t('running')}</div>
              <div className={`progress-step ${loan.status === 'completed' ? 'done' : ''}`}><div className="progress-dot"><CalendarDays size={16} /></div>{t('completed')}</div>
            </div>

            <div className="detail-action-row">
              {isApproved ? <><Link href={`/loan/cashout?loan=${loan.id}`} className="primary-btn">{t('cashout')}</Link><Link href="/installments" className="secondary-btn">{t('installments')}</Link></> : <Link href="/notifications" className="secondary-btn">View notifications</Link>}
            </div>
          </div>
        </div>

        <aside className="form-card payment-proof-card" style={{ alignSelf: 'start' }}>
          <div className="payment-proof-head">
            <div className="payment-proof-icon"><ShieldCheck size={22} /></div>
            <div>
              <h2 className="section-title">Deposit / savings proof</h2>
              <p className="muted small">{loan.application_payment_id ? t('paymentApprovedHelp') : 'Submit the required savings payment for admin verification.'}</p>
            </div>
          </div>

          <div className="deposit-highlight-card">
            <span>{t('requiredSavings')}</span>
            <strong>{money(loan.required_savings_amount, locale)}</strong>
            <small>{t('deposit')} • {loan.application_payment_id ? t('approved') : t('pending')}</small>
          </div>

          {loan.application_payment_id ? <div className="application-payment-status verified"><ShieldCheck size={22}/><div><strong>{t('paymentApproved')}</strong><p>{t('paymentUsedForApplication')}</p></div></div> : <>
          <ActionMessage state={state} />

          <form action={action} className="form-grid" encType="multipart/form-data">
            <input type="hidden" name="loan_application_id" value={loan.id} />
            <div className="field">
              <label>{t('paymentMethod')}</label>
              <div className="payment-method-grid compact-3">
                {paymentOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    type="button"
                    key={value}
                    className={`payment-method-button ${paymentMethod === value ? 'active' : ''}`}
                    onClick={() => setPaymentMethod(value)}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <input type="hidden" name="payment_method" value={paymentMethod} />
            </div>

            <div className="field">
              <label>{t('amount')}</label>
              <input className="input" type="number" name="amount" defaultValue={Number(loan.required_savings_amount)} min="1" required />
            </div>
            <div className="field">
              <label>{paymentMethod === 'bank' ? 'Bank / receiver reference' : 'Receiver number'}</label>
              <input className="input" name="receiver_number" placeholder={paymentMethod === 'bank' ? 'Account / branch reference' : '01XXXXXXXXX'} />
            </div>
            <div className="field">
              <label>{t('transactionId')}</label>
              <input className="input" name="transaction_id" placeholder="e.g. TXN123456" />
            </div>
            <div className="field">
              <label>{t('screenshot')}</label>
              <label className="upload-dropzone">
                <ReceiptText size={22} />
                <strong>{t('screenshot')}</strong>
                <span>{paymentMethod === 'bank' ? 'Upload bank receipt or transfer proof' : 'Upload payment screenshot'}</span>
                <input type="file" name="payment_screenshot" accept="image/*,.pdf" />
              </label>
            </div>
            <SubmitButton className="primary-btn full-btn">{canDeposit ? t('submit') : t('update')}</SubmitButton>
          </form>
          </>}
        </aside>
      </section>

      <section className="section card mobile-look-card">
        <div className="card-header mobile-card-header">
          <div>
            <div className="mobile-card-kicker">{t('installments')}</div>
            <h2 className="section-title">{t('installments')}</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('installmentNo')}</th>
                <th>{t('dueDate')}</th>
                <th>{t('amount')}</th>
                <th>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {installments.length ? installments.map((item) => (
                <tr key={item.id}>
                  <td>#{item.installment_no}</td>
                  <td>{dateText(item.due_date, locale)}</td>
                  <td>{money(item.amount, locale)}</td>
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              )) : <tr><td colSpan={4} className="center muted">{t('noData')}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
