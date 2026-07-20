'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { calculateLoan } from '@/lib/format';
import { normalizeLoanDefaults } from '@/lib/loan-settings';

function text(formData: FormData, key: string) { return String(formData.get(key) ?? '').trim(); }
function num(formData: FormData, key: string) { return Number(formData.get(key) ?? 0); }

export async function reviewLoanAction(formData: FormData) {
  const { supabase, user: admin } = await requireAdmin();
  const loanId = text(formData, 'loan_id');
  const decision = text(formData, 'decision');
  const note = text(formData, 'admin_note');
  const approvedAmount = num(formData, 'approved_amount');
  const { data: loan } = await supabase.from('loan_applications').select('*').eq('id', loanId).single();
  if (!loan) return;

  if (decision === 'approve') {
    if (['approved', 'cashout_requested', 'cashout_completed', 'running', 'completed'].includes(String(loan.status))) return;

    const amount = approvedAmount > 0 ? approvedAmount : Number(loan.requested_amount);
    const months = Math.max(Number(loan.duration_months || 12), 1);
    const { data: setting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'loan_defaults')
      .maybeSingle();
    const defaults = normalizeLoanDefaults(setting?.value);
    const calc = calculateLoan(
      amount,
      months,
      defaults.interest_rate,
      defaults.service_charge_rate,
      defaults.savings_percentage,
    );

    await supabase.from('loan_applications').update({
      status: 'approved',
      approved_amount: amount,
      interest_rate: defaults.interest_rate,
      service_charge: calc.serviceCharge,
      savings_percentage: defaults.savings_percentage,
      required_savings_amount: calc.savings,
      monthly_installment: calc.monthly,
      total_payable: calc.total,
      admin_note: note || null,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    }).eq('id', loanId);

    const { count } = await supabase.from('loan_installments').select('*', { count: 'exact', head: true }).eq('loan_application_id', loanId);
    if (!count) {
      const rows = Array.from({ length: months }, (_, index) => {
        const due = new Date();
        due.setMonth(due.getMonth() + index + 1);
        return {
          loan_application_id: loanId,
          user_id: loan.user_id,
          installment_no: index + 1,
          due_date: due.toISOString().slice(0, 10),
          amount: calc.monthly,
          status: index === 0 ? 'due' : 'upcoming',
        };
      });
      await supabase.from('loan_installments').insert(rows);
    }

    const { data: wallet } = await supabase.from('user_wallets').select('*').eq('user_id', loan.user_id).single();
    if (wallet) {
      await supabase.from('user_wallets').update({
        total_approved_loan: Number(wallet.total_approved_loan) + amount,
        available_balance: Number(wallet.available_balance) + amount,
        outstanding_balance: Number(wallet.outstanding_balance) + calc.total,
      }).eq('user_id', loan.user_id);
    }

    await supabase.from('transactions').insert({
      user_id: loan.user_id,
      loan_application_id: loanId,
      transaction_no: `TX-${Date.now()}`,
      type: 'loan_approval',
      direction: 'credit',
      amount,
      balance_before: Number(wallet?.available_balance || 0),
      balance_after: Number(wallet?.available_balance || 0) + amount,
      status: 'successful',
      description: `Loan ${loan.application_no} approved`,
      created_by: admin.id,
    });
    await supabase.from('app_notifications').insert({
      user_id: loan.user_id,
      type: 'loan_approved',
      title: 'Loan approved',
      message: `${loan.application_no} was approved for ৳${amount}.`,
      action_url: `/my-loans/${loanId}`,
    });
  } else if (decision === 'reject') {
    const reason = text(formData,'rejection_reason') || note || 'Application did not meet approval requirements.';
    await supabase.from('loan_applications').update({status:'rejected',rejection_reason:reason,admin_note:note||null,rejected_at:new Date().toISOString()}).eq('id',loanId);
    await supabase.from('app_notifications').insert({user_id:loan.user_id,type:'loan_rejected',title:'Loan application rejected',message:reason,action_url:`/my-loans/${loanId}`});
  } else if (decision === 'review') {
    await supabase.from('loan_applications').update({status:'under_review',admin_note:note||null}).eq('id',loanId);
  }
  await supabase.from('admin_activity_logs').insert({admin_user_id:admin.id,action:`loan_${decision}`,subject_type:'loan_application',subject_id:loanId,description:note||null});
  revalidatePath('/admin/loans');
  revalidatePath(`/admin/loans/${loanId}`);
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/notifications');
  revalidatePath('/dashboard');
  revalidatePath('/my-loans');
  revalidatePath(`/my-loans/${loanId}`);
  revalidatePath('/notifications');
}

