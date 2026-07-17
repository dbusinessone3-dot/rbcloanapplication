'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { calculateLoan } from '@/lib/format';
import { normalizeLoanDefaults } from '@/lib/loan-settings';
import type { ActionState } from '@/lib/types';

const ok = (message: string): ActionState => ({ ok: true, message });
const fail = (message: string): ActionState => ({ ok: false, message });

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}
function numberValue(formData: FormData, key: string) {
  return Number(formData.get(key) ?? 0);
}
function safeName(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  return `${Date.now()}-${crypto.randomUUID()}.${ext}`;
}
async function uploadFile(supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>, bucket: string, path: string, file: File) {
  if (!file || file.size === 0) return null;
  if (file.size > 8 * 1024 * 1024) throw new Error('Each file must be smaller than 8MB.');
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  return path;
}

export async function updateProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  try {
    const { data: currentProfile } = await supabase.from('profiles').select('kyc_status,profile_photo_path').eq('id', user.id).maybeSingle();
    if (currentProfile && ['submitted', 'under_review', 'verified'].includes(String(currentProfile.kyc_status))) {
      return fail('Your profile is already submitted for review or approved.');
    }

    const profilePhoto = formData.get('profile_photo');
    if (!currentProfile?.profile_photo_path && (!(profilePhoto instanceof File) || profilePhoto.size === 0)) {
      return fail('Please upload your profile photo before submitting for approval.');
    }

    const updates: Record<string, unknown> = {
      full_name: text(formData, 'full_name'),
      phone: text(formData, 'phone'),
      country: text(formData, 'country'),
      city: text(formData, 'city'),
      address: text(formData, 'address'),
      date_of_birth: text(formData, 'date_of_birth') || null,
      gender: text(formData, 'gender') || null,
      passport_number: text(formData, 'passport_number') || null,
      nid_number: text(formData, 'nid_number') || null,
      kyc_status: 'submitted',
    };

    for (const key of ['profile_photo', 'nid_front', 'nid_back']) {
      const file = formData.get(key);
      if (file instanceof File && file.size > 0) {
        const path = `${user.id}/${key}/${safeName(file)}`;
        await uploadFile(supabase, 'kyc-documents', path, file);
        updates[`${key}_path`] = path;
      }
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) return fail(error.message);

    await supabase.from('app_notifications').insert({
      user_id: user.id,
      type: 'profile_submitted',
      title: 'Profile submitted',
      message: 'Your profile and KYC information were submitted for admin approval.',
      action_url: '/profile',
    });
    await supabase.rpc('notify_admins_profile_submission');

    revalidatePath('/profile');
    revalidatePath('/admin/profiles');
    return ok('Profile and KYC information submitted for admin approval.');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unable to update profile.');
  }
}

export async function submitLoanApplicationPaymentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const requestedAmount = numberValue(formData, 'requested_amount');
  const paymentMethod = text(formData, 'payment_method');
  const receiverReference = text(formData, 'receiver_reference');
  const transactionId = text(formData, 'transaction_id');
  const screenshot = formData.get('payment_screenshot');

  if (requestedAmount < 1000) return fail('Choose or enter a valid loan amount first.');
  if (!['bkash', 'nagad', 'rocket', 'bank'].includes(paymentMethod)) return fail('Choose a valid payment method.');
  if (!transactionId) return fail('Enter the transaction ID or bank transfer reference.');
  if (!(screenshot instanceof File) || screenshot.size === 0) return fail('Upload the payment screenshot or bank receipt.');

  const [{ data: loanSetting }, { data: paymentSetting }, { data: existing }] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'loan_defaults').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'loan_application_payment_methods').maybeSingle(),
    supabase.from('loan_application_payments').select('id,status,expected_amount').eq('user_id', user.id).eq('requested_amount', requestedAmount).in('status', ['submitted', 'verified']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (existing?.status === 'submitted') return fail('This payment is already waiting for admin verification.');
  if (existing?.status === 'verified') return ok('Your payment is already verified. You can submit the final loan application.');

  const defaults = normalizeLoanDefaults(loanSetting?.value);
  const expectedAmount = requestedAmount * (defaults.savings_percentage / 100);
  const channels = paymentSetting?.value && typeof paymentSetting.value === 'object' && !Array.isArray(paymentSetting.value)
    ? paymentSetting.value as Record<string, unknown>
    : {};
  const expectedReceiver = paymentMethod === 'bkash'
    ? String(channels.bkash_number || '').trim()
    : paymentMethod === 'nagad'
      ? String(channels.nagad_number || '').trim()
      : paymentMethod === 'rocket'
        ? String(channels.rocket_number || '').trim()
        : String(channels.bank_account_number || '').trim();

  if (!expectedReceiver) return fail('This payment method is not configured by the admin yet.');

  try {
    const path = `${user.id}/loan-application-payments/${safeName(screenshot)}`;
    await uploadFile(supabase, 'payment-proofs', path, screenshot);

    const { error } = await supabase.from('loan_application_payments').insert({
      user_id: user.id,
      requested_amount: requestedAmount,
      expected_amount: expectedAmount,
      payment_method: paymentMethod,
      receiver_reference: receiverReference || expectedReceiver,
      transaction_id: transactionId,
      payment_screenshot_path: path,
      status: 'submitted',
    });
    if (error) return fail(error.message);

    revalidatePath('/loan/apply');
    revalidatePath('/admin/application-payments');
    revalidatePath('/admin/notifications');
    return ok('Payment submitted. The final application button will unlock after admin verification.');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unable to submit the application payment.');
  }
}

export async function applyLoanAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const amount = numberValue(formData, 'requested_amount');
  const months = numberValue(formData, 'duration_months');
  if (amount < 1000 || months < 1) return fail('Enter a valid loan amount and duration.');

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
  const { data: verifiedPayment } = await supabase
    .from('loan_application_payments')
    .select('id,expected_amount')
    .eq('user_id', user.id)
    .eq('requested_amount', amount)
    .eq('status', 'verified')
    .is('loan_application_id', null)
    .order('verified_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!verifiedPayment || Math.abs(Number(verifiedPayment.expected_amount) - calc.savings) > 0.01) {
    return fail('Your required savings payment must be verified by an admin before submitting the loan application.');
  }

  const applicationNo = `LN-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 90 + 10)}`;

  const { data: loan, error } = await supabase.from('loan_applications').insert({
    application_payment_id: verifiedPayment.id,
    user_id: user.id,
    application_no: applicationNo,
    country: text(formData, 'country'),
    employment_type: text(formData, 'employment_type'),
    monthly_income: numberValue(formData, 'monthly_income'),
    requested_amount: amount,
    duration_months: months,
    interest_rate: defaults.interest_rate,
    service_charge: calc.serviceCharge,
    savings_percentage: defaults.savings_percentage,
    required_savings_amount: calc.savings,
    monthly_installment: calc.monthly,
    total_payable: calc.total,
    loan_purpose: text(formData, 'loan_purpose'),
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  }).select('*').single();

  if (error || !loan) return fail(error?.message || 'Unable to create loan application.');

  const guarantorName = text(formData, 'guarantor_name');
  if (guarantorName) {
    await supabase.from('loan_guarantors').insert({
      loan_application_id: loan.id, user_id: user.id, name: guarantorName,
      phone: text(formData, 'guarantor_phone'), email: text(formData, 'guarantor_email') || null,
      relation: text(formData, 'guarantor_relation') || null, address: text(formData, 'guarantor_address') || null,
      nid_number: text(formData, 'guarantor_nid') || null,
    });
  }

  const nomineeName = text(formData, 'nominee_name');
  if (nomineeName) {
    await supabase.from('loan_nominees').insert({
      loan_application_id: loan.id, user_id: user.id, name: nomineeName,
      phone: text(formData, 'nominee_phone'), email: text(formData, 'nominee_email') || null,
      relation: text(formData, 'nominee_relation') || null, address: text(formData, 'nominee_address') || null,
      nid_number: text(formData, 'nominee_nid') || null,
    });
  }

  try {
    for (const key of ['nid_front', 'nid_back', 'income_proof']) {
      const file = formData.get(key);
      if (file instanceof File && file.size > 0) {
        const path = `${user.id}/${loan.id}/${key}-${safeName(file)}`;
        await uploadFile(supabase, 'loan-documents', path, file);
        await supabase.from('loan_documents').insert({
          loan_application_id: loan.id, user_id: user.id, document_type: key,
          original_name: file.name, file_path: path, mime_type: file.type, file_size: file.size,
        });
      }
    }
  } catch (uploadError) {
    await supabase.from('loan_applications').delete().eq('id', loan.id);
    return fail(uploadError instanceof Error ? uploadError.message : 'Document upload failed.');
  }

  await supabase.from('app_notifications').insert({
    user_id: user.id, type: 'loan_submitted', title: 'Loan application submitted',
    message: `${applicationNo} has been submitted for review.`, action_url: `/my-loans/${loan.id}`,
  });
  revalidatePath('/dashboard');
  redirect(`/my-loans/${loan.id}`);
}


export async function submitCashoutDepositPaymentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const loanId = text(formData, 'loan_application_id');
  const paymentMethod = text(formData, 'payment_method');
  const receiverReference = text(formData, 'receiver_reference');
  const transactionId = text(formData, 'transaction_id');
  const screenshot = formData.get('payment_screenshot');

  if (!loanId) return fail('Choose the approved loan for this deposit.');
  if (!['bkash', 'nagad', 'rocket', 'bank'].includes(paymentMethod)) return fail('Choose a valid payment method.');
  if (!transactionId) return fail('Enter the transaction ID or bank payment reference.');

  try {
    let path: string | null = null;
    if (screenshot instanceof File && screenshot.size > 0) {
      path = `${user.id}/cashout-deposits/one-time/${safeName(screenshot)}`;
      await uploadFile(supabase, 'payment-proofs', path, screenshot);
    }

    const { error } = await supabase.rpc('submit_user_cashout_deposit_payment', {
      p_loan_application_id: loanId,
      p_payment_method: paymentMethod,
      p_receiver_reference: receiverReference || null,
      p_transaction_id: transactionId,
      p_payment_screenshot_path: path,
    });
    if (error) return fail(error.message);

    revalidatePath('/loan/cashout');
    revalidatePath('/admin/cashout-deposits');
    revalidatePath('/profile');
    return ok('Deposit payment submitted for admin verification.');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unable to submit deposit payment.');
  }
}


