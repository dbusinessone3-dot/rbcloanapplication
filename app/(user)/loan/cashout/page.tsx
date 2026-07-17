import { CashoutView, type CashoutGate } from '@/components/cashout-view';
import { requireUser } from '@/lib/auth';
import type { Cashout, LoanApplication, UserCashoutDeposit, Wallet } from '@/lib/types';

export default async function CashoutPage({ searchParams }: { searchParams: Promise<{ loan?: string; deposit_error?: string }> }) {
  const { loan, deposit_error: depositError } = await searchParams;
  const { supabase, user, profile } = await requireUser();

  const [{ data: loans }, { data: cashouts }, { data: oneTimeDeposit }, { data: wallet }] = await Promise.all([
    supabase.from('loan_applications').select('*').eq('user_id', user.id).in('status', ['approved','cashout_requested','cashout_completed','running']).order('created_at', { ascending:false }),
    supabase.from('loan_cashouts').select('*').eq('user_id', user.id).order('created_at', { ascending:false }),
    supabase.from('user_cashout_deposits').select('*').eq('user_id', user.id).maybeSingle<UserCashoutDeposit>(),
    supabase.from('user_wallets').select('*').eq('user_id', user.id).maybeSingle<Wallet>(),
  ]);

  const loanRows = (loans ?? []) as LoanApplication[];
  const cashoutRows = (cashouts ?? []) as Cashout[];
  const availableBalance = Number(wallet?.available_balance || 0);
  const storedDepositAmount = Number(oneTimeDeposit?.deposit_amount || 0);
  const depositVerified = Boolean(profile?.cashout_deposit_verified_at && oneTimeDeposit?.status === 'verified');
  const depositStatus = depositVerified ? 'verified' : (oneTimeDeposit?.status ?? null);

  const gates: CashoutGate[] = loanRows.map((item) => {
    const approvedAmount = Number(item.approved_amount || item.requested_amount || 0);
    const reservedCashout = cashoutRows
      .filter((cashout) => cashout.loan_application_id === item.id && ['pending','approved','completed'].includes(cashout.status))
      .reduce((sum, cashout) => sum + Number(cashout.approved_amount || cashout.requested_amount || 0), 0);
    const maxCashout = Math.max(0, Math.min(approvedAmount - reservedCashout, availableBalance));

    return {
      loanId: item.id,
      approvedAmount,
      reservedCashout,
      maxCashout,
      depositStatus,
      depositAmount: storedDepositAmount > 0 ? storedDepositAmount : Math.round(approvedAmount * 0.001 * 100) / 100,
      depositAdminNote: oneTimeDeposit?.admin_note ?? profile?.cashout_deposit_admin_note ?? null,
      depositVerified,
    };
  });

  return <CashoutView loans={loanRows} cashouts={cashoutRows} gates={gates} selectedLoan={loan} depositError={depositError}/>;
}
