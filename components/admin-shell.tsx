'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Banknote,
  Bell,
  ChartNoAxesCombined,
  FileCheck2,
  Home,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Settings2,
  ShieldCheck,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { LanguageSwitch } from '@/components/language-switch';
import { logoutAction } from '@/app/(auth)/actions';

const nav = [
  { href: '/admin/dashboard', key: 'adminDashboard' as const, icon: LayoutDashboard },
  { href: '/admin/profiles', key: 'profileApprovals' as const, icon: ShieldCheck },
  { href: '/admin/application-payments', key: 'applicationPayments' as const, icon: ReceiptText },
  { href: '/admin/loans', key: 'manageLoans' as const, icon: FileCheck2 },
  { href: '/admin/cashouts', key: 'manageCashouts' as const, icon: Banknote },
  { href: '/admin/cashout-deposits', key: 'cashoutDepositRequests' as const, icon: WalletCards },
  { href: '/admin/deposits', key: 'manageDeposits' as const, icon: Landmark },
  { href: '/admin/installments', key: 'verifyInstallments' as const, icon: ReceiptText },
  { href: '/admin/notifications', key: 'notifications' as const, icon: Bell },
  { href: '/admin/reports', key: 'reports' as const, icon: ChartNoAxesCombined },
  { href: '/admin/settings', key: 'settings' as const, icon: Settings2 },
];

const mobilePrimaryNav = [
  { href: '/admin/dashboard', key: 'adminDashboard' as const, icon: LayoutDashboard },
  { href: '/admin/profiles', key: 'profileApprovals' as const, icon: ShieldCheck },
  { href: '/admin/loans', key: 'manageLoans' as const, icon: FileCheck2 },
  { href: '/admin/cashouts', key: 'manageCashouts' as const, icon: Banknote },
  { href: '/admin/settings', key: 'settings' as const, icon: Settings2 },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = (href: string) => pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));
  const title = nav.find((item) => active(item.href));

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className="app-shell admin-shell">
      {menuOpen ? <button type="button" className="admin-drawer-overlay" aria-label="Close navigation" onClick={() => setMenuOpen(false)} /> : null}

      <aside className={`sidebar admin-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-top">
          <Link href="/admin/dashboard" className="brand-line admin-brand-line">
            <Image src="/images/rbc-logo.svg" alt="RBC" width={48} height={48} className="brand-logo" />
            <div>
              <div className="brand-title">{t('appName')}</div>
              <div className="brand-subtitle">Admin Portal</div>
            </div>
          </Link>
          <button type="button" className="admin-drawer-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}>
            <X size={21} />
          </button>
        </div>

        <div className="admin-nav-label">Management</div>
        <nav className="side-nav admin-side-nav">
          {nav.map(({ href, key, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`side-link ${active(href) ? 'active' : ''}`}>
              <span className="admin-side-icon"><Icon size={19} /></span>
              <span>{t(key)}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer admin-sidebar-footer">
          <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="side-link"><Home size={19} />{t('home')}</Link>
          <form action={logoutAction}>
            <button className="side-link admin-logout-link" type="submit"><LogOut size={19} />{t('logout')}</button>
          </form>
        </div>
      </aside>

      <main className="app-main admin-main">
        <header className="topbar admin-topbar">
          <div className="admin-topbar-left">
            <button type="button" className="admin-menu-button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}>
              <Menu size={22} />
            </button>
            <Link href="/admin/dashboard" className="admin-mobile-brand">
              <Image src="/images/rbc-logo.svg" alt="RBC" width={42} height={42} className="mobile-header-logo" />
              <span><strong>RBC Admin</strong><small>Loan Management</small></span>
            </Link>
            <div className="admin-page-heading">
              <span>Admin workspace</span>
              <strong>{title ? t(title.key) : t('adminDashboard')}</strong>
            </div>
          </div>
          <div className="topbar-actions admin-topbar-actions">
            <LanguageSwitch compact />
            <Link href="/admin/notifications" className="icon-btn" aria-label={t('notifications')}><Bell size={19} /></Link>
            <Link href="/dashboard" className="icon-btn admin-user-home" aria-label={t('home')}><UserRound size={19} /></Link>
          </div>
        </header>

        <div className="page-content admin-page-content">{children}</div>
      </main>

      <nav className="admin-mobile-bottom-nav" aria-label="Admin primary navigation">
        {mobilePrimaryNav.map(({ href, key, icon: Icon }) => (
          <Link key={href} href={href} className={`admin-bottom-link ${active(href) ? 'active' : ''}`}>
            <Icon size={20} />
            <span>{t(key)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
