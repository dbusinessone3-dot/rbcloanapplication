'use client';

import type { ActionState } from '@/lib/types';

export function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <div className={`alert ${state.ok ? 'success' : 'error'}`}>{state.message}</div>;
}
