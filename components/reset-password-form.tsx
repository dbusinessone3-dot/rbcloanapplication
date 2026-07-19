'use client';

import Image from 'next/image';
import { useActionState } from 'react';
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { resetPasswordAction } from '@/app/(auth)/actions';
import { ActionMessage } from '@/components/action-message';
import { LanguageSwitch } from '@/components/language-switch';
import { SubmitButton } from '@/components/submit-button';
import { useLanguage } from '@/components/language-provider';
import type { ActionState } from '@/lib/types';

const initial: ActionState = { ok: false, message: '' };

export function ResetPasswordForm() {
  const { t } = useLanguage();
  const [state, action] = useActionState(resetPasswordAction, initial);
  return <div className="page-center"><div className="auth-shell auth-shell-single">
    <section className="auth-visual auth-visual-compact"><div className="brand-line"><Image src="/images/rbc-logo.svg" width={62} height={62} className="brand-logo" alt="RBC"/><div><div className="brand-title">{t('appName')}</div><div className="brand-subtitle">{t('royalBank')}</div></div></div><div className="auth-copy"><h1>{t('newPassword')}</h1><p>{t('newPasswordHelp')}</p></div><ShieldCheck size={30}/></section>
    <section className="auth-card-wrap"><div className="auth-card"><div className="auth-card-heading"><div><h2>{t('newPassword')}</h2><p className="subtext">{t('newPasswordHelp')}</p></div><LanguageSwitch compact/></div><ActionMessage state={state}/><form action={action} className="form-grid"><div className="field"><label htmlFor="password">{t('newPassword')}</label><div style={{position:'relative'}}><LockKeyhole size={18} className="input-icon"/><input className="input input-with-icon" id="password" type="password" name="password" required minLength={8} autoComplete="new-password"/></div></div><div className="field"><label htmlFor="confirm_password">{t('confirmPassword')}</label><input className="input" id="confirm_password" type="password" name="confirm_password" required minLength={8} autoComplete="new-password"/></div><SubmitButton><KeyRound size={18}/>{t('updatePassword')}</SubmitButton></form></div></section>
  </div></div>;
}
