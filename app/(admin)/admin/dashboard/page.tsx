import { AdminDashboardView } from '@/components/admin-dashboard-view';
import { requireAdmin } from '@/lib/auth';

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const [users, loans, pending, cashouts, installments, profileReviews, depositRequests, approved] = await Promise.all([
    supabase.from('profiles').select('*', { count:'exact', head:true }),
    supabase.from('loan_applications').select('*', { count:'exact', head:true }),
    supabase.from('loan_applications').select('*', { count:'exact', head:true }).in('status', ['submitted','under_review','deposit_submitted']),
    supabase.from('loan_cashouts').select('*', { count:'exact', head:true }).in('status', ['pending','approved']),
    supabase.from('loan_installments').select('*', { count:'exact', head:true }).eq('status', 'submitted'),
    supabase.from('profiles').select('*', { count:'exact', head:true }).in('kyc_status', ['submitted','under_review']),
    supabase.from('user_cashout_deposits').select('*', { count:'exact', head:true }).eq('status', 'submitted'),
    supabase.from('loan_applications').select('approved_amount').not('approved_amount', 'is', null),
  ]);
  const total = (approved.data ?? []).reduce((sum, row) => sum + Number(row.approved_amount || 0), 0);
  return <AdminDashboardView stats={{ users:users.count ?? 0, loans:loans.count ?? 0, pending:pending.count ?? 0, cashouts:cashouts.count ?? 0, installments:installments.count ?? 0, profileReviews:profileReviews.count ?? 0, depositRequests:depositRequests.count ?? 0, approvedAmount:total }}/>;
}