export async function reviewCashoutAction(formData: FormData) {
  const { supabase, user: admin } = await requireAdmin();
  const id = text(formData, 'cashout_id');
  const decision = text(formData, 'decision');
  const note = text(formData, 'admin_note');

  const { data: item } = await supabase.from('loan_cashouts').select('*').eq('id', id).single();
  if (!item) return;

  if (decision === 'approve' || decision === 'complete') {
    const [{ data: profile }, { data: deposit }] = await Promise.all([
      supabase.from('profiles').select('cashout_deposit_verified_at').eq('id', item.user_id).maybeSingle(),
      supabase.from('user_cashout_deposits').select('status,deposit_amount').eq('user_id', item.user_id).maybeSingle(),
    ]);

    const depositReady = Boolean(
      profile?.cashout_deposit_verified_at &&
      Number(deposit?.deposit_amount || 0) > 0 &&
      deposit?.status === 'verified'
    );

    if (!depositReady) {
      await supabase.from('app_notifications').insert({
        user_id: admin.id,
        type: 'cashout_approval_blocked',
        title: 'Cash out approval blocked',
        message: 'Verify the user’s one-time cash out deposit payment before approving this cash out request.',
        action_url: '/admin/cashouts',
      });
      revalidatePath('/admin/cashouts');
      return;
    }
  }

  if (decision === 'approve') {
    await supabase.from('loan_cashouts').update({
      status: 'approved',
      approved_amount: Number(item.requested_amount),
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
      admin_note: note || null,
    }).eq('id', id);
  }

  if (decision === 'reject') {
    await supabase.from('loan_cashouts').update({
      status: 'rejected',
      rejection_reason: note || 'Cash out request rejected.',
      admin_note: note || null,
    }).eq('id', id);
  }

  if (decision === 'complete') {
    const amount = Number(item.approved_amount || item.requested_amount);
    await supabase.from('loan_cashouts').update({
      status: 'completed',
      approved_amount: amount,
      approved_by: admin.id,
      completed_at: new Date().toISOString(),
      admin_note: note || null,
    }).eq('id', id);

    const { data: wallet } = await supabase.from('user_wallets').select('*').eq('user_id', item.user_id).single();
    if (wallet) {
      await supabase.from('user_wallets').update({
        available_balance: Math.max(0, Number(wallet.available_balance) - amount),
        total_cashout: Number(wallet.total_cashout) + amount,
      }).eq('user_id', item.user_id);
    }

    await supabase.from('transactions').insert({
      user_id: item.user_id,
      loan_application_id: item.loan_application_id,
      loan_cashout_id: id,
      transaction_no: `TX-${Date.now()}`,
      type: 'cashout',
      direction: 'debit',
      amount,
      balance_before: Number(wallet?.available_balance || 0),
      balance_after: Math.max(0, Number(wallet?.available_balance || 0) - amount),
      status: 'successful',
      payment_method: item.payment_method,
      description: 'Loan cash out completed',
      created_by: admin.id,
    });
  }

  await supabase.from('app_notifications').insert({
    user_id: item.user_id,
    type: `cashout_${decision}`,
    title: `Cash out ${decision}`,
    message: note || `Your cash out request is ${decision}.`,
    action_url: '/loan/cashout',
  });

  revalidatePath('/admin/cashouts');
  revalidatePath('/loan/cashout');
  revalidatePath('/dashboard');
}

