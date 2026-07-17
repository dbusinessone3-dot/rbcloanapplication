'use client';

import { useMemo, useState } from 'react';
import { reviewLoanAction } from '@/app/(admin)/admin/actions';
import { StatusBadge } from '@/components/status-badge';
import { useLanguage } from '@/components/language-provider';
import { calculateLoan, dateText, money } from '@/lib/format';
import type { LoanApplication, LoanDefaults } from '@/lib/types';

export function AdminLoanDetail({ loan, loanDefaults }: { loan: LoanApplication; loanDefaults: LoanDefaults }) {
  const { t, locale } = useLanguage();
  const [approvedAmount, setApprovedAmount] = useState(Number(loan.approved_amount || loan.requested_amount));
  const preview = useMemo(
    () => calculateLoan(
      approvedAmount,
      Number(loan.duration_months || 12),
      loanDefaults.interest_rate,
      loanDefaults.service_charge_rate,
      loanDefaults.savings_percentage,
    ),
    [approvedAmount, loan.duration_months, loanDefaults],
  );

  return <div className="content-grid">
    <section className="card">
      <div className="card-header"><div><div className="muted small">{loan.application_no}</div><h1 className="section-title">{loan.profiles?.full_name || 'Applicant'}</h1></div><StatusBadge status={loan.status}/></div>
      <div className="card-body summary-list">
        <div className="summary-row"><span className="muted">{t('email')}</span><strong>{loan.profiles?.email || '—'}</strong></div>
        <div className="summary-row"><span className="muted">{t('phone')}</span><strong>{loan.profiles?.phone || '—'}</strong></div>
        <div className="summary-row"><span className="muted">{t('amount')}</span><strong>{money(loan.requested_amount, locale)}</strong></div>
        <div className="summary-row"><span className="muted">{t('monthlyIncome')}</span><strong>{money(loan.monthly_income, locale)}</strong></div>
        <div className="summary-row"><span className="muted">{t('duration')}</span><strong>{loan.duration_months} {t('months')}</strong></div>
        <div className="summary-row"><span className="muted">{t('purpose')}</span><strong>{loan.loan_purpose || '—'}</strong></div>
        <div className="summary-row"><span className="muted">Date</span><strong>{dateText(loan.created_at, locale)}</strong></div>
        {loan.rejection_reason ? <div className="alert error">{loan.rejection_reason}</div> : null}
      </div>
    </section>

    <aside className="form-card" style={{alignSelf:'start'}}>
      <h2 className="section-title">Review decision</h2>
      <p className="muted small">{t('adminManagedRates')}</p>
      <form action={reviewLoanAction} className="form-grid">
        <input type="hidden" name="loan_id" value={loan.id}/>
        <div className="field"><label>{t('approvedLoan')}</label><input className="input" type="number" min="1" name="approved_amount" value={approvedAmount} onChange={(event) => setApprovedAmount(Number(event.target.value))}/></div>
        <div className="summary-list admin-calculation-preview">
          <div className="summary-row"><span className="muted">{t('interestRate')}</span><strong>{loanDefaults.interest_rate}%</strong></div>
          <div className="summary-row"><span className="muted">{t('serviceChargeRate')}</span><strong>{loanDefaults.service_charge_rate}%</strong></div>
          <div className="summary-row"><span className="muted">{t('savingsPercentage')}</span><strong>{loanDefaults.savings_percentage}%</strong></div>
          <div className="summary-row"><span className="muted">{t('serviceCharge')}</span><strong>{money(preview.serviceCharge, locale)}</strong></div>
          <div className="summary-row"><span className="muted">{t('requiredSavings')}</span><strong>{money(preview.savings, locale)}</strong></div>
          <div className="summary-row"><span className="muted">{t('monthlyInstallment')}</span><strong>{money(preview.monthly, locale)}</strong></div>
          <div className="summary-row"><span className="muted">{t('totalPayable')}</span><strong style={{color:'var(--red)'}}>{money(preview.total, locale)}</strong></div>
        </div>
        <div className="field"><label>{t('adminNote')}</label><textarea className="textarea" name="admin_note" defaultValue={loan.admin_note || ''}/></div>
        <div className="field"><label>{t('rejectionReason')}</label><textarea className="textarea" name="rejection_reason" defaultValue={loan.rejection_reason || ''}/></div>
        <div style={{display:'grid',gap:9}}><button className="secondary-btn" name="decision" value="review">{t('underReview')}</button><button className="primary-btn" name="decision" value="approve">{t('approve')}</button><button className="danger-btn" name="decision" value="reject">{t('reject')}</button></div>
      </form>
    </aside>
  </div>;
}
