'use client';

import { Banknote, ChartNoAxesCombined, HandCoins, ReceiptText } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { StatusBadge } from '@/components/status-badge';
import { money } from '@/lib/format';

export function AdminReportsView({
  data,
}: {
  data: {
    approved: number;
    cashout: number;
    deposit: number;
    installment: number;
    statusCounts: Record<string, number>;
  };
}) {
  const { t, locale } = useLanguage();
  const cards = [
    { label: t('approvedLoan'), value: data.approved, icon: HandCoins, tone: 'blue' },
    { label: t('totalCashout'), value: data.cashout, icon: Banknote, tone: 'green' },
    { label: t('savings'), value: data.deposit, icon: ReceiptText, tone: 'amber' },
    { label: t('totalPaid'), value: data.installment, icon: ChartNoAxesCombined, tone: 'violet' },
  ];

  return (
    <div className="admin-page-stack">
      <div className="admin-page-intro">
        <div><span>Financial reporting</span><h1>{t('reports')}</h1><p>Live operational totals and application status from Supabase.</p></div>
      </div>

      <div className="admin-stat-grid">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <article className={`admin-stat-card ${tone}`} key={label}>
            <div className="admin-stat-card-top"><span className="admin-stat-icon"><Icon size={21} /></span></div>
            <span className="admin-stat-label">{label}</span>
            <strong className="admin-stat-value">{money(value, locale)}</strong>
          </article>
        ))}
      </div>

      <section className="card admin-status-card">
        <div className="card-header mobile-card-header"><div><div className="mobile-card-kicker">Overview</div><h2 className="section-title">Application status</h2></div></div>
        <div className="card-body admin-status-list">
          {Object.entries(data.statusCounts).map(([status, count]) => (
            <div className="admin-status-row" key={status}>
              <StatusBadge status={status} />
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
