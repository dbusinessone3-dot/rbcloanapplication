'use client';

import { LoaderCircle } from 'lucide-react';
import { useFormStatus } from 'react-dom';

export function SubmitButton({
  children,
  className = 'primary-btn full-btn',
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;
  return (
    <button className={className} type="submit" disabled={isDisabled} aria-disabled={isDisabled}>
      {pending ? <LoaderCircle size={18} className="spin" /> : null}
      {children}
    </button>
  );
}
