'use client';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { useLanguage } from '@/components/language-provider';
import { dateText,money } from '@/lib/format';
import type { LoanApplication } from '@/lib/types';
export function AdminLoansView({loans}:{loans:LoanApplication[]}){const{t,locale}=useLanguage();return <><div className="section-head"><div><h1 className="section-title">{t('manageLoans')}</h1><p className="muted">Review and update user applications.</p></div></div><div className="card"><div className="table-wrap">{loans.length?<table><thead><tr><th>Application</th><th>{t('users')}</th><th>{t('amount')}</th><th>{t('status')}</th><th>Date</th><th></th></tr></thead><tbody>{loans.map(loan=><tr key={loan.id}><td><strong>{loan.application_no}</strong></td><td>{loan.profiles?.full_name||loan.profiles?.email||'—'}</td><td>{money(loan.requested_amount,locale)}</td><td><StatusBadge status={loan.status}/></td><td>{dateText(loan.created_at,locale)}</td><td><Link className="inline-link" href={`/admin/loans/${loan.id}`}>{t('details')}</Link></td></tr>)}</tbody></table>:<EmptyState/>}</div></div></>;}
