import { AdminSettingsView } from '@/components/admin-settings-view';
import { requireAdmin } from '@/lib/auth';
import { normalizeLoanDefaults } from '@/lib/loan-settings';
import { normalizeApplicationPaymentSettings } from '@/lib/application-payment-settings';

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: loanSetting }, { data: paymentSetting }] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'loan_defaults').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'loan_application_payment_methods').maybeSingle(),
  ]);

  return <AdminSettingsView
    loanDefaults={normalizeLoanDefaults(loanSetting?.value)}
    paymentSettings={normalizeApplicationPaymentSettings(paymentSetting?.value)}
  />;
}
