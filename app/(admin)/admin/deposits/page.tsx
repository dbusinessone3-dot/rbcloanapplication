import { AdminDepositsView } from '@/components/admin-deposits-view';
import { requireAdmin } from '@/lib/auth';
import type { LoanDeposit } from '@/lib/types';
export default async function Page(){const{supabase}=await requireAdmin();const{data}=await supabase.from('loan_deposits').select('*, profiles(full_name,email,phone), loan_applications(application_no)').order('created_at',{ascending:false});return <AdminDepositsView items={(data??[]) as unknown as LoanDeposit[]}/>;}
