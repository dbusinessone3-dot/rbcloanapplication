export type Locale = 'bn' | 'en';
export type UserRole = 'user' | 'admin' | 'super_admin';


export interface ApplicationPaymentSettings {
  bkash_number: string;
  nagad_number: string;
  rocket_number: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_branch: string;
}

export interface LoanApplicationPayment {
  id: string;
  user_id: string;
  requested_amount: number | string;
  expected_amount: number | string;
  payment_method: 'bkash' | 'nagad' | 'rocket' | 'bank';
  receiver_reference: string | null;
  transaction_id: string;
  payment_screenshot_path: string | null;
  payment_screenshot_url?: string | null;
  status: 'submitted' | 'verified' | 'rejected' | 'used';
  admin_note: string | null;
  verified_by: string | null;
  verified_at: string | null;
  loan_application_id: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'full_name' | 'email' | 'phone'> | null;
}

export interface LoanDefaults {
  interest_rate: number;
  service_charge_rate: number;
  savings_percentage: number;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  status: string;
  preferred_locale: Locale;
  country: string | null;
  city: string | null;
  address: string | null;
  date_of_birth: string | null;
  gender: string | null;
  passport_number: string | null;
  nid_number: string | null;
  profile_photo_path: string | null;
  nid_front_path: string | null;
  nid_back_path: string | null;
  kyc_status: string;
  kyc_rejection_reason?: string | null;
  kyc_verified_at?: string | null;
  cashout_deposit_amount: number | string;
  cashout_deposit_verified_at?: string | null;
  cashout_deposit_verified_by?: string | null;
  cashout_deposit_admin_note?: string | null;
}

export interface Wallet {
  user_id: string;
  available_balance: number | string;
  total_approved_loan: number | string;
  total_cashout: number | string;
  total_deposit: number | string;
  total_installment_paid: number | string;
  outstanding_balance: number | string;
}

export interface LoanApplication {
  id: string;
  user_id: string;
  application_no: string;
  application_payment_id?: string | null;
  country: string | null;
  employment_type: string | null;
  monthly_income: number | string;
  requested_amount: number | string;
  approved_amount: number | string | null;
  duration_months: number;
  interest_rate: number | string;
  service_charge: number | string;
  savings_percentage: number | string;
  required_savings_amount: number | string;
  monthly_installment: number | string;
  total_payable: number | string;
  loan_purpose: string | null;
  admin_note: string | null;
  rejection_reason: string | null;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'email' | 'phone'> | null;
}

export interface Transaction {
  id: string;
  transaction_no: string;
  type: string;
  direction: 'credit' | 'debit';
  amount: number | string;
  balance_after: number | string;
  status: string;
  payment_method: string | null;
  description: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface LoanDeposit {
  id: string;
  loan_application_id: string;
  user_id: string;
  amount: number | string;
  payment_method: string;
  receiver_number: string | null;
  transaction_id: string | null;
  payment_screenshot_path: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'email' | 'phone' | 'cashout_deposit_amount' | 'cashout_deposit_verified_at'> | null;
  loan_applications?: Pick<LoanApplication, 'application_no'> | null;
}

export interface Cashout {
  id: string;
  loan_application_id: string;
  user_id: string;
  requested_amount: number | string;
  approved_amount: number | string | null;
  payment_method: string;
  mobile_number: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'email' | 'phone' | 'cashout_deposit_amount' | 'cashout_deposit_verified_at'> | null;
  loan_applications?: Pick<LoanApplication, 'application_no'> | null;
}

export interface Installment {
  id: string;
  loan_application_id: string;
  user_id: string;
  installment_no: number;
  due_date: string;
  amount: number | string;
  paid_amount: number | string;
  submitted_amount: number | string;
  status: string;
  transaction_id: string | null;
  payment_screenshot_path: string | null;
  admin_note: string | null;
  rejection_reason: string | null;
  profiles?: Pick<Profile, 'full_name' | 'email' | 'phone'> | null;
  loan_applications?: Pick<LoanApplication, 'application_no'> | null;
}


export interface AdminProfileReview extends Profile {
  profile_photo_url: string | null;
  nid_front_url: string | null;
  nid_back_url: string | null;
}


export interface UserCashoutDeposit {
  user_id: string;
  loan_application_id: string | null;
  deposit_amount: number | string;
  status: 'submitted' | 'verified' | 'payment_rejected';
  payment_method: string | null;
  receiver_reference: string | null;
  transaction_id: string | null;
  payment_screenshot_path: string | null;
  payment_screenshot_url?: string | null;
  verified_by: string | null;
  verified_at: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'full_name' | 'email' | 'phone' | 'cashout_deposit_verified_at'> | null;
  loan_applications?: Pick<LoanApplication, 'application_no' | 'approved_amount' | 'requested_amount'> | null;
}

export interface CashoutDepositRequest {
  id: string;
  loan_application_id: string;
  user_id: string;
  deposit_amount: number | string | null;
  status: 'requested' | 'approved' | 'submitted' | 'verified' | 'payment_rejected' | 'rejected';
  payment_method: string | null;
  receiver_reference: string | null;
  transaction_id: string | null;
  payment_screenshot_path: string | null;
  payment_screenshot_url?: string | null;
  approved_by: string | null;
  approved_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'full_name' | 'email' | 'phone'> | null;
  loan_applications?: Pick<LoanApplication, 'application_no' | 'approved_amount' | 'requested_amount'> | null;
}

export interface ActionState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}
