'use client';

import Link from 'next/link';
import { ChevronRight, FileText } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { useLanguage } from '@/components/language-provider';
import { dateText, money } from '@/lib/format';
import type { LoanApplication } from '@/lib/types';

export function LoansView({ loans }: { loans: LoanApplication[] }) {
  const { t, locale } = useLanguage();
  return (
    <div className="page-stack">
      <div className="section-head">
        <div>
          <h1 className="section-title">{t('myLoans')}</h1>
          <p className="muted">{t('loanInfo')}</p>
        </div>
        <Link href="/loan/apply" className="primary-btn">{t('applyLoan')}</Link>
      </div>
      <div className="card mobile-look-card">
        <div className="card-body">
          {loans.length ? <div className="loan-list-grid">{loans.map((loan) => (
            <Link href={`/my-loans/${loan.id}`} className="loan-list-card" key={loan.id}>
              <div className="loan-list-main">
                <div className="loan-list-icon"><FileText size={18} /></div>
                <div>
                  <div className="list-title">{loan.application_no}</div>
                  <div className="list-subtitle">{dateText(loan.created_at, locale)} • {loan.duration_months} {t('months')}</div>
                </div>
              </div>
              <div className="loan-list-side">
                <strong>{money(loan.approved_amount || loan.requested_amount, locale)}</strong>
                <div className="loan-list-meta"><StatusBadge status={loan.status} /><ChevronRight size={16} /></div>
              </div>
            </Link>
          ))}</div> : <EmptyState />}
        </div>
      </div>
    </div>
  );
}
