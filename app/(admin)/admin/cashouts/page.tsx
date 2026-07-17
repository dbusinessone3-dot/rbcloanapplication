import { AdminCashoutsView } from '@/components/admin-cashouts-view';
import { requireAdmin } from '@/lib/auth';
import type { Cashout, UserCashoutDeposit } from '@/lib/types';

export default async function Page() {
  const { supabase } = await requireAdmin();

  const [{ data: cashouts }, { data: deposits }] = await Promise.all([
    supabase
      .from('loan_cashouts')
      .select('*, profiles(full_name,email,phone,cashout_deposit_verified_at), loan_applications(application_no)')
      .order('created_at', { ascending: false }),
    supabase
      .from('user_cashout_deposits')
      .select('*, profiles:profiles!user_cashout_deposits_user_id_fkey(full_name,email,phone,cashout_deposit_verified_at), loan_applications:loan_applications!user_cashout_deposits_loan_application_id_fkey(application_no,approved_amount,requested_amount)')
      .in('status', ['submitted', 'payment_rejected', 'verified'])
      .order('updated_at', { ascending: false }),
  ]);

  const depositRows = (deposits ?? []) as unknown as UserCashoutDeposit[];
  const depositItems = await Promise.all(depositRows.map(async (item) => {
    if (!item.payment_screenshot_path) return { ...item, payment_screenshot_url: null };
    const { data: signed } = await supabase.storage.from('payment-proofs').createSignedUrl(item.payment_screenshot_path, 60 * 15);
    return { ...item, payment_screenshot_url: signed?.signedUrl ?? null };
  }));

  return <AdminCashoutsView items={(cashouts ?? []) as unknown as Cashout[]} depositItems={depositItems} />;
}
