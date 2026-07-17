'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Banknote, Bell, ChartNoAxesCombined, FileCheck2, Landmark, LayoutDashboard, LogOut, ReceiptText, Settings2, ShieldCheck, UserRound, WalletCards } from 'lucide-react';
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

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const active = (href:string) => pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));
  const title = nav.find((item) => active(item.href));
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/admin/dashboard" className="brand-line"><Image src="/images/rbc-logo.svg" alt="RBC" width={48} height={48} className="brand-logo"/><div><div className="brand-title">{t('appName')}</div><div className="brand-subtitle">Admin</div></div></Link>
      <nav className="side-nav">{nav.map(({href,key,icon:Icon}) => <Link key={href} href={href} className={`side-link ${active(href)?'active':''}`}><Icon size={19}/>{t(key)}</Link>)}</nav>
      <div className="sidebar-footer"><Link href="/dashboard" className="side-link"><UserRound size={19}/>{t('home')}</Link><form action={logoutAction}><button className="side-link" style={{width:'100%',border:0,background:'transparent'}}><LogOut size={19}/>{t('logout')}</button></form></div>
    </aside>
    <main className="app-main"><header className="topbar"><div className="topbar-title">{title ? t(title.key) : t('adminDashboard')}</div><div className="topbar-actions"><LanguageSwitch compact/></div></header><div className="page-content">{children}</div></main>
  </div>;
}
