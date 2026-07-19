import { InstallmentsView } from '@/components/installments-view';
import { requireUser } from '@/lib/auth';
import type { Installment } from '@/lib/types';

export default async function InstallmentsPage() {
  const { supabase,user } = await requireUser();
  const { data } = await supabase.from('loan_installments').select('*, loan_applications(application_no)').eq('user_id',user.id).order('due_date');
  return <InstallmentsView installments={(data??[]) as Installment[]}/>;
}
