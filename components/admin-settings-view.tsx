'use client';

import { Building2, Settings2, Smartphone } from 'lucide-react';
import { updateApplicationPaymentSettingsAction, updateLoanDefaultsAction } from '@/app/(admin)/admin/actions';
import { useLanguage } from '@/components/language-provider';
import { SubmitButton } from '@/components/submit-button';
import type { ApplicationPaymentSettings, LoanDefaults } from '@/lib/types';

export function AdminSettingsView({
  loanDefaults,
  paymentSettings,
}: {
  loanDefaults: LoanDefaults;
  paymentSettings: ApplicationPaymentSettings;
}) {
  const { t } = useLanguage();

  return <div className="admin-settings-stack">
    <section className="form-card" style={{maxWidth:820}}>
      <div className="section-head">
        <div><h1 className="section-title">{t('loanDefaults')}</h1><p className="muted">{t('adminManagedRates')}</p></div>
        <Settings2 color="var(--red)"/>
      </div>
      <form action={updateLoanDefaultsAction} className="form-grid two">
        <div className="field">
          <label>{t('interestRate')} (%)</label>
          <input className="input" type="number" name="interest_rate" min="0" max="100" step="0.01" defaultValue={loanDefaults.interest_rate} required/>
        </div>
        <div className="field">
          <label>{t('serviceChargeRate')} (%)</label>
          <input className="input" type="number" name="service_charge_rate" min="0" max="100" step="0.01" defaultValue={loanDefaults.service_charge_rate} required/>
        </div>
        <div className="field">
          <label>{t('savingsPercentage')} (%)</label>
          <input className="input" type="number" name="savings_percentage" min="0" max="100" step="0.01" defaultValue={loanDefaults.savings_percentage} required/>
        </div>
        <div style={{gridColumn:'1/-1'}}><SubmitButton>{t('save')}</SubmitButton></div>
      </form>
    </section>

    <section className="form-card" style={{maxWidth:820}}>
      <div className="section-head">
        <div>
          <h2 className="section-title">{t('applicationPaymentReceivers')}</h2>
          <p className="muted">{t('applicationPaymentReceiversHelp')}</p>
        </div>
        <Smartphone color="var(--red)"/>
      </div>
      <form action={updateApplicationPaymentSettingsAction} className="form-grid two">
        <div className="field"><label>bKash {t('receiverNumber')}</label><input className="input" name="bkash_number" defaultValue={paymentSettings.bkash_number} placeholder="01XXXXXXXXX"/></div>
        <div className="field"><label>Nagad {t('receiverNumber')}</label><input className="input" name="nagad_number" defaultValue={paymentSettings.nagad_number} placeholder="01XXXXXXXXX"/></div>
        <div className="field"><label>Rocket {t('receiverNumber')}</label><input className="input" name="rocket_number" defaultValue={paymentSettings.rocket_number} placeholder="01XXXXXXXXX"/></div>
        <div className="field"><label>{t('bankName')}</label><input className="input" name="bank_name" defaultValue={paymentSettings.bank_name}/></div>
        <div className="field"><label>{t('accountName')}</label><input className="input" name="bank_account_name" defaultValue={paymentSettings.bank_account_name}/></div>
        <div className="field"><label>{t('accountNumber')}</label><input className="input" name="bank_account_number" defaultValue={paymentSettings.bank_account_number}/></div>
        <div className="field"><label>Branch</label><input className="input" name="bank_branch" defaultValue={paymentSettings.bank_branch}/></div>
        <div className="application-payment-admin-note" style={{gridColumn:'1/-1'}}><Building2 size={18}/><span>{t('paymentReceiverSecurityNote')}</span></div>
        <div style={{gridColumn:'1/-1'}}><SubmitButton>{t('save')}</SubmitButton></div>
      </form>
    </section>
  </div>;
}
