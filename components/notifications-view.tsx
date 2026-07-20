'use client';

import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { markAllNotificationsReadAction, markNotificationReadAction } from '@/app/(user)/actions';
import { EmptyState } from '@/components/empty-state';
import { useLanguage } from '@/components/language-provider';
import { dateText } from '@/lib/format';
import type { Notification } from '@/lib/types';

export function NotificationsView({ notifications }: { notifications: Notification[] }) {
  const { t,locale }=useLanguage();
  return <><div className="section-head"><div><h1 className="section-title">{t('notifications')}</h1><p className="muted">Application updates and account messages.</p></div>{notifications.some(n=>!n.read_at)?<form action={markAllNotificationsReadAction}><button className="secondary-btn"><CheckCheck size={18}/>Mark all read</button></form>:null}</div><div className="card"><div className="card-body">{notifications.length?<div className="list">{notifications.map((item)=><div className="list-item" key={item.id} style={{opacity:item.read_at?.length?0.7:1}}><div className="list-meta"><div className="list-icon" style={{background:item.read_at?'#f2f4f7':'#fff0f1',color:item.read_at?'#667085':'var(--red)'}}><Bell size={19}/></div><div><div className="list-title">{item.title}</div><div className="list-subtitle">{item.message}</div><div className="list-subtitle">{dateText(item.created_at,locale)}</div></div></div><div style={{display:'flex',gap:8,alignItems:'center'}}>{item.action_url?<Link href={item.action_url} className="inline-link small">{t('details')}</Link>:null}{!item.read_at?<form action={markNotificationReadAction}><input type="hidden" name="notification_id" value={item.id}/><button className="ghost-btn" aria-label="Mark read"><CheckCheck size={18}/></button></form>:null}</div></div>)}</div>:<EmptyState/>}</div></div></>;
}
