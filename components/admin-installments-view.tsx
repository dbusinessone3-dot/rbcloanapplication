'use client';

import { CheckCircle2, ReceiptText, XCircle } from 'lucide-react';
import { reviewInstallmentAction } from '@/app/(admin)/admin/actions';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { useLanguage } from '@/components/language-provider';
import { dateText, money } from '@/lib/format';
import type { Installment } from '@/lib/types';

export function AdminInstallmentsView({ items }: { items: Installment[] }) {
  const { t, locale } = useLanguage();
  return (
    <div className="admin-page-stack">
      <div className="admin-page-intro">
        <div><span>Installment verification</span><h1>{t('verifyInstallments')}</h1><p>Review installment payment details and approve submitted proof.</p></div>
        <div className="admin-intro-count"><strong>{items.length}</strong><span>Submitted</span></div>
      </div>

      {items.length ? <div className="admin-review-card-list">{items.map((item) => (
        <article className="card admin-review-card" key={item.id}>
          <div className="card-body">
            <div className="admin-review-card-head">
              <div className="admin-record-person">
                <span className="admin-record-icon"><ReceiptText size={19} /></span>
                <div><strong>{item.profiles?.full_name || item.profiles?.email || 'User'}</strong><small>{item.loan_applications?.application_no || '—'} • #{item.installment_no}</small></div>
              </div>
              <div className="admin-review-value"><strong>{money(item.submitted_amount || item.amount, locale)}</strong><StatusBadge status={item.status} /></div>
            </div>

            <div className="admin-mobile-record-grid admin-review-meta-grid">
              <div><span>{t('dueDate')}</span><strong>{dateText(item.due_date, locale)}</strong></div>
              <div><span>{t('transactionId')}</span><strong>{item.transaction_id || '—'}</strong></div>
            </div>

            <form action={reviewInstallmentAction} className="form-grid admin-inline-review-form">
              <input type="hidden" name="installment_id" value={item.id} />
              <div className="field"><label>{t('adminNote')}</label><input className="input" name="admin_note" /></div>
              <div className="admin-review-actions">
                <button className="primary-btn" name="decision" value="verify"><CheckCircle2 size={18} />Verify</button>
                <button className="danger-btn" name="decision" value="reject"><XCircle size={18} />{t('reject')}</button>
              </div>
            </form>
          </div>
        </article>
      ))}</div> : <div className="card"><EmptyState /></div>}
    </div>
  );
}
