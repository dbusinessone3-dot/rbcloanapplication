'use client';

import { CheckCircle2, Landmark, XCircle } from 'lucide-react';
import { reviewDepositAction } from '@/app/(admin)/admin/actions';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { useLanguage } from '@/components/language-provider';
import { dateText, money } from '@/lib/format';
import type { LoanDeposit } from '@/lib/types';

export function AdminDepositsView({ items }: { items: LoanDeposit[] }) {
  const { t, locale } = useLanguage();
  return (
    <div className="admin-page-stack">
      <div className="admin-page-intro">
        <div><span>Payment verification</span><h1>{t('manageDeposits')}</h1><p>Review savings deposits and submitted payment proof.</p></div>
        <div className="admin-intro-count"><strong>{items.length}</strong><span>Total records</span></div>
      </div>

      {items.length ? <div className="admin-review-card-list">{items.map((item) => (
        <article className="card admin-review-card" key={item.id}>
          <div className="card-body">
            <div className="admin-review-card-head">
              <div className="admin-record-person">
                <span className="admin-record-icon"><Landmark size={19} /></span>
                <div><strong>{item.profiles?.full_name || item.profiles?.email || 'User'}</strong><small>{item.loan_applications?.application_no || '—'} • {dateText(item.created_at, locale)}</small></div>
              </div>
              <div className="admin-review-value"><strong>{money(item.amount, locale)}</strong><StatusBadge status={item.status} /></div>
            </div>

            <div className="admin-mobile-record-grid admin-review-meta-grid">
              <div><span>{t('paymentMethod')}</span><strong>{item.payment_method}</strong></div>
              <div><span>{t('transactionId')}</span><strong>{item.transaction_id || '—'}</strong></div>
            </div>

            {['pending', 'submitted'].includes(item.status) ? (
              <form action={reviewDepositAction} className="form-grid admin-inline-review-form">
                <input type="hidden" name="deposit_id" value={item.id} />
                <div className="field"><label>{t('adminNote')}</label><input className="input" name="admin_note" /></div>
                <div className="admin-review-actions">
                  <button className="primary-btn" name="decision" value="verify"><CheckCircle2 size={18} />Verify</button>
                  <button className="danger-btn" name="decision" value="reject"><XCircle size={18} />{t('reject')}</button>
                </div>
              </form>
            ) : (
              <div className="alert success admin-card-alert">{item.payment_method === 'loan_balance_deduction' ? 'Automatically reserved from the approved loan balance.' : `Deposit is already ${item.status}.`}</div>
            )}
          </div>
        </article>
      ))}</div> : <div className="card"><EmptyState /></div>}
    </div>
  );
}
