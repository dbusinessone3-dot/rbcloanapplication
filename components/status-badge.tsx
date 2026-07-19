'use client';

import { useLanguage } from '@/components/language-provider';

const keys: Record<string, 'pending' | 'submitted' | 'approved' | 'rejected' | 'running' | 'completed' | 'underReview'> = {
  pending: 'pending', requested: 'pending', submitted: 'submitted', approved: 'approved', verified: 'approved', rejected: 'rejected', payment_rejected: 'rejected', running: 'running', completed: 'completed', under_review: 'underReview',
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const label = keys[status] ? t(keys[status]) : status.replaceAll('_', ' ');
  return <span className={`badge ${status}`}>{label}</span>;
}
