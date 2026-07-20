import { CalculatorView } from '@/components/calculator-view';
import { requireUser } from '@/lib/auth';
import { normalizeLoanDefaults } from '@/lib/loan-settings';

export default async function CalculatorPage() {
  const { supabase } = await requireUser();
  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'loan_defaults')
    .maybeSingle();

  return <CalculatorView loanDefaults={normalizeLoanDefaults(setting?.value)}/>;
}
