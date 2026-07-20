'use client';

import { Inbox } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

export function EmptyState({ message }: { message?: string }) {
  const { t } = useLanguage();
  return <div className="empty-state"><Inbox size={34} /><div>{message ?? t('noData')}</div></div>;
}
