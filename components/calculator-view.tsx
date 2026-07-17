'use client';

import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { calculateLoan, money } from '@/lib/format';
import type { LoanDefaults } from '@/lib/types';

const amountOptions = [500000, 700000, 1000000, 1500000, 2000000, 3000000];
const monthOptions = [3, 6, 9, 12, 18, 24];

export function CalculatorView({ loanDefaults }: { loanDefaults: LoanDefaults }) {
  const { t, locale } = useLanguage();
  const [amount, setAmount] = useState(500000);
  const [months, setMonths] = useState(6);
  const result = useMemo(
    () => calculateLoan(amount, months, loanDefaults.interest_rate, loanDefaults.service_charge_rate, loanDefaults.savings_percentage),
    [amount, months, loanDefaults],
  );

  return (
    <div className="page-stack">
      <section className="mobile-top-title-card">
        <div className="mobile-page-icon"><Calculator size={22} /></div>
        <div>
          <h1 className="section-title">{t('calculator')}</h1>
          <p className="muted">{t('calculatorHelp')}</p>
        </div>
      </section>

      <section className="content-grid compact-main-grid">
        <div className="form-card mobile-form-shell">
          <div className="soft-header-block center-block">
            <div className="soft-header-kicker">{t('calculator')}</div>
            <h2>{t('monthlyInstallment')}</h2>
            <p>{t('adminManagedRates')}</p>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>{t('amount')}</label>
              <div className="chip-grid chip-grid-3">
                {amountOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`choice-chip ${amount === option ? 'active' : ''}`}
                    onClick={() => setAmount(option)}
                  >
                    ৳{Math.round(option / 1000)}K
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Custom {t('amount')}</label>
              <input className="input" type="number" min="1000" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
            </div>

            <div className="field">
              <label>{t('duration')}</label>
              <div className="chip-grid chip-grid-3">
                {monthOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`choice-chip ${months === option ? 'active' : ''}`}
                    onClick={() => setMonths(option)}
                  >
                    {option} {t('months')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="form-card mobile-form-shell result-shell">
          <div className="result-highlight-card">
            <span>{t('monthlyInstallment')}</span>
            <strong>{money(result.monthly, locale)}</strong>
            <small>{t('interestRate')} {loanDefaults.interest_rate}%</small>
          </div>

          <div className="summary-box-list">
            <div className="summary-row"><span className="muted">{t('interestRate')}</span><strong>{loanDefaults.interest_rate}%</strong></div>
            <div className="summary-row"><span className="muted">{t('serviceCharge')}</span><strong>{money(result.serviceCharge, locale)}</strong></div>
            <div className="summary-row"><span className="muted">{t('requiredSavings')}</span><strong>{money(result.savings, locale)}</strong></div>
            <div className="summary-row"><span className="muted">{t('totalPayable')}</span><strong>{money(result.total, locale)}</strong></div>
          </div>
        </aside>
      </section>
    </div>
  );
}
