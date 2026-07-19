'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useActionState } from 'react';
import { LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { LanguageSwitch } from '@/components/language-switch';
import { SubmitButton } from '@/components/submit-button';
import { loginAction, registerAction } from '@/app/(auth)/actions';
import type { ActionState } from '@/lib/types';

const initialState: ActionState = { ok: false, message: '' };

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { t } = useLanguage();
  const [state, action] = useActionState(mode === 'login' ? loginAction : registerAction, initialState);

  return <div className="page-center">
    <div className="auth-shell">
      <section className="auth-visual">
        <div className="brand-line"><Image src="/images/rbc-logo.svg" width={62} height={62} className="brand-logo" alt="RBC"/><div><div className="brand-title">{t('appName')}</div><div className="brand-subtitle">{t('royalBank')}</div></div></div>
        <div className="auth-copy"><h1>{mode === 'login' ? t('welcome') : t('signUp')}</h1><p>{t('secureMessage')}. Manage loan applications, installments, transactions and documents from one secure responsive portal.</p></div>
        <div><ShieldCheck size={30}/></div>
      </section>
      <section className="auth-card-wrap">
        <div className="auth-card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,marginBottom:24}}><div><h2>{mode === 'login' ? t('signIn') : t('signUp')}</h2><p className="subtext">{mode === 'login' ? t('secureMessage') : t('noAccount')}</p></div><LanguageSwitch compact/></div>
          {state.message ? <div className={`alert ${state.ok ? 'success' : 'error'}`} style={{marginBottom:16}}>{state.message}</div> : null}
          <form action={action} className="form-grid">
            {mode === 'register' ? <>
              <div className="field"><label htmlFor="full_name">{t('fullName')}</label><div style={{position:'relative'}}><UserRound size={18} style={{position:'absolute',left:14,top:14,color:'#8b95a5'}}/><input className="input" style={{paddingLeft:42}} id="full_name" name="full_name" required autoComplete="name"/></div></div>
              <div className="field"><label htmlFor="phone">{t('phone')}</label><div style={{position:'relative'}}><Phone size={18} style={{position:'absolute',left:14,top:14,color:'#8b95a5'}}/><input className="input" style={{paddingLeft:42}} id="phone" name="phone" autoComplete="tel"/></div></div>
            </> : null}
            <div className="field"><label htmlFor="email">{t('email')}</label><div style={{position:'relative'}}><Mail size={18} style={{position:'absolute',left:14,top:14,color:'#8b95a5'}}/><input className="input" style={{paddingLeft:42}} id="email" type="email" name="email" required autoComplete="email"/></div></div>
            <div className="field"><div className="password-label-row"><label htmlFor="password">{t('password')}</label>{mode === 'login' ? <Link className="inline-link small" href="/forgot-password">{t('forgotPassword')}</Link> : null}</div><div style={{position:'relative'}}><LockKeyhole size={18} style={{position:'absolute',left:14,top:14,color:'#8b95a5'}}/><input className="input" style={{paddingLeft:42}} id="password" type="password" name="password" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/></div></div>
            {mode === 'register' ? <div className="field"><label htmlFor="confirm_password">{t('confirmPassword')}</label><input className="input" id="confirm_password" type="password" name="confirm_password" required autoComplete="new-password"/></div> : null}
            <SubmitButton>{mode === 'login' ? t('signIn') : t('signUp')}</SubmitButton>
          </form>
          <p className="center muted" style={{marginTop:22}}>{mode === 'login' ? t('noAccount') : t('haveAccount')} <Link className="inline-link" href={mode === 'login' ? '/register' : '/login'}>{mode === 'login' ? t('signUp') : t('signIn')}</Link></p>
        </div>
      </section>
    </div>
  </div>;
}