export async function cashoutAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const loanId = text(formData, 'loan_application_id');
  const amount = numberValue(formData, 'requested_amount');
  const paymentMethod = text(formData, 'payment_method');
  if (!loanId || amount <= 0) return fail('Choose a loan and enter a valid amount.');
  if (!['bkash', 'nagad', 'rocket', 'bank'].includes(paymentMethod)) return fail('Choose a valid cash out method.');

  const [{ data: loan }, { data: wallet }, { data: profile }, { data: oneTimeDeposit }, { data: reservedCashouts }] = await Promise.all([
    supabase.from('loan_applications').select('id,user_id,status,approved_amount,requested_amount').eq('id', loanId).eq('user_id', user.id).maybeSingle(),
    supabase.from('user_wallets').select('available_balance').eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('cashout_deposit_verified_at').eq('id', user.id).maybeSingle(),
    supabase.from('user_cashout_deposits').select('status').eq('user_id', user.id).maybeSingle(),
    supabase.from('loan_cashouts').select('requested_amount,approved_amount,status').eq('loan_application_id', loanId).eq('user_id', user.id).in('status', ['pending','approved','completed']),
  ]);

  if (!loan) return fail('Approved loan not found.');
  if (!['approved','cashout_requested','cashout_completed','running'].includes(String(loan.status))) return fail('This loan is not eligible for cash out.');
  if (!profile?.cashout_deposit_verified_at || oneTimeDeposit?.status !== 'verified') return fail('Please pay the 0.1% deposit and confirm with admin before cash out.');

  const approvedAmount = Number(loan.approved_amount || loan.requested_amount || 0);
  const reserved = (reservedCashouts ?? []).reduce((sum, item) => sum + Number(item.approved_amount || item.requested_amount || 0), 0);
  const loanCashoutRemaining = Math.max(0, approvedAmount - reserved);
  const availableBalance = Number(wallet?.available_balance || 0);
  const maximumCashout = Math.max(0, Math.min(loanCashoutRemaining, availableBalance));

  if (amount > maximumCashout + 0.009) return fail(`Maximum available cash out amount is ${maximumCashout.toFixed(2)}.`);

  const { error } = await supabase.from('loan_cashouts').insert({
    loan_application_id: loanId,
    user_id: user.id,
    requested_amount: amount,
    payment_method: paymentMethod,
    mobile_number: text(formData, 'mobile_number') || null,
    bank_name: text(formData, 'bank_name') || null,
    bank_account_name: text(formData, 'bank_account_name') || null,
    bank_account_number: text(formData, 'bank_account_number') || null,
    bank_branch: text(formData, 'bank_branch') || null,
    status: 'pending',
  });
  if (error) return fail(error.message);
  await supabase.from('loan_applications').update({ status: 'cashout_requested' }).eq('id', loanId).eq('user_id', user.id);
  revalidatePath('/loan/cashout');
  revalidatePath('/dashboard');
  return ok('Cash out request submitted successfully.');
}

export async function depositAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const loanId = text(formData, 'loan_application_id');
  const amount = numberValue(formData, 'amount');
  const screenshot = formData.get('payment_screenshot');
  if (!loanId || amount <= 0) return fail('Enter a valid deposit amount.');

  try {
    let path: string | null = null;
    if (screenshot instanceof File && screenshot.size > 0) {
      path = `${user.id}/deposits/${loanId}/${safeName(screenshot)}`;
      await uploadFile(supabase, 'payment-proofs', path, screenshot);
    }
    const { error } = await supabase.from('loan_deposits').insert({
      loan_application_id: loanId, user_id: user.id, amount,
      payment_method: text(formData, 'payment_method'), receiver_number: text(formData, 'receiver_number') || null,
      transaction_id: text(formData, 'transaction_id') || null, payment_screenshot_path: path, status: 'submitted',
    });
    if (error) return fail(error.message);
    await supabase.from('loan_applications').update({ status: 'deposit_submitted' }).eq('id', loanId);
    revalidatePath(`/my-loans/${loanId}`);
    return ok('Deposit proof submitted successfully.');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unable to submit deposit.');
  }
}

export async function installmentPaymentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const installmentId = text(formData, 'installment_id');
  const amount = numberValue(formData, 'submitted_amount');
  const screenshot = formData.get('payment_screenshot');
  if (!installmentId || amount <= 0) return fail('Enter a valid payment amount.');

  try {
    let path: string | null = null;
    if (screenshot instanceof File && screenshot.size > 0) {
      path = `${user.id}/installments/${installmentId}/${safeName(screenshot)}`;
      await uploadFile(supabase, 'payment-proofs', path, screenshot);
    }
    const { error } = await supabase.from('loan_installments').update({
      submitted_amount: amount,
      payment_method: text(formData, 'payment_method'),
      transaction_id: text(formData, 'transaction_id') || null,
      payment_screenshot_path: path,
      status: 'submitted',
    }).eq('id', installmentId).eq('user_id', user.id);
    if (error) return fail(error.message);
    revalidatePath('/installments');
    return ok('Installment proof submitted for admin verification.');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unable to submit installment.');
  }
}

export async function markNotificationReadAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = text(formData, 'notification_id');
  if (id) await supabase.from('app_notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/notifications');
}

export async function markAllNotificationsReadAction() {
  const { supabase, user } = await requireUser();
  await supabase.from('app_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
  revalidatePath('/notifications');
}
