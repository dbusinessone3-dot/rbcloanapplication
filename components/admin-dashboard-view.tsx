'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  Banknote,
  FileCheck2,
  ReceiptText,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { money } from '@/lib/format';

export function AdminDashboardView({
  stats,
}: {
  stats: {
    users: number;
    loans: number;
    pending: number;
    cashouts: number;
    installments: number;
    profileReviews: number;
    depositRequests: number;
    applicationPayments: number;
    approvedAmount: number;
  };
}) {
  const { t, locale } = useLanguage();
  const cards = [
    { label: t('users'), value: String(stats.users), icon: UsersRound, tone: 'blue' },
    { label: t('totalApplications'), value: String(stats.loans), icon: FileCheck2, tone: 'violet' },
    { label: t('pendingApplications'), value: String(stats.pending), icon: ReceiptText, tone: 'amber' },
    { label: t('approvedLoan'), value: money(stats.approvedAmount, locale), icon: Banknote, tone: 'green' },
  ];

  const actions = [
    { href: '/admin/profiles', label: t('profileApprovals'), meta: `${stats.profileReviews} pending`, icon: ShieldCheck, tone: 'teal' },
    { href: '/admin/application-payments', label: t('applicationPayments'), meta: `${stats.applicationPayments} pending`, icon: ReceiptText, tone: 'indigo' },
    { href: '/admin/cashout-deposits', label: t('cashoutDepositRequests'), meta: `${stats.depositRequests} pending`, icon: WalletCards, tone: 'pink' },
    { href: '/admin/loans', label: t('manageLoans'), meta: `${stats.pending} pending`, icon: FileCheck2, tone: 'blue' },
    { href: '/admin/cashouts', label: t('manageCashouts'), meta: `${stats.cashouts} requests`, icon: Banknote, tone: 'green' },
    { href: '/admin/installments', label: t('verifyInstallments'), meta: `${stats.installments} submitted`, icon: ReceiptText, tone: 'amber' },
  ];

  return (
    <div className="admin-dashboard-stack">
      <section className="admin-dashboard-hero">
        <div>
          <span className="admin-hero-kicker">RBC Loan Administration</span>
          <h1>Operations overview</h1>
          <p>Review applications, approve payments, manage cash outs, and monitor daily loan operations from one workspace.</p>
        </div>
        <div className="admin-hero-actions">
          <Link href="/admin/loans" className="admin-hero-primary">{t('manageLoans')}<ArrowUpRight size={18} /></Link>
          <Link href="/admin/reports" className="admin-hero-secondary">{t('reports')}</Link>
        </div>
      </section>

      <section className="admin-stat-grid">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <article className={`admin-stat-card ${tone}`} key={label}>
            <div className="admin-stat-card-top">
              <span className="admin-stat-icon"><Icon size={21} /></span>
              <ArrowUpRight size={17} className="admin-stat-arrow" />
            </div>
            <span className="admin-stat-label">{label}</span>
            <strong className="admin-stat-value">{value}</strong>
          </article>
        ))}
      </section>

      <section className="admin-dashboard-section">
        <div className="admin-section-heading">
          <div>
            <span>Quick management</span>
            <h2>Pending work and shortcuts</h2>
          </div>
        </div>
        <div className="admin-action-grid">
          {actions.map(({ href, label, meta, icon: Icon, tone }) => (
            <Link className={`admin-action-card ${tone}`} href={href} key={href}>
              <span className="admin-action-icon"><Icon size={22} /></span>
              <span className="admin-action-copy"><strong>{label}</strong><small>{meta}</small></span>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