export async function reviewInstallmentAction(formData: FormData) {
  const{supabase,user:admin}=await requireAdmin();const id=text(formData,'installment_id');const decision=text(formData,'decision');const note=text(formData,'admin_note');
  const{data:item}=await supabase.from('loan_installments').select('*').eq('id',id).single();if(!item)return;
  if(decision==='verify'){
    const amount=Number(item.submitted_amount||item.amount);await supabase.from('loan_installments').update({status:'paid',paid_amount:amount,paid_at:new Date().toISOString(),verified_by:admin.id,verified_at:new Date().toISOString(),admin_note:note||null,rejection_reason:null}).eq('id',id);
    const{data:wallet}=await supabase.from('user_wallets').select('*').eq('user_id',item.user_id).single();if(wallet)await supabase.from('user_wallets').update({total_installment_paid:Number(wallet.total_installment_paid)+amount,outstanding_balance:Math.max(0,Number(wallet.outstanding_balance)-amount)}).eq('user_id',item.user_id);
    await supabase.from('transactions').insert({user_id:item.user_id,loan_application_id:item.loan_application_id,loan_installment_id:id,transaction_no:`TX-${Date.now()}`,type:'installment',direction:'debit',amount,balance_before:Number(wallet?.outstanding_balance||0),balance_after:Math.max(0,Number(wallet?.outstanding_balance||0)-amount),status:'successful',payment_method:item.payment_method,external_transaction_id:item.transaction_id,description:`Installment #${item.installment_no} verified`,created_by:admin.id});
  }else if(decision==='reject')await supabase.from('loan_installments').update({status:'rejected',rejection_reason:note||'Payment proof rejected.',rejected_at:new Date().toISOString(),admin_note:note||null}).eq('id',id);
  await supabase.from('app_notifications').insert({user_id:item.user_id,type:`installment_${decision}`,title:`Installment ${decision==='verify'?'verified':'rejected'}`,message:note||`Installment #${item.installment_no} was ${decision}.`,action_url:'/installments'});
  revalidatePath('/admin/installments');revalidatePath('/installments');revalidatePath('/dashboard');
}

export async function reviewDepositAction(formData: FormData) {
  const { supabase, user: admin } = await requireAdmin();
  const id = text(formData, 'deposit_id');
  const decision = text(formData, 'decision');
  const note = text(formData, 'admin_note');
  const { data: item } = await supabase.from('loan_deposits').select('*').eq('id', id).single();
  if (!item) return;
  if (item.status === 'verified' || item.status === 'rejected') return;

  if (decision === 'verify') {
    const amount = Number(item.amount);
    await supabase.from('loan_deposits').update({ status: 'verified', verified_by: admin.id, verified_at: new Date().toISOString(), admin_note: note || null }).eq('id', id);
    const { data: wallet } = await supabase.from('user_wallets').select('*').eq('user_id', item.user_id).single();
    if (wallet) await supabase.from('user_wallets').update({ total_deposit: Number(wallet.total_deposit) + amount }).eq('user_id', item.user_id);
    await supabase.from('transactions').insert({ user_id: item.user_id, loan_application_id: item.loan_application_id, loan_deposit_id: id, transaction_no: `TX-${Date.now()}`, type: 'deposit', direction: 'credit', amount, balance_before: Number(wallet?.total_deposit || 0), balance_after: Number(wallet?.total_deposit || 0) + amount, status: 'successful', payment_method: item.payment_method, external_transaction_id: item.transaction_id, description: 'Savings deposit verified', created_by: admin.id });
    await supabase.from('loan_applications').update({ status: 'under_review' }).eq('id', item.loan_application_id);
  } else if (decision === 'reject') {
    await supabase.from('loan_deposits').update({ status: 'rejected', admin_note: note || 'Deposit proof rejected.' }).eq('id', id);
  }
  await supabase.from('app_notifications').insert({ user_id: item.user_id, type: `deposit_${decision}`, title: `Deposit ${decision === 'verify' ? 'verified' : 'rejected'}`, message: note || `Your deposit proof was ${decision}.`, action_url: `/my-loans/${item.loan_application_id}` });
  revalidatePath('/admin/deposits'); revalidatePath(`/my-loans/${item.loan_application_id}`); revalidatePath('/dashboard');
}



