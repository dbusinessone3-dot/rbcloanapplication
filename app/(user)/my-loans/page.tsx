import { LoansView } from '@/components/loans-view';
import { requireUser } from '@/lib/auth';
import type { LoanApplication } from '@/lib/types';

export default async function MyLoansPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('loan_applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  return <LoansView loans={(data ?? []) as LoanApplication[]}/>;
}
