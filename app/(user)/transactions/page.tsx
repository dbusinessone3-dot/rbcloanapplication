import { TransactionsView } from '@/components/transactions-view';
import { requireUser } from '@/lib/auth';
import type { Transaction } from '@/lib/types';

export default async function TransactionsPage() {
  const {supabase,user}=await requireUser();
  const {data}=await supabase.from('transactions').select('*').eq('user_id',user.id).order('created_at',{ascending:false});
  return <TransactionsView transactions={(data??[]) as Transaction[]}/>;
}
