import { notFound } from 'next/navigation';
import { LoanDetailView } from '@/components/loan-detail-view';
import { requireUser } from '@/lib/auth';
import type { Installment, LoanApplication } from '@/lib/types';

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [{ data: loan }, { data: installments }] = await Promise.all([
    supabase.from('loan_applications').select('*').eq('id', id).eq('user_id', user.id).maybeSingle<LoanApplication>(),
    supabase.from('loan_installments').select('*').eq('loan_application_id', id).eq('user_id', user.id).order('installment_no'),
  ]);
  if (!loan) notFound();
  return <LoanDetailView loan={loan} installments={(installments ?? []) as Installment[]}/>;
}
