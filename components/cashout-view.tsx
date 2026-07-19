'use client';

import { useActionState, useMemo, useState } from 'react';
import { Banknote, Building2, CheckCircle2, Clock3, LockKeyhole, Send, ShieldCheck, Smartphone, X } from 'lucide-react';
import { cashoutAction, submitCashoutDepositPaymentAction } from '@/app/(user)/actions';
import { ActionMessage } from '@/components/action-message';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { SubmitButton } from '@/components/submit-button';
import { useLanguage } from '@/components/language-provider';
import { dateText, money } from '@/lib/format';
import type { ActionState, Cashout, LoanApplication } from '@/lib/types';

const initial: ActionState = { ok: false, message: '' };

export interface CashoutGate {
  loanId: string;
  approvedAmount: number;
  reservedCashout: number;
  maxCashout: number;
  depositStatus: string | null;
  depositAmount: number;
  depositAdminNote: string | null;
  depositVerified: boolean;
}

const methods = [
  { value: 'bkash', label: 'bKash', icon: Smartphone },
  { value: 'nagad', label: 'Nagad', icon: Smartphone },
  { value: 'rocket', label: 'Rocket', icon: Send },
  { value: 'bank', label: 'Bank', icon: Building2 },
] as const;

export function CashoutView({
  loans,
  cashouts,
  gates,
  selectedLoan,
  depositError,
}: {
  loans: LoanApplication[];
  cashouts: Cashout[];
  gates: CashoutGate[];
  selectedLoan?: string;
  depositError?: string;
}) {
  const { t, locale } = useLanguage();
  const defaultLoanId = selectedLoan && loans.some((loan) => loan.id === selectedLoan) ? selectedLoan : (loans[0]?.id ?? '');
  const [loanId, setLoanId] = useState(defaultLoanId);
  const gateMap = useMemo(() => new Map(gates.map((gate) => [gate.loanId, gate])), [gates]);
  const activeGate = gateMap.get(loanId);
  const [depositOpen, setDepositOpen] = useState(Boolean(activeGate && !activeGate.depositVerified));
  const [cashoutState, cashoutActionState] = useActionState(cashoutAction, initial);
  const [depositState, depositPaymentAction] = useActionState(submitCashoutDepositPaymentAction, initial);
  const [paymentMethod, setPaymentMethod] = useState('bkash');
  const [cashoutMethod, setCashoutMethod] = useState('bkash');
  const depositVerified = Boolean(activeGate?.depositVerified);

  function selectLoan(nextLoanId: string) {
    setLoanId(nextLoanId);
    const nextGate = gateMap.get(nextLoanId);
    setDepositOpen(Boolean(nextGate && !nextGate.depositVerified));
  }

  return <>
    <div className="page-stack">
      <section className="mobile-top-title-card">
        <div className="mobile-page-icon"><Banknote size={22} /></div>
        <div>
          <h1 className="section-title">{t('requestCashout')}</h1>
          <p className="muted">{t('cashoutTransferHelp')}</p>
        </div>
      </section>

      <div className="content-grid compact-main-grid">
        <section className="form-card mobile-form-shell">
          <ActionMessage state={cashoutState}/>
          {depositError ? <div className="alert error" style={{marginBottom:16}}>{depositError}</div> : null}

          {activeGate && !depositVerified ? <div className="cashout-lock-notice">
            <div className="cashout-lock-icon"><LockKeyhole size={22}/></div>
            <div><strong>{t('oneTimeDepositRequired')}</strong><p>{t('depositOnlyFirstCashoutHelp')}</p></div>
            <button type="button" className="secondary-btn" onClick={() => setDepositOpen(true)}>{t('deposit')}</button>
          </div> : null}

          {activeGate && depositVerified ? <div className="cashout-deposit-verified"><CheckCircle2 size={22}/><div><strong>{t('depositVerifiedOnce')}</strong><p>{t('fullLoanCashoutNote')}</p></div></div> : null}

          <form action={cashoutActionState} className="form-grid">
            <div className="field"><label>{t('myLoans')}</label><select className="select" name="loan_application_id" value={loanId} onChange={(event) => selectLoan(event.target.value)} required><option value="" disabled>—</option>{loans.map((loan) => <option key={loan.id} value={loan.id}>{loan.application_no} — {money(loan.approved_amount || loan.requested_amount, locale)}</option>)}</select></div>

            {activeGate ? <div className="cashout-net-summary">
              <div><span>{t('approvedLoan')}</span><strong>{money(activeGate.approvedAmount, locale)}</strong></div>
              <div><span>{t('oneTimeCashoutDeposit')}</span><strong>{activeGate.depositAmount > 0 ? money(activeGate.depositAmount, locale) : t('waitingAdmin')}</strong></div>
              <div className="cashout-net-total"><span>{t('cashoutAvailable')}</span><strong>{money(activeGate.maxCashout, locale)}</strong></div>
            </div> : null}

            <div className="field"><label>{t('amount')}</label><input className="input" type="number" name="requested_amount" min="1" max={activeGate?.maxCashout || undefined} defaultValue={depositVerified && activeGate && activeGate.maxCashout > 0 ? activeGate.maxCashout : undefined} disabled={!depositVerified} required/>{activeGate ? <span className="muted small">{t('maximumCashout')}: {money(activeGate.maxCashout, locale)}</span> : null}</div>

            <div className="field"><label>{t('paymentMethod')}</label><div className="payment-method-grid">{methods.map(({value,label,icon:Icon}) => <button type="button" key={value} className={`payment-method-button ${cashoutMethod === value ? 'active' : ''}`} onClick={() => setCashoutMethod(value)} disabled={!depositVerified}><Icon size={19}/><span>{label}</span></button>)}</div><input type="hidden" name="payment_method" value={cashoutMethod}/></div>
            {cashoutMethod !== 'bank' ? <div className="field"><label>{t('mobileNumber')}</label><input className="input" name="mobile_number" disabled={!depositVerified}/></div> : <div className="form-grid two"><div className="field"><label>{t('bankName')}</label><input className="input" name="bank_name" disabled={!depositVerified}/></div><div className="field"><label>{t('accountName')}</label><input className="input" name="bank_account_name" disabled={!depositVerified}/></div><div className="field"><label>{t('accountNumber')}</label><input className="input" name="bank_account_number" disabled={!depositVerified}/></div><div className="field"><label>Branch</label><input className="input" name="bank_branch" disabled={!depositVerified}/></div></div>}
            <SubmitButton className="primary-btn full-btn" disabled={!depositVerified || Boolean(activeGate && activeGate.maxCashout <= 0)}>{t('requestCashout')}</SubmitButton>
          </form>
        </section>

        <aside className="card mobile-look-card" style={{alignSelf:'start'}}><div className="card-header mobile-card-header"><div><div className="mobile-card-kicker">{t('cashout')}</div><h2 className="section-title">{t('cashoutHistory')}</h2></div></div><div className="card-body">{cashouts.length ? <div className="list">{cashouts.map((item) => <div className="list-item" key={item.id}><div><div className="list-title">{money(item.requested_amount, locale)}</div><div className="list-subtitle">{dateText(item.created_at, locale)} · {item.payment_method}</div></div><StatusBadge status={item.status}/></div>)}</div> : <EmptyState/>}</div></aside>
      </div>
    </div>

    {depositOpen && activeGate && !depositVerified ? <div className="deposit-confirm-backdrop" role="presentation" onClick={() => setDepositOpen(false)}>
      <section className="deposit-confirm-drawer deposit-workflow-drawer" role="dialog" aria-modal="true" aria-label={t('deposit')} onClick={(event) => event.stopPropagation()}>
        <div className="balance-drawer-handle" />
        <div className="deposit-confirm-head"><div className="deposit-confirm-icon"><ShieldCheck size={26}/></div><button type="button" className="icon-btn" onClick={() => setDepositOpen(false)} aria-label={t('close')}><X size={20}/></button></div>

        {activeGate.depositAmount <= 0 ? <div className="deposit-status-panel waiting"><Clock3 size={32}/><h2>{t('waitingAdmin')}</h2><p>{t('adminMustSetProfileDeposit')}</p></div> : null}

        {activeGate.depositAmount > 0 && activeGate.depositStatus === 'submitted' ? <div className="deposit-status-panel waiting"><Clock3 size={32}/><h2>{t('paymentSubmitted')}</h2><p>{t('waitingDepositVerification')}</p><div className="deposit-amount-inline">{money(activeGate.depositAmount, locale)}</div></div> : null}

        {activeGate.depositAmount > 0 && activeGate.depositStatus !== 'submitted' ? <>
          <h2>{t('associationDepositBeforeCashout')}</h2>
          <p className="deposit-confirm-instruction">{t('pleasePayDepositConfirmAdmin')}</p>
          <p className="muted deposit-confirm-copy">{t('depositRateHelp')}</p>
          {activeGate.depositStatus === 'payment_rejected' && activeGate.depositAdminNote ? <div className="alert error" style={{marginBottom:16}}>{activeGate.depositAdminNote}</div> : null}
          <div className="deposit-calculation-card"><div><span>{t('approvedLoan')}</span><strong>{money(activeGate.approvedAmount, locale)}</strong></div><div><span>{t('depositRate')}</span><strong>0.1%</strong></div></div>
          <div className="deposit-amount-hero"><span>{t('calculatedDepositAmount')}</span><strong>{money(activeGate.depositAmount, locale)}</strong><small>{t('depositNotDeducted')}</small></div>
          <ActionMessage state={depositState}/>
          <form action={depositPaymentAction} encType="multipart/form-data" className="form-grid">
            <input type="hidden" name="loan_application_id" value={activeGate.loanId}/>
            <div className="field"><label>{t('paymentMethod')}</label><div className="payment-method-grid">{methods.map(({value,label,icon:Icon}) => <button type="button" key={value} className={`payment-method-button ${paymentMethod === value ? 'active' : ''}`} onClick={() => setPaymentMethod(value)}><Icon size={19}/><span>{label}</span></button>)}</div><input type="hidden" name="payment_method" value={paymentMethod}/></div>
            <div className="field"><label>{t('receiverReference')}</label><input className="input" name="receiver_reference" placeholder={paymentMethod === 'bank' ? t('bankReferencePlaceholder') : t('walletNumberPlaceholder')}/></div>
            <div className="field"><label>{t('transactionId')}</label><input className="input" name="transaction_id" required/></div>
            <div className="field"><label>{t('screenshot')}</label><label className="upload-dropzone compact"><Banknote size={22}/><strong>{t('screenshot')}</strong><span>{t('uploadDepositProof')}</span><input type="file" name="payment_screenshot" accept="image/*,.pdf"/></label></div>
            <SubmitButton className="primary-btn full-btn">{t('submitDepositPayment')}</SubmitButton>
          </form>
        </> : null}
      </section>
    </div> : null}
  </>;
}
