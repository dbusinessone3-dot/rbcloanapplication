import type { LoanDefaults } from '@/lib/types';

export const FALLBACK_LOAN_DEFAULTS: LoanDefaults = {
  interest_rate: 5,
  service_charge_rate: 2,
  savings_percentage: 10,
};

function safeRate(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : fallback;
}

export function normalizeLoanDefaults(value: unknown): LoanDefaults {
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    interest_rate: safeRate(record.interest_rate, FALLBACK_LOAN_DEFAULTS.interest_rate),
    service_charge_rate: safeRate(record.service_charge_rate, FALLBACK_LOAN_DEFAULTS.service_charge_rate),
    savings_percentage: safeRate(record.savings_percentage, FALLBACK_LOAN_DEFAULTS.savings_percentage),
  };
}
