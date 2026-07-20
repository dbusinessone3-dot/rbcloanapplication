import type { ApplicationPaymentSettings } from '@/lib/types';

export const FALLBACK_APPLICATION_PAYMENT_SETTINGS: ApplicationPaymentSettings = {
  bkash_number: '',
  nagad_number: '',
  rocket_number: '',
  bank_name: '',
  bank_account_name: '',
  bank_account_number: '',
  bank_branch: '',
};

function safeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeApplicationPaymentSettings(value: unknown): ApplicationPaymentSettings {
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    bkash_number: safeText(record.bkash_number),
    nagad_number: safeText(record.nagad_number),
    rocket_number: safeText(record.rocket_number),
    bank_name: safeText(record.bank_name),
    bank_account_name: safeText(record.bank_account_name),
    bank_account_number: safeText(record.bank_account_number),
    bank_branch: safeText(record.bank_branch),
  };
}
