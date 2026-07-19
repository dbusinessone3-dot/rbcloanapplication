'use client';

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { useLanguage } from '@/components/language-provider';
import { dateText, money } from '@/lib/format';
import type { Transaction } from '@/lib/types';

export function TransactionsView({ transactions }: { transactions: Transaction[] }) {
  const { t,locale } = useLanguage();
  return <><div className="section-head"><div><h1 className="section-title">{t('transactions')}</h1><p className="muted">{t('recentTransactions')}</p></div></div><div className="card"><div className="card-body">{transactions.length ? <div className="list">{transactions.map((tx)=><div className="list-item" key={tx.id}><div className="list-meta"><div className="list-icon" style={{color:tx.direction==='credit'?'var(--success)':'var(--danger)'}}>{tx.direction==='credit'?<ArrowDownLeft size={20}/>:<ArrowUpRight size={20}/>}</div><div><div className="list-title">{tx.description || tx.type.replaceAll('_',' ')}</div><div className="list-subtitle">{tx.transaction_no} · {dateText(tx.created_at,locale)}</div></div></div><div style={{textAlign:'right'}}><strong style={{color:tx.direction==='credit'?'var(--success)':'var(--danger)'}}>{tx.direction==='credit'?'+':'-'}{money(tx.amount,locale)}</strong><div style={{marginTop:5}}><StatusBadge status={tx.status}/></div></div></div>)}</div> : <EmptyState/>}</div></div></>;
}
