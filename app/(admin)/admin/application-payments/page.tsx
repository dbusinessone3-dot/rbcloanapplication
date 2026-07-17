import { AdminApplicationPaymentsView } from '@/components/admin-application-payments-view';
import { requireAdmin } from '@/lib/auth';
import type { LoanApplicationPayment } from '@/lib/types';

export default async function AdminApplicationPaymentsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from('loan_application_payments')
    .select('*, profiles:profiles!loan_application_payments_user_id_fkey(full_name,email,phone)')
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as unknown as LoanApplicationPayment[];
  const items = await Promise.all(rows.map(async (item) => {
    if (!item.payment_screenshot_path) return { ...item, payment_screenshot_url: null };
    const { data: signed } = await supabase.storage.from('payment-proofs').createSignedUrl(item.payment_screenshot_path, 60 * 15);
    return { ...item, payment_screenshot_url: signed?.signedUrl ?? null };
  }));

  return <AdminApplicationPaymentsView items={items}/>;
}
