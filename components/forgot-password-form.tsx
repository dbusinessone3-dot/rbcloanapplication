'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useActionState } from 'react';
import { KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { requestPasswordResetAction } from '@/app/(auth)/actions';
import { ActionMessage } from '@/components/action-message';
import { LanguageSwitch } from '@/components/language-switch';
import { SubmitButton } from '@/components/submit-button';
import { useLanguage } from '@/components/language-provider';
import type { ActionState } from '@/lib/types';

const initial: ActionState = { ok: false, message: '' };

export function ForgotPasswordForm() {
  const { t } = useLanguage();
  const [state, action] = useActionState(requestPasswordResetAction, initial);
  return <div className="page-center"><div className="auth-shell auth-shell-single">
    <section className="auth-visual auth-visual-compact"><div className="brand-line"><Image src="/images/rbc-logo.svg" width={62} height={62} className="brand-logo" alt="RBC"/><div><div className="brand-title">{t('appName')}</div><div className="brand-subtitle">{t('royalBank')}</div></div></div><div className="auth-copy"><h1>{t('forgotPassword')}</h1><p>{t('passwordResetHelp')}</p></div><ShieldCheck size={30}/></section>
    <section className="auth-card-wrap"><div className="auth-card"><div className="auth-card-heading"><div><h2>{t('resetPassword')}</h2><p className="subtext">{t('passwordResetHelp')}</p></div><LanguageSwitch compact/></div><ActionMessage state={state}/><form action={action} className="form-grid"><div className="field"><label htmlFor="email">{t('email')}</label><div style={{position:'relative'}}><Mail size={18} className="input-icon"/><input className="input input-with-icon" id="email" type="email" name="email" required autoComplete="email"/></div></div><SubmitButton><KeyRound size={18}/>{t('sendResetLink')}</SubmitButton></form><p className="center muted auth-back-link"><Link className="inline-link" href="/login">{t('backToLogin')}</Link></p></div></section>
  </div></div>;
}
