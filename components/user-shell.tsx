'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Calculator, CreditCard, FileText, HandCoins, Home, Languages, LayoutDashboard, LogOut, ReceiptText, UserRound, WalletCards } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { LanguageSwitch } from '@/components/language-switch';
import type { Profile } from '@/lib/types';
import { logoutAction } from '@/app/(auth)/actions';

const nav = [
  { href: '/dashboard', key: 'home' as const, icon: Home },
  { href: '/loan/apply', key: 'applyLoan' as const, icon: HandCoins },
  { href: '/my-loans', key: 'myLoans' as const, icon: FileText },
  { href: '/installments', key: 'installments' as const, icon: CreditCard },
  { href: '/transactions', key: 'transactions' as const, icon: ReceiptText },
  { href: '/loan/cashout', key: 'cashout' as const, icon: WalletCards },
  { href: '/calculator', key: 'calculator' as const, icon: Calculator },
  { href: '/notifications', key: 'notifications' as const, icon: Bell },
  { href: '/profile', key: 'profile' as const, icon: UserRound },
  { href: '/language', key: 'language' as const, icon: Languages },
];

export function UserShell({ profile, unreadCount, children }: { profile: Profile | null; unreadCount: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const active = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  const title = nav.find((item) => active(item.href));

  return (
    <div className="app-shell user-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand-line">
          <Image src="/images/rbc-logo.svg" alt="RBC" width={48} height={48} className="brand-logo" />
          <div><div className="brand-title">{t('appName')}</div><div className="brand-subtitle">{t('royalBank')}</div></div>
        </Link>
        <nav className="side-nav">
          {nav.map(({ href, key, icon: Icon }) => (
            <Link href={href} key={href} className={`side-link ${active(href) ? 'active' : ''}`}>
              <Icon size={19} /><span>{t(key)}</span>{key === 'notifications' && unreadCount > 0 ? <span className="badge rejected">{unreadCount}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          {profile && ['admin', 'super_admin'].includes(profile.role) ? <Link href="/admin/dashboard" className="side-link"><LayoutDashboard size={19} />{t('adminDashboard')}</Link> : null}
          <form action={logoutAction}><button className="side-link" style={{ width: '100%', border: 0, background: 'transparent' }}><LogOut size={19} />{t('logout')}</button></form>
        </div>
      </aside>
      <main className="app-main">
        <header className="topbar">
          <Link href="/dashboard" className="mobile-header-brand" aria-label={t('home')}>
            <Image src="/images/rbc-logo.svg" alt="RBC" width={42} height={42} className="mobile-header-logo" />
            <span><strong>{t('appName')}</strong><small>{t('royalBank')}</small></span>
          </Link>
          <div className="topbar-title">{title ? t(title.key) : t('dashboard')}</div>
          <div className="topbar-actions">
            <LanguageSwitch compact />
            <Link href="/notifications" className="icon-btn" aria-label={t('notifications')} style={{ position: 'relative' }}><Bell size={19} />{unreadCount > 0 ? <span style={{ position:'absolute', right:-4, top:-4, minWidth:18, height:18, borderRadius:10, background:'var(--red)', color:'#fff', fontSize:10, display:'grid', placeItems:'center', fontWeight:800 }}>{unreadCount}</span> : null}</Link>
            <Link href="/profile" className="icon-btn mobile-hide-profile" aria-label={t('profile')}><UserRound size={19} /></Link>
            <form action={logoutAction}><button className="icon-btn logout-icon-btn" type="submit" aria-label={t('logout')} title={t('logout')}><LogOut size={19} /></button></form>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
      <nav className="mobile-bottom-nav">
        {[
          { href:'/dashboard', key:'home' as const, icon:Home },
          { href:'/loan/apply', key:'loan' as const, icon:HandCoins },
          { href:'/my-loans', key:'myLoans' as const, icon:FileText },
          { href:'/transactions', key:'transactions' as const, icon:ReceiptText },
          { href:'/profile', key:'profile' as const, icon:UserRound },
        ].map(({href,key,icon:Icon}) => <Link key={href} href={href} className={`bottom-link ${active(href) ? 'active' : ''}`}><Icon size={20}/><span>{t(key)}</span></Link>)}
      </nav>
    </div>
  );
}