export async function reviewProfileAction(formData: FormData) {
  const { supabase, user: admin } = await requireAdmin();
  const profileId = text(formData, 'profile_id');
  const decision = text(formData, 'decision');
  const note = text(formData, 'admin_note');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).single();
  if (!profile || profile.role !== 'user' || !['submitted', 'under_review'].includes(String(profile.kyc_status))) return;

  if (decision === 'approve') {
    await supabase.from('profiles').update({
      kyc_status: 'verified',
      kyc_verified_at: new Date().toISOString(),
      kyc_rejection_reason: null,
    }).eq('id', profileId);
    await supabase.from('app_notifications').insert({
      user_id: profileId,
      type: 'profile_approved',
      title: 'Profile approved',
      message: `Your profile and KYC information have been approved.${note ? ` Admin note: ${note}` : ''}`,
      action_url: '/profile',
    });
  } else if (decision === 'reject') {
    const reason = note || 'Please review your profile information and submit the requested corrections.';
    await supabase.from('profiles').update({
      kyc_status: 'rejected',
      kyc_verified_at: null,
      kyc_rejection_reason: reason,
    }).eq('id', profileId);
    await supabase.from('app_notifications').insert({
      user_id: profileId,
      type: 'profile_rejected',
      title: 'Profile needs changes',
      message: reason,
      action_url: '/profile',
    });
  } else {
    return;
  }

  await supabase.from('admin_activity_logs').insert({
    admin_user_id: admin.id,
    action: `profile_${decision}`,
    subject_type: 'profile',
    subject_id: profileId,
    description: note || null,
    metadata: null,
  });
  revalidatePath('/admin/profiles');
  revalidatePath('/admin/dashboard');
  revalidatePath('/profile');
  revalidatePath('/loan/cashout');
  revalidatePath('/notifications');
}

export async function reviewCashoutDepositRequestAction(formData: FormData) {
  const { supabase, user: admin } = await requireAdmin();
  const userId = text(formData, 'user_id');
  const decision = text(formData, 'decision');
  const note = text(formData, 'admin_note');

  const [{ data: item }, { data: profile }] = await Promise.all([
    supabase.from('user_cashout_deposits').select('*').eq('user_id', userId).single(),
    supabase.from('profiles').select('id,full_name,email,cashout_deposit_verified_at').eq('id', userId).single(),
  ]);
  if (!item || !profile) return;

  const depositAmount = Number(item.deposit_amount || 0);

  if (decision === 'verify_payment') {
    if (item.status !== 'submitted' || depositAmount <= 0 || profile.cashout_deposit_verified_at) return;
    const verifiedAt = new Date().toISOString();

    await supabase.from('user_cashout_deposits').update({
      status: 'verified',
      verified_by: admin.id,
      verified_at: verifiedAt,
      admin_note: note || null,
    }).eq('user_id', userId);

    await supabase.from('profiles').update({
      cashout_deposit_verified_at: verifiedAt,
      cashout_deposit_verified_by: admin.id,
      cashout_deposit_admin_note: note || null,
    }).eq('id', userId);

    await supabase.from('app_notifications').insert({
      user_id: userId,
      type: 'cashout_deposit_verified',
      title: 'Deposit verified',
      message: 'Your one-time deposit was verified. The deposit popup is now removed and you can request the full eligible cash out amount.',
      action_url: '/loan/cashout',
    });
  } else if (decision === 'reject_payment') {
    if (item.status !== 'submitted') return;
    const reason = note || 'Payment information could not be verified.';
    await supabase.from('user_cashout_deposits').update({
      status: 'payment_rejected',
      admin_note: reason,
      verified_by: null,
      verified_at: null,
    }).eq('user_id', userId);
    await supabase.from('app_notifications').insert({
      user_id: userId,
      type: 'cashout_deposit_payment_rejected',
      title: 'Deposit payment needs attention',
      message: reason,
      action_url: '/loan/cashout',
    });
  } else {
    return;
  }

  await supabase.from('admin_activity_logs').insert({
    admin_user_id: admin.id,
    action: `cashout_deposit_${decision}`,
    subject_type: 'user_cashout_deposit',
    subject_id: userId,
    description: note || null,
    metadata: { deposit_amount: depositAmount },
  });
  revalidatePath('/admin/cashout-deposits');
  revalidatePath('/admin/cashouts');
  revalidatePath('/admin/profiles');
  revalidatePath('/admin/dashboard');
  revalidatePath('/loan/cashout');
  revalidatePath('/dashboard');
  revalidatePath('/profile');
  revalidatePath('/notifications');
}


