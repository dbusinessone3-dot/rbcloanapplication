'use client';

import { useMemo, useState } from 'react';
import { Calculator, CheckCircle2, FileText, ShieldCheck, XCircle } from 'lucide-react';
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

  return (
    <div className="admin-page-stack">
      <div className="admin-page-intro admin-loan-detail-intro">
        <div><span>Application review</span><h1>{loan.profiles?.full_name || 'Applicant'}</h1><p>{loan.application_no} • {dateText(loan.created_at, locale)}</p></div>
        <StatusBadge status={loan.status} />
      </div>

      <div className="content-grid admin-loan-detail-grid">
        <section className="card admin-loan-info-card">
          <div className="card-header mobile-card-header"><div className="admin-card-title-row"><span className="admin-record-icon"><FileText size={19} /></span><div><div className="mobile-card-kicker">Applicant</div><h2 className="section-title">Loan information</h2></div></div></div>
          <div className="card-body summary-list admin-detail-summary">
            <div className="summary-row"><span className="muted">{t('email')}</span><strong>{loan.profiles?.email || '—'}</strong></div>
            <div className="summary-row"><span className="muted">{t('phone')}</span><strong>{loan.profiles?.phone || '—'}</strong></div>
            <div className="summary-row"><span className="muted">{t('amount')}</span><strong>{money(loan.requested_amount, locale)}</strong></div>
            <div className="summary-row"><span className="muted">{t('monthlyIncome')}</span><strong>{money(loan.monthly_income, locale)}</strong></div>
            <div className="summary-row"><span className="muted">{t('duration')}</span><strong>{loan.duration_months} {t('months')}</strong></div>
            <div className="summary-row"><span className="muted">{t('purpose')}</span><strong>{loan.loan_purpose || '—'}</strong></div>
            {loan.rejection_reason ? <div className="alert error">{loan.rejection_reason}</div> : null}
          </div>
        </section>

        <aside className="form-card admin-review-decision-card">
          <div className="admin-card-title-row"><span className="admin-record-icon"><ShieldCheck size={19} /></span><div><div className="mobile-card-kicker">Decision</div><h2 className="section-title">Review application</h2></div></div>
          <p className="muted small">{t('adminManagedRates')}</p>

          <form action={reviewLoanAction} className="form-grid">
            <input type="hidden" name="loan_id" value={loan.id} />
            <div className="field"><label>{t('approvedLoan')}</label><input className="input" type="number" min="1" name="approved_amount" value={approvedAmount} onChange={(event) => setApprovedAmount(Number(event.target.value))} /></div>

            <div className="admin-preview-card">
              <div className="admin-preview-head"><Calculator size={19} /><span>Approval calculation</span></div>
              <div className="summary-list">
                <div className="summary-row"><span className="muted">{t('interestRate')}</span><strong>{loanDefaults.interest_rate}%</strong></div>
                <div className="summary-row"><span className="muted">{t('serviceChargeRate')}</span><strong>{loanDefaults.service_charge_rate}%</strong></div>
                <div className="summary-row"><span className="muted">{t('savingsPercentage')}</span><strong>{loanDefaults.savings_percentage}%</strong></div>
                <div className="summary-row"><span className="muted">{t('serviceCharge')}</span><strong>{money(preview.serviceCharge, locale)}</strong></div>
                <div className="summary-row"><span className="muted">{t('requiredSavings')}</span><strong>{money(preview.savings, locale)}</strong></div>
                <div className="summary-row"><span className="muted">{t('monthlyInstallment')}</span><strong>{money(preview.monthly, locale)}</strong></div>
                <div className="summary-row admin-preview-total"><span>{t('totalPayable')}</span><strong>{money(preview.total, locale)}</strong></div>
              </div>
            </div>

            <div className="field"><label>{t('adminNote')}</label><textarea className="textarea" name="admin_note" defaultValue={loan.admin_note || ''} /></div>
            <div className="field"><label>{t('rejectionReason')}</label><textarea className="textarea" name="rejection_reason" defaultValue={loan.rejection_reason || ''} /></div>

            <div className="admin-decision-actions">
              <button className="secondary-btn" name="decision" value="review">{t('underReview')}</button>
              <button className="primary-btn" name="decision" value="approve"><CheckCircle2 size={18} />{t('approve')}</button>
              <button className="danger-btn" name="decision" value="reject"><XCircle size={18} />{t('reject')}</button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
