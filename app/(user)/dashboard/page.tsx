import { DashboardView } from '@/components/dashboard-view';
import { requireUser } from '@/lib/auth';
import type { LoanApplication, Transaction, Wallet } from '@/lib/types';

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireUser();
  const [{ data: wallet }, { data: currentLoan }, { data: transactions }] = await Promise.all([
    supabase.from('user_wallets').select('*').eq('user_id', user.id).maybeSingle<Wallet>(),
    supabase.from('loan_applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle<LoanApplication>(),
    supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
  ]);
  return <DashboardView profile={profile} wallet={wallet} currentLoan={currentLoan} transactions={(transactions ?? []) as Transaction[]}/>;
}