export async function updateLoanDefaultsAction(formData: FormData) {
  const { supabase, user: admin } = await requireAdmin();
  const interestRate = num(formData, 'interest_rate');
  const serviceChargeRate = num(formData, 'service_charge_rate');
  const savingsPercentage = num(formData, 'savings_percentage');

  const values = [interestRate, serviceChargeRate, savingsPercentage];
  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) return;

  const value = {
    interest_rate: interestRate,
    service_charge_rate: serviceChargeRate,
    savings_percentage: savingsPercentage,
  };

  await supabase.from('settings').upsert({ key: 'loan_defaults', value }, { onConflict: 'key' });
  await supabase.from('admin_activity_logs').insert({
    admin_user_id: admin.id,
    action: 'loan_defaults_updated',
    subject_type: 'settings',
    description: `Loan defaults updated: interest ${interestRate}%, service ${serviceChargeRate}%, savings ${savingsPercentage}%`,
    metadata: value,
  });

  revalidatePath('/admin/settings');
  revalidatePath('/loan/apply');
  revalidatePath('/calculator');
}

export async function updateApplicationPaymentSettingsAction(formData: FormData) {
  const { supabase, user: admin } = await requireAdmin();
  const value = {
    bkash_number: text(formData, 'bkash_number'),
    nagad_number: text(formData, 'nagad_number'),
    rocket_number: text(formData, 'rocket_number'),
    bank_name: text(formData, 'bank_name'),
    bank_account_name: text(formData, 'bank_account_name'),
    bank_account_number: text(formData, 'bank_account_number'),
    bank_branch: text(formData, 'bank_branch'),
  };

  await supabase.from('settings').upsert({ key: 'loan_application_payment_methods', value }, { onConflict: 'key' });
  await supabase.from('admin_activity_logs').insert({
    admin_user_id: admin.id,
    action: 'loan_application_payment_receivers_updated',
    subject_type: 'settings',
    description: 'Loan application payment receiver information updated.',
    metadata: { configured_methods: Object.entries(value).filter(([, entry]) => Boolean(entry)).map(([key]) => key) },
  });

  revalidatePath('/admin/settings');
  revalidatePath('/loan/apply');
}

export async function reviewLoanApplicationPaymentAction(formData: FormData) {
  const { supabase, user: admin } = await requireAdmin();
  const paymentId = text(formData, 'payment_id');
  const decision = text(formData, 'decision');
  const note = text(formData, 'admin_note');

  const { data: payment, error: loadError } = await supabase
    .from('loan_application_payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();
  if (loadError || !payment || payment.status !== 'submitted') return;

  if (decision === 'approve') {
    const { error } = await supabase.from('loan_application_payments').update({
      status: 'verified', verified_by: admin.id, verified_at: new Date().toISOString(),
      admin_note: note || null, updated_at: new Date().toISOString(),
    }).eq('id', paymentId).eq('status', 'submitted');
    if (error) return;
    await supabase.from('app_notifications').insert({
      user_id: payment.user_id, type: 'loan_application_payment_verified', title: 'Application fee approved',
      message: note || 'Your application fee was approved. The final Submit Application button is now active.', action_url: '/loan/apply',
    });
  } else if (decision === 'reject') {
    const reason = note || 'The payment information could not be verified. Please submit it again.';
    const { error } = await supabase.from('loan_application_payments').update({
      status: 'rejected', verified_by: null, verified_at: null, admin_note: reason, updated_at: new Date().toISOString(),
    }).eq('id', paymentId).eq('status', 'submitted');
    if (error) return;
    await supabase.from('app_notifications').insert({
      user_id: payment.user_id, type: 'loan_application_payment_rejected', title: 'Application fee needs attention',
      message: reason, action_url: '/loan/apply',
    });
  } else { return; }

  await supabase.from('admin_activity_logs').insert({
    admin_user_id: admin.id, action: `loan_application_payment_${decision}`,
    subject_type: 'loan_application_payment', subject_id: paymentId,
    description: note || null, metadata: { user_id: payment.user_id, amount: payment.expected_amount },
  });

  revalidatePath('/admin/application-payments');
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/notifications');
  revalidatePath('/loan/apply');
  revalidatePath('/dashboard');
  revalidatePath('/notifications');
}
