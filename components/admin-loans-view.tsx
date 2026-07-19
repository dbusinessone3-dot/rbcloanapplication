'use client';

import Link from 'next/link';
import { ArrowUpRight, FileText } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { useLanguage } from '@/components/language-provider';
import { dateText, money } from '@/lib/format';
import type { LoanApplication } from '@/lib/types';

export function AdminLoansView({ loans }: { loans: LoanApplication[] }) {
  const { t, locale } = useLanguage();
  return (
    <div className="admin-page-stack">
      <div className="admin-page-intro">
        <div>
          <span>Loan management</span>
          <h1>{t('manageLoans')}</h1>
          <p>Review applicant information, requested amounts, and approval status.</p>
        </div>
        <div className="admin-intro-count"><strong>{loans.length}</strong><span>Total records</span></div>
      </div>

      {loans.length ? (
        <>
          <div className="card admin-table-card admin-desktop-only">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Application</th><th>{t('users')}</th><th>{t('amount')}</th><th>{t('status')}</th><th>Date</th><th></th></tr></thead>
                <tbody>{loans.map((loan) => (
                  <tr key={loan.id}>
                    <td><strong>{loan.application_no}</strong></td>
                    <td>{loan.profiles?.full_name || loan.profiles?.email || '—'}</td>
                    <td>{money(loan.requested_amount, locale)}</td>
                    <td><StatusBadge status={loan.status} /></td>
                    <td>{dateText(loan.created_at, locale)}</td>
                    <td><Link className="inline-link" href={`/admin/loans/${loan.id}`}>{t('details')}</Link></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          <div className="admin-mobile-record-list admin-mobile-only">
            {loans.map((loan) => (
              <article className="admin-mobile-record-card" key={loan.id}>
                <div className="admin-mobile-record-head">
                  <div className="admin-record-person">
                    <span className="admin-record-icon"><FileText size={19} /></span>
                    <div><strong>{loan.profiles?.full_name || loan.profiles?.email || 'User'}</strong><small>{loan.application_no}</small></div>
                  </div>
                  <StatusBadge status={loan.status} />
                </div>
                <div className="admin-mobile-record-grid">
                  <div><span>{t('amount')}</span><strong>{money(loan.requested_amount, locale)}</strong></div>
                  <div><span>Date</span><strong>{dateText(loan.created_at, locale)}</strong></div>
                </div>
                <Link className="admin-record-link" href={`/admin/loans/${loan.id}`}>{t('details')}<ArrowUpRight size={17} /></Link>
              </article>
            ))}
          </div>
        </>
      ) : <div className="card"><EmptyState /></div>}
    </div>
  );
}
