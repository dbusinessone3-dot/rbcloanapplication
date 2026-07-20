import { LoanApplicationForm } from '@/components/loan-application-form';
import { requireUser } from '@/lib/auth';
import { normalizeLoanDefaults } from '@/lib/loan-settings';
import { normalizeApplicationPaymentSettings } from '@/lib/application-payment-settings';
import type { LoanApplicationPayment } from '@/lib/types';
import { APPLICATION_PAYMENT_SETUP_MESSAGE, isApplicationPaymentSchemaError } from '@/lib/application-payment-errors';

export default async function ApplyLoanPage() {
  const { supabase, profile, user } = await requireUser();
  const [{ data: loanSetting }, { data: paymentSetting }, { data: payments, error: paymentsError }] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'loan_defaults').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'loan_application_payment_methods').maybeSingle(),
    supabase.from('loan_application_payments')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['submitted', 'verified', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return <LoanApplicationForm
    profile={profile}
    loanDefaults={normalizeLoanDefaults(loanSetting?.value)}
    paymentSettings={normalizeApplicationPaymentSettings(paymentSetting?.value)}
    payments={(payments ?? []) as LoanApplicationPayment[]}
    paymentSetupError={paymentsError && isApplicationPaymentSchemaError(paymentsError) ? APPLICATION_PAYMENT_SETUP_MESSAGE : paymentsError?.message ?? null}
  />;
}
