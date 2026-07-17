import { notFound } from 'next/navigation';
import { AdminLoanDetail } from '@/components/admin-loan-detail';
import { requireAdmin } from '@/lib/auth';
import { normalizeLoanDefaults } from '@/lib/loan-settings';
import type { LoanApplication } from '@/lib/types';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: loan }, { data: setting }] = await Promise.all([
    supabase.from('loan_applications').select('*, profiles(full_name,email,phone)').eq('id', id).maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'loan_defaults').maybeSingle(),
  ]);

  if (!loan) notFound();
  return <AdminLoanDetail loan={loan as unknown as LoanApplication} loanDefaults={normalizeLoanDefaults(setting?.value)}/>;
}
