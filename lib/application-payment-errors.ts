export function isApplicationPaymentSchemaError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string; details?: string };
  const message = `${candidate.message ?? ''} ${candidate.details ?? ''}`.toLowerCase();
  return candidate.code === 'PGRST205'
    || candidate.code === '42P01'
    || message.includes("loan_application_payments") && (
      message.includes('schema cache')
      || message.includes('could not find the table')
      || message.includes('relation') && message.includes('does not exist')
    );
}

export const APPLICATION_PAYMENT_SETUP_MESSAGE =
  'The application-payment database table is not installed or Supabase has not refreshed it yet. Run supabase/patch-v15-create-loan-application-payments-and-reload.sql in Supabase SQL Editor, confirm the verification result, then refresh this page.';
