import { AdminCashoutDepositsView } from '@/components/admin-cashout-deposits-view';
import { requireAdmin } from '@/lib/auth';
import type { UserCashoutDeposit } from '@/lib/types';

export default async function AdminCashoutDepositsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from('user_cashout_deposits')
    .select('*, profiles:profiles!user_cashout_deposits_user_id_fkey(full_name,email,phone,cashout_deposit_verified_at), loan_applications:loan_applications!user_cashout_deposits_loan_application_id_fkey(application_no,approved_amount,requested_amount)')
    .order('updated_at', { ascending:false });

  const rows = (data ?? []) as unknown as UserCashoutDeposit[];
  const items = await Promise.all(rows.map(async (item) => {
    if (!item.payment_screenshot_path) return { ...item, payment_screenshot_url: null };
    const { data: signed } = await supabase.storage.from('payment-proofs').createSignedUrl(item.payment_screenshot_path, 60 * 15);
    return { ...item, payment_screenshot_url: signed?.signedUrl ?? null };
  }));

  return <AdminCashoutDepositsView items={items}/>;
}
