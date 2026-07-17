'use client';
import { reviewDepositAction } from '@/app/(admin)/admin/actions';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { useLanguage } from '@/components/language-provider';
import { dateText, money } from '@/lib/format';
import type { LoanDeposit } from '@/lib/types';

export function AdminDepositsView({ items }: { items: LoanDeposit[] }) {
  const { t, locale } = useLanguage();
  return <><div className="section-head"><div><h1 className="section-title">{t('manageDeposits')}</h1><p className="muted">Review savings deposits and payment proof.</p></div></div>{items.length ? <div style={{display:'grid',gap:14}}>{items.map(item => <article className="card" key={item.id}><div className="card-body"><div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'start'}}><div><div className="list-title">{item.profiles?.full_name || item.profiles?.email || 'User'} · {item.loan_applications?.application_no}</div><div className="list-subtitle">{item.payment_method} · {item.transaction_id || '—'} · {dateText(item.created_at, locale)}</div></div><div style={{textAlign:'right'}}><strong>{money(item.amount, locale)}</strong><div style={{marginTop:5}}><StatusBadge status={item.status}/></div></div></div>{['pending','submitted'].includes(item.status) ? <form action={reviewDepositAction} className="form-grid" style={{marginTop:16}}><input type="hidden" name="deposit_id" value={item.id}/><div className="field"><label>{t('adminNote')}</label><input className="input" name="admin_note"/></div><div style={{display:'flex',gap:9}}><button className="primary-btn" name="decision" value="verify">Verify</button><button className="danger-btn" name="decision" value="reject">{t('reject')}</button></div></form> : <div className="alert success" style={{marginTop:16}}>{item.payment_method === 'loan_balance_deduction' ? 'Automatically reserved from the approved loan balance.' : `Deposit is already ${item.status}.`}</div>}</div></article>)}</div> : <div className="card"><EmptyState/></div>}</>;
}
