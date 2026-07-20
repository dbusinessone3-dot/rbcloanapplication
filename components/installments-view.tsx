'use client';

import { useActionState, useState } from 'react';
import { installmentPaymentAction } from '@/app/(user)/actions';
import { ActionMessage } from '@/components/action-message';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { SubmitButton } from '@/components/submit-button';
import { useLanguage } from '@/components/language-provider';
import { dateText, money } from '@/lib/format';
import type { ActionState, Installment } from '@/lib/types';

const initial: ActionState = { ok:false, message:'' };

export function InstallmentsView({ installments }: { installments: Installment[] }) {
  const { t, locale } = useLanguage();
  const [selected, setSelected] = useState<Installment | null>(null);
  const [state, action] = useActionState(installmentPaymentAction, initial);
  return <>
    <div className="section-head"><div><h1 className="section-title">{t('installments')}</h1><p className="muted">{t('payInstallment')}</p></div></div>
    <div className="content-grid">
      <div className="card"><div className="card-body">{installments.length ? <div className="list">{installments.map((item)=><button key={item.id} type="button" onClick={()=>setSelected(item)} className="list-item" style={{borderLeft:0,borderRight:0,borderTop:0,background:'transparent',width:'100%',textAlign:'left'}}><div><div className="list-title">#{item.installment_no} · {item.loan_applications?.application_no}</div><div className="list-subtitle">{t('dueDate')}: {dateText(item.due_date,locale)}</div></div><div style={{textAlign:'right'}}><strong>{money(item.amount,locale)}</strong><div style={{marginTop:5}}><StatusBadge status={item.status}/></div></div></button>)}</div> : <EmptyState/>}</div></div>
      <aside className="form-card" style={{alignSelf:'start'}}><h2 className="section-title">{t('payInstallment')}</h2>{selected ? <><p className="muted">#{selected.installment_no} · {money(selected.amount,locale)}</p><ActionMessage state={state}/><form action={action} className="form-grid" encType="multipart/form-data"><input type="hidden" name="installment_id" value={selected.id}/><div className="field"><label>{t('amount')}</label><input className="input" type="number" name="submitted_amount" defaultValue={Number(selected.amount)} min="1" required/></div><div className="field"><label>{t('paymentMethod')}</label><select className="select" name="payment_method" required><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="rocket">Rocket</option><option value="bank">Bank</option></select></div><div className="field"><label>{t('transactionId')}</label><input className="input" name="transaction_id" required/></div><div className="field"><label>{t('screenshot')}</label><input className="file-input" type="file" name="payment_screenshot" accept="image/*,.pdf" required/></div><SubmitButton>{t('submit')}</SubmitButton></form></> : <EmptyState message="Select an installment to submit payment."/>}</aside>
    </div>
  </>;
}
