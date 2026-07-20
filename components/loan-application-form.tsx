'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Clock3, FileUp, RefreshCw, ReceiptText, Send, ShieldCheck, Smartphone, UserRound, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { applyLoanAction, submitLoanApplicationPaymentAction } from '@/app/(user)/actions';
import { useLanguage } from '@/components/language-provider';
import { ActionMessage } from '@/components/action-message';
import { SubmitButton } from '@/components/submit-button';
import { calculateLoan, money } from '@/lib/format';
import type { ActionState, ApplicationPaymentSettings, LoanApplicationPayment, LoanDefaults, Profile } from '@/lib/types';

const initialState: ActionState = { ok: false, message: '' };
const amountChoices = [500000, 700000, 1000000, 1500000, 2000000, 3000000];
const durationChoices = [6, 12, 18, 24, 36, 48];
const paymentMethods = [
  { value: 'bkash', label: 'bKash', icon: Smartphone },
  { value: 'nagad', label: 'Nagad', icon: Smartphone },
  { value: 'rocket', label: 'Rocket', icon: Send },
  { value: 'bank', label: 'Bank', icon: Building2 },
] as const;

type PaymentMethod = typeof paymentMethods[number]['value'];

export function LoanApplicationForm({
  profile,
  loanDefaults,
  paymentSettings,
  payments,
  paymentSetupError,
}: {
  profile: Profile | null;
  loanDefaults: LoanDefaults;
  paymentSettings: ApplicationPaymentSettings;
  payments: LoanApplicationPayment[];
  paymentSetupError?: string | null;
}) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [loanState, loanAction] = useActionState(applyLoanAction, initialState);
  const [paymentState, paymentAction] = useActionState(submitLoanApplicationPaymentAction, initialState);
  const initialPayment = payments.find((item) => item.status === 'verified') || payments.find((item) => item.status === 'submitted') || payments[0] || null;
  const [amount, setAmount] = useState(Number(initialPayment?.requested_amount || 500000));
  const [months, setMonths] = useState(24);
  const configuredMethods = useMemo(() => paymentMethods.filter(({ value }) => {
    if (value === 'bkash') return Boolean(paymentSettings.bkash_number);
    if (value === 'nagad') return Boolean(paymentSettings.nagad_number);
    if (value === 'rocket') return Boolean(paymentSettings.rocket_number);
    return Boolean(paymentSettings.bank_account_number);
  }), [paymentSettings]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(configuredMethods[0]?.value || 'bkash');

  const estimate = useMemo(
    () => calculateLoan(amount, months, loanDefaults.interest_rate, loanDefaults.service_charge_rate, loanDefaults.savings_percentage),
    [amount, months, loanDefaults],
  );

  const latestPayment = payments.find((item) => Number(item.requested_amount) === amount) || null;
  const latestMatchesAmount = Boolean(latestPayment && Number(latestPayment.requested_amount) === amount);
  const latestMatchesPayment = Boolean(latestMatchesAmount && Math.abs(Number(latestPayment?.expected_amount || 0) - estimate.savings) < 0.01);
  const paymentReady = Boolean(latestPayment?.status === 'verified' && latestMatchesPayment);
  const paymentWaiting = Boolean(latestPayment?.status === 'submitted' && latestMatchesPayment);
  const paymentRejected = Boolean(latestPayment?.status === 'rejected' && latestMatchesAmount);

  useEffect(() => {
    if (!paymentWaiting) return;
    const timer = window.setInterval(() => router.refresh(), 7000);
    return () => window.clearInterval(timer);
  }, [paymentWaiting, router]);

  const receiverDetails = useMemo(() => {
    if (paymentMethod === 'bkash') return { primary: paymentSettings.bkash_number, secondary: 'bKash receiver number' };
    if (paymentMethod === 'nagad') return { primary: paymentSettings.nagad_number, secondary: 'Nagad receiver number' };
    if (paymentMethod === 'rocket') return { primary: paymentSettings.rocket_number, secondary: 'Rocket receiver number' };
    return {
      primary: paymentSettings.bank_account_number,
      secondary: [paymentSettings.bank_name, paymentSettings.bank_account_name, paymentSettings.bank_branch].filter(Boolean).join(' • '),
    };
  }, [paymentMethod, paymentSettings]);

  return (
    <div className="content-grid application-layout">
      <div className="application-main-column">
        <form id="loan-application-main" action={loanAction} className="form-card mobile-form-shell" encType="multipart/form-data">
          <div className="application-top-strip">
            <div>
              <span>{t('selected')}</span>
              <strong>{money(amount, locale)} • {months} {t('months')}</strong>
              <small>{t('monthlyInstallment')}: {money(estimate.monthly, locale)}</small>
            </div>
          </div>

          <div className="section-head">
            <div><h1 className="section-title">{t('applyLoan')}</h1><p className="muted">{t('secureMessage')}</p></div>
            <ShieldCheck color="var(--red)" />
          </div>
          <ActionMessage state={loanState} />

          <input type="hidden" name="duration_months" value={months} />

          <section className="form-section">
            <div className="section-pill"><UserRound size={18} /> {t('applicantInfo')}</div>
            <div className="form-grid two">
              <div className="field"><label>{t('fullName')}</label><input className="input" value={profile?.full_name ?? ''} readOnly /></div>
              <div className="field"><label>{t('phone')}</label><input className="input" value={profile?.phone ?? ''} readOnly /></div>
              <div className="field"><label>{t('country')}</label><input className="input" name="country" defaultValue={profile?.country ?? 'Bangladesh'} required /></div>
              <div className="field"><label>{t('employmentType')}</label><select className="select" name="employment_type" required defaultValue=""><option value="" disabled>—</option><option value="salaried">Salaried</option><option value="business">Business</option><option value="freelancer">Freelancer</option><option value="student">Student</option><option value="other">Other</option></select></div>
              <div className="field"><label>{t('monthlyIncome')}</label><input className="input" type="number" name="monthly_income" min="0" required /></div>
              <div className="field"><label>Passport</label><input className="input" name="passport_number" placeholder="AB1234567" /></div>
            </div>
          </section>

          <section className="form-section">
            <div className="section-pill">{t('loanInfo')}</div>
            <div className="form-grid">
              <div className="field">
                <label>{t('amount')}</label>
                <div className="chip-grid chip-grid-3">
                  {amountChoices.map((choice) => <button key={choice} type="button" className={`choice-chip ${amount === choice ? 'active' : ''}`} onClick={() => setAmount(choice)}>৳{Math.round(choice / 1000)}K</button>)}
                </div>
                <div className="manual-amount-box">
                  <label htmlFor="requested_amount">{t('customLoanAmount')}</label>
                  <div className="manual-amount-input-wrap"><span>৳</span><input className="input manual-amount-input" id="requested_amount" type="number" name="requested_amount" min="1000" step="1000" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value) || 0)} placeholder="Enter required loan amount" required /></div>
                  <small>{t('customLoanAmountHelp')}</small>
                </div>
              </div>
              <div className="field">
                <label>{t('duration')}</label>
                <div className="chip-grid chip-grid-3">{durationChoices.map((choice) => <button key={choice} type="button" className={`choice-chip ${months === choice ? 'active' : ''}`} onClick={() => setMonths(choice)}>{choice} {t('months')}</button>)}</div>
              </div>
              <div className="field"><label>{t('purpose')}</label><textarea className="textarea" name="loan_purpose" required /></div>
            </div>
          </section>

          <section className="form-section">
            <div className="section-pill">{t('documentUpload')}</div>
            <div className="form-grid two">
              <label className="upload-dropzone compact"><FileUp size={22} /><strong>{t('nidFront')}</strong><span>NID front side image</span><input type="file" name="nid_front" accept="image/*,.pdf" required /></label>
              <label className="upload-dropzone compact"><FileUp size={22} /><strong>{t('nidBack')}</strong><span>NID back side image</span><input type="file" name="nid_back" accept="image/*,.pdf" required /></label>
              <label className="upload-dropzone compact"><FileUp size={22} /><strong>Applicant photo</strong><span>Upload passport style photo</span><input type="file" name="income_proof" accept="image/*,.pdf" /></label>
            </div>
          </section>

          <section className="form-section">
            <div className="section-pill">🤝 {t('guarantorInfo')}</div>
            <div className="form-grid two">
              <div className="field"><label>{t('fullName')}</label><input className="input" name="guarantor_name" required /></div>
              <div className="field"><label>{t('nidNumber')}</label><input className="input" name="guarantor_nid" /></div>
              <div className="field"><label>{t('relation')}</label><input className="input" name="guarantor_relation" required /></div>
              <div className="field"><label>{t('phone')}</label><input className="input" name="guarantor_phone" required /></div>
              <div className="field"><label>{t('email')}</label><input className="input" type="email" name="guarantor_email" /></div>
              <div className="field"><label>{t('address')}</label><input className="input" name="guarantor_address" /></div>
            </div>
          </section>

          <section className="form-section">
            <div className="section-pill">👤 {t('nomineeInfo')}</div>
            <div className="form-grid two">
              <div className="field"><label>{t('fullName')}</label><input className="input" name="nominee_name" required /></div>
              <div className="field"><label>{t('nidNumber')}</label><input className="input" name="nominee_nid" /></div>
              <div className="field"><label>{t('relation')}</label><input className="input" name="nominee_relation" required /></div>
              <div className="field"><label>{t('phone')}</label><input className="input" name="nominee_phone" required /></div>
              <div className="field"><label>{t('email')}</label><input className="input" type="email" name="nominee_email" /></div>
              <div className="field"><label>{t('address')}</label><input className="input" name="nominee_address" /></div>
            </div>
          </section>
        </form>

        <section className="form-card mobile-form-shell application-payment-step">
          {paymentSetupError ? <div className="alert error application-payment-setup-error"><strong>Application payment setup is incomplete.</strong><span>{paymentSetupError}</span></div> : null}
          <div className="payment-step-heading">
            <div className="payment-proof-icon"><ReceiptText size={22}/></div>
            <div><h2>{t('applicationPayment')}</h2><p>{t('applicationPaymentHelp')}</p></div>
          </div>

          <div className="application-payment-amount">
            <span>{t('applicationFeeAmount')}</span>
            <strong>{money(estimate.savings, locale)}</strong>
            <small>{loanDefaults.savings_percentage}% of {money(amount, locale)}</small>
          </div>

          {paymentReady ? <div className="application-payment-status verified"><CheckCircle2 size={24}/><div><strong>{t('paymentApproved')}</strong><p>{t('paymentApprovedHelp')}</p></div></div> : null}
          {paymentWaiting ? <div className="application-payment-status waiting application-payment-waiting-row"><Clock3 size={24}/><div><strong>{t('waitingAdmin')}</strong><p>{t('applicationPaymentWaiting')}</p></div><button type="button" className="secondary-btn payment-status-refresh" onClick={() => router.refresh()}><RefreshCw size={17}/>{t('checkApprovalStatus')}</button></div> : null}
          {paymentRejected ? <div className="application-payment-status rejected"><XCircle size={24}/><div><strong>{t('paymentRejected')}</strong><p>{latestPayment?.admin_note || t('applicationPaymentRejectedHelp')}</p></div></div> : null}

          {!paymentSetupError && !paymentReady && !paymentWaiting ? <>
            <ActionMessage state={paymentState}/>
            {configuredMethods.length ? <form action={paymentAction} className="form-grid" encType="multipart/form-data">
              <input type="hidden" name="requested_amount" value={amount}/>
              <input type="hidden" name="receiver_reference" value={receiverDetails.primary}/>
              <div className="field">
                <label>{t('paymentMethod')}</label>
                <div className="payment-method-grid">{configuredMethods.map(({value,label,icon:Icon}) => <button type="button" key={value} className={`payment-method-button ${paymentMethod === value ? 'active' : ''}`} onClick={() => setPaymentMethod(value)}><Icon size={19}/><span>{label}</span></button>)}</div>
                <input type="hidden" name="payment_method" value={paymentMethod}/>
              </div>
              <div className="receiver-information-card">
                <span>{t('payTo')}</span>
                <strong>{receiverDetails.primary || '—'}</strong>
                <small>{receiverDetails.secondary || t('receiverNumber')}</small>
              </div>
              <div className="field"><label>{t('transactionId')}</label><input className="input" name="transaction_id" required placeholder="Enter transaction ID or bank reference"/></div>
              <div className="field"><label>{t('screenshot')}</label><label className="upload-dropzone compact"><FileUp size={22}/><strong>{t('paymentProofUploaded')}</strong><span>Upload payment screenshot or receipt</span><input type="file" name="payment_screenshot" accept="image/*,.pdf" required/></label></div>
              <SubmitButton>{t('submitPaymentForApproval')}</SubmitButton>
            </form> : <div className="alert error">{t('noPaymentReceiverConfigured')}</div>}
          </> : null}
        </section>

        <div className={`final-application-submit ${paymentReady ? 'ready' : 'locked'}`}>
          <div>
            <strong>{paymentReady ? t('applicationReadyToSubmit') : t('applicationSubmitLocked')}</strong>
            <p>{paymentReady ? t('applicationReadyHelp') : t('applicationSubmitLockedHelp')}</p>
          </div>
          <button className="primary-btn" type="submit" form="loan-application-main" disabled={!paymentReady || Boolean(paymentSetupError)} aria-disabled={!paymentReady || Boolean(paymentSetupError)}>{paymentReady ? t('submitApplication') : t('waitingForFeeApproval')}</button>
        </div>
      </div>

      <aside className="form-card mobile-form-shell estimate-shell" style={{ alignSelf: 'start', position: 'sticky', top: 96 }}>
        <div className="result-highlight-card"><span>{t('monthlyInstallment')}</span><strong>{money(estimate.monthly, locale)}</strong><small>{money(amount, locale)} • {months} {t('months')}</small></div>
        <div className="summary-box-list">
          <div className="summary-row"><span className="muted">{t('interestRate')}</span><strong>{loanDefaults.interest_rate}%</strong></div>
          <div className="summary-row"><span className="muted">{t('serviceCharge')}</span><strong>{money(estimate.serviceCharge, locale)}</strong></div>
          <div className="summary-row"><span className="muted">{t('requiredSavings')}</span><strong>{money(estimate.savings, locale)}</strong></div>
          <div className="summary-row"><span className="muted">{t('totalPayable')}</span><strong>{money(estimate.total, locale)}</strong></div>
        </div>
      </aside>
    </div>
  );
}
