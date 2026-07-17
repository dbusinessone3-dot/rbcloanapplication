'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Bell, Calculator, CalendarDays, ChevronRight, Eye, FileText, HandCoins, ReceiptText, ShieldCheck, UserRound, WalletCards, X } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { StatusBadge } from '@/components/status-badge';
import { dateText, money } from '@/lib/format';
import type { LoanApplication, Profile, Transaction, Wallet } from '@/lib/types';

export function DashboardView({ profile, wallet, currentLoan, transactions }: { profile: Profile | null; wallet: Wallet | null; currentLoan: LoanApplication | null; transactions: Transaction[] }) {
  const { t, locale } = useLanguage();
  const [balanceOpen, setBalanceOpen] = useState(false);
  const firstName = profile?.full_name?.split(' ')[0] || t('welcome');
  const stats = [
    { label: t('approvedLoan'), value: money(wallet?.total_approved_loan, locale), color: '#e9f1ff', iconColor: '#2563eb', icon: HandCoins },
    { label: t('totalCashout'), value: money(wallet?.total_cashout, locale), color: '#fff0eb', iconColor: '#ea580c', icon: WalletCards },
    { label: t('savings'), value: money(wallet?.total_deposit, locale), color: '#eafaf0', iconColor: '#16a34a', icon: ReceiptText },
    { label: t('loanCount'), value: `${currentLoan ? 1 : 0} ${t('countSuffix')}`, color: '#f3f1ff', iconColor: '#7c3aed', icon: CalendarDays },
  ];
  const actions = [
    { href:'/loan/apply', label:t('applyLoan'), icon:HandCoins, color:'#3b82f6' },
    { href:'/loan/cashout', label:t('cashout'), icon:WalletCards, color:'#22c55e' },
    { href:'/installments', label:t('installments'), icon:CalendarDays, color:'#f59e0b' },
    { href:'/profile', label:t('profile'), icon:UserRound, color:'#a855f7' },
    { href:'/my-loans', label:t('myLoans'), icon:FileText, color:'#ef4444' },
    { href:'/transactions', label:t('transactions'), icon:ReceiptText, color:'#14b8a6' },
    { href:'/calculator', label:t('calculator'), icon:Calculator, color:'#ec4899' },
    { href:'/notifications', label:t('notifications'), icon:Bell, color:'#f97316' },
  ];

  return <>
    <section className="dashboard-feature">
      <div className="dashboard-feature-media">
        <Image src="/images/rbc-dashboard-building.jpeg" alt="RBC branch" fill priority className="dashboard-feature-image" />
        <div className="dashboard-feature-overlay" />
        <div className="dashboard-feature-copy">
          <span className="dashboard-feature-kicker"><ShieldCheck size={16}/> {t('secureMessage')}</span>
          <h1>{t('helloUser').replace('{name}', firstName)}</h1>
          <p>{t('dashboardIntro')}</p>
          <div className="dashboard-feature-buttons">
            <button type="button" className="show-balance-btn" onClick={() => setBalanceOpen(true)}>
              <Eye size={20}/><span>{t('showBalance')}</span>
            </button>
            <Link href="/loan/apply" className="feature-link-btn">{t('applyLoan')} <ChevronRight size={17}/></Link>
          </div>
        </div>
      </div>
      <div className="dashboard-wallet-panel">
        <div className="dashboard-wallet-head">
          <div>
            <h2>{t('myBalance')}</h2>
            <p>{t('walletSummary')}</p>
          </div>
          <button type="button" className="wallet-close" onClick={() => setBalanceOpen(true)} aria-label={t('showBalance')}>
            <Eye size={18}/>
          </button>
        </div>
        <div className="dashboard-wallet-primary dashboard-wallet-private">
          <div className="wallet-primary-label">{t('availableBalance')}</div>
          <div className="wallet-private-placeholder" aria-hidden="true">••••••••</div>
          <button type="button" className="wallet-show-balance-action" onClick={() => setBalanceOpen(true)}>
            <Eye size={19}/><span>{t('showBalance')}</span>
          </button>
        </div>
        <div className="dashboard-wallet-grid">
          <article className="dashboard-wallet-card"><span>{t('approvedLoan')}</span><strong>{money(wallet?.total_approved_loan, locale)}</strong></article>
          <article className="dashboard-wallet-card soft"><span>{t('totalCashout')}</span><strong>{money(wallet?.total_cashout, locale)}</strong></article>
          <article className="dashboard-wallet-card green"><span>{t('savings')}</span><strong>{money(wallet?.total_deposit, locale)}</strong></article>
          <article className="dashboard-wallet-card"><span>{t('loanCount')}</span><strong>{currentLoan ? `1 ${t('countSuffix')}` : `0 ${t('countSuffix')}`}</strong></article>
        </div>
        {currentLoan ? <div className="dashboard-wallet-loan">
          <div>
            <div className="wallet-loan-amount">{money(currentLoan.approved_amount || currentLoan.requested_amount, locale)}</div>
            <div className="muted">{currentLoan.duration_months} {t('months')} • {t('remaining')} {money(wallet?.outstanding_balance, locale)}</div>
          </div>
          <StatusBadge status={currentLoan.status} />
        </div> : null}
      </div>
    </section>

    <section className="section"><div className="stats-grid">{stats.map(({label,value,color,iconColor,icon:Icon}) => <article className="stat-card" key={label}><div className="stat-icon" style={{background:color,color:iconColor}}><Icon size={21}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div></article>)}</div></section>

    <section className="section"><div className="section-head"><h2 className="section-title">{t('quickActions')}</h2></div><div className="action-grid">{actions.map(({href,label,icon:Icon,color}) => <Link className="action-card" href={href} key={href}><span className="action-icon" style={{background:color}}><Icon size={22}/></span><span>{label}</span></Link>)}</div></section>

    <section className="section content-grid">
      <div className="card"><div className="card-header"><h2 className="section-title">{t('recentTransactions')}</h2><Link href="/transactions" className="inline-link small">{t('viewAll')}</Link></div><div className="card-body list">{transactions.length ? transactions.map((tx) => <div className="list-item" key={tx.id}><div className="list-meta"><div className="list-icon"><ReceiptText size={19}/></div><div><div className="list-title">{tx.description || tx.type.replaceAll('_',' ')}</div><div className="list-subtitle">{dateText(tx.created_at, locale)}</div></div></div><div style={{textAlign:'right'}}><strong style={{color:tx.direction === 'credit' ? 'var(--success)' : 'var(--danger)'}}>{tx.direction === 'credit' ? '+' : '-'}{money(tx.amount, locale)}</strong><div><StatusBadge status={tx.status}/></div></div></div>) : <div className="empty-state">{t('noData')}</div>}</div></div>
      <div className="card"><div className="card-header"><h2 className="section-title">{t('currentLoan')}</h2></div><div className="card-body">{currentLoan ? <><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'start'}}><div><div className="muted small">{currentLoan.application_no}</div><div className="stat-value">{money(currentLoan.approved_amount || currentLoan.requested_amount, locale)}</div></div><StatusBadge status={currentLoan.status}/></div><div className="summary-list" style={{marginTop:18}}><div className="summary-row"><span className="muted">{t('duration')}</span><strong>{currentLoan.duration_months} {t('months')}</strong></div><div className="summary-row"><span className="muted">{t('monthlyInstallment')}</span><strong>{money(currentLoan.monthly_installment, locale)}</strong></div><div className="summary-row"><span className="muted">{t('totalPayable')}</span><strong>{money(currentLoan.total_payable, locale)}</strong></div></div><Link href={`/my-loans/${currentLoan.id}`} className="primary-btn full-btn" style={{marginTop:20}}>{t('details')}</Link></> : <div className="empty-state"><FileText size={34}/><div>{t('noData')}</div><Link href="/loan/apply" className="inline-link">{t('applyLoan')}</Link></div>}</div></div>
    </section>

    <section className="section"><div className="section-head"><h2 className="section-title">{t('customerReview')}</h2></div><div className="review-grid">{[
      ['Miraj Hasan','The process was simple and the application status was easy to follow.'],
      ['Mim Akhtar','Fast support, clear installment information and a clean mobile experience.'],
      ['Abrar Hassan','I submitted documents and payment proof without visiting an office.'],
      ['Sumaiya Akhter','The Bangla interface made the whole process comfortable.'],
    ].map(([name,text]) => <article className="review-card" key={name}><strong style={{color:'var(--red)'}}>“ {name}</strong><p className="muted" style={{marginBottom:0,lineHeight:1.6}}>{text}</p></article>)}</div></section>
    <section className="section"><div className="section-head"><h2 className="section-title">{t('partners')}</h2></div><div className="partner-grid"><div className="partner-card"><Image src="/images/rbc-logo.svg" alt="RBC" width={48} height={48}/>Royal Bank of Canada</div><div className="partner-card">National Bank of Canada</div><div className="partner-card">TD Bank</div></div></section>

    {balanceOpen ? <div className="balance-drawer-backdrop" role="presentation" onClick={() => setBalanceOpen(false)}>
      <section className="balance-drawer" role="dialog" aria-modal="true" aria-label={t('balanceDetails')} onClick={(event) => event.stopPropagation()}>
        <div className="balance-drawer-handle" />
        <div className="balance-drawer-head"><div><div className="muted small">{t('balanceDetails')}</div><h2>{t('availableBalance')}</h2></div><button type="button" className="icon-btn" onClick={() => setBalanceOpen(false)} aria-label={t('close')}><X size={20}/></button></div>
        <div className="balance-drawer-amount">{money(wallet?.available_balance, locale)}</div>
        <div className="summary-list balance-summary">
          <div className="summary-row"><span className="muted">{t('approvedLoan')}</span><strong>{money(wallet?.total_approved_loan, locale)}</strong></div>
          <div className="summary-row"><span className="muted">{t('totalCashout')}</span><strong>{money(wallet?.total_cashout, locale)}</strong></div>
          <div className="summary-row"><span className="muted">{t('outstanding')}</span><strong>{money(wallet?.outstanding_balance, locale)}</strong></div>
          <div className="summary-row"><span className="muted">{t('savings')}</span><strong>{money(wallet?.total_deposit, locale)}</strong></div>
        </div>
        <div className="balance-drawer-actions">
          <Link href="/loan/cashout" className="primary-btn full-btn" onClick={() => setBalanceOpen(false)}>
            <WalletCards size={19}/><span>{t('cashout')}</span>
          </Link>
          <button type="button" className="secondary-btn full-btn" onClick={() => setBalanceOpen(false)}>{t('close')}</button>
        </div>
      </section>
    </div> : null}
  </>;
}
