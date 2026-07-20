export function money(value: number | string | null | undefined, locale: 'bn' | 'en' = 'en') {
  const amount = Number(value ?? 0);
  return `৳${new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

export function dateText(value: string | null | undefined, locale: 'bn' | 'en' = 'en') {
  if (!value) return '—';
  return new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function calculateLoan(amount: number, months: number, annualRate = 5, serviceRate = 2, savingsRate = 10) {
  const interest = amount * (annualRate / 100) * (months / 12);
  const serviceCharge = amount * (serviceRate / 100);
  const total = amount + interest + serviceCharge;
  return {
    interest,
    serviceCharge,
    total,
    monthly: total / Math.max(months, 1),
    savings: amount * (savingsRate / 100),
  };
}
