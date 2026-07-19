-- RBC Loan App v3 patch
-- Securely reserve the required fixed deposit from the approved loan balance
-- before the user can submit a cash out request.

create unique index if not exists loan_deposits_one_auto_deduction_per_loan_idx
on public.loan_deposits(loan_application_id)
where payment_method = 'loan_balance_deduction' and status = 'verified';

create or replace function public.prepare_cashout_fixed_deposit(p_loan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_loan public.loan_applications%rowtype;
  v_wallet public.user_wallets%rowtype;
  v_required numeric(14,2) := 0;
  v_verified numeric(14,2) := 0;
  v_deduction numeric(14,2) := 0;
  v_deposit_id uuid;
  v_balance_after numeric(14,2) := 0;
  v_original_status text;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select * into v_loan
  from public.loan_applications
  where id = p_loan_id and user_id = v_user
  for update;

  if not found then
    raise exception 'Loan not found';
  end if;

  if v_loan.status not in ('approved','cashout_requested','cashout_completed','running') then
    raise exception 'Loan is not eligible for cash out';
  end if;

  v_original_status := v_loan.status;

  select * into v_wallet
  from public.user_wallets
  where user_id = v_user
  for update;

  if not found then
    raise exception 'Wallet not found';
  end if;

  v_required := greatest(coalesce(v_loan.required_savings_amount, 0), 0);

  select coalesce(sum(amount), 0) into v_verified
  from public.loan_deposits
  where loan_application_id = p_loan_id
    and user_id = v_user
    and status = 'verified';

  v_deduction := greatest(v_required - v_verified, 0);

  if v_deduction > 0 then
    if coalesce(v_wallet.available_balance, 0) < v_deduction then
      raise exception 'Available loan balance is lower than the required fixed deposit';
    end if;

    insert into public.loan_deposits (
      loan_application_id,
      user_id,
      amount,
      payment_method,
      transaction_id,
      status,
      verified_at,
      admin_note
    ) values (
      p_loan_id,
      v_user,
      v_deduction,
      'loan_balance_deduction',
      'AUTO-DEP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
      'verified',
      now(),
      'Automatically reserved from approved loan balance before cash out.'
    ) returning id into v_deposit_id;

    v_balance_after := coalesce(v_wallet.available_balance, 0) - v_deduction;

    update public.user_wallets
    set available_balance = v_balance_after,
        total_deposit = coalesce(total_deposit, 0) + v_deduction
    where user_id = v_user;

    insert into public.transactions (
      user_id,
      loan_application_id,
      loan_deposit_id,
      transaction_no,
      type,
      direction,
      amount,
      balance_before,
      balance_after,
      status,
      payment_method,
      description
    ) values (
      v_user,
      p_loan_id,
      v_deposit_id,
      'TX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
      'fixed_deposit_deduction',
      'debit',
      v_deduction,
      coalesce(v_wallet.available_balance, 0),
      v_balance_after,
      'successful',
      'loan_balance_deduction',
      'Fixed deposit reserved from approved loan balance before cash out'
    );

    insert into public.app_notifications (
      user_id,
      type,
      title,
      message,
      action_url
    ) values (
      v_user,
      'fixed_deposit_reserved',
      'Fixed deposit reserved',
      'Your required fixed deposit was deducted from the approved loan balance. The remaining amount is now available for cash out.',
      '/loan/cashout?loan=' || p_loan_id::text
    );

    -- The existing deposit trigger temporarily marks the loan as deposit_submitted.
    -- Restore the original cash-out eligible state because this deposit is already verified.
    update public.loan_applications
    set status = v_original_status
    where id = p_loan_id;
  else
    v_balance_after := coalesce(v_wallet.available_balance, 0);
  end if;

  return jsonb_build_object(
    'loan_id', p_loan_id,
    'required_deposit', v_required,
    'already_verified', v_verified,
    'deducted_now', v_deduction,
    'available_balance', v_balance_after
  );
end;
$$;

revoke all on function public.prepare_cashout_fixed_deposit(uuid) from public;
grant execute on function public.prepare_cashout_fixed_deposit(uuid) to authenticated;
