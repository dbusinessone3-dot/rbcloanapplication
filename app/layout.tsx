import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LanguageProvider } from '@/components/language-provider';
import type { Locale } from '@/lib/types';
import './globals.css';

export const metadata: Metadata = {
  title: 'RBC Loan Portal',
  description: 'Responsive loan application and management portal powered by Next.js and Supabase.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('rbc_locale')?.value;
  const initialLocale: Locale = cookieLocale === 'en' ? 'en' : 'bn';

  return (
    <html lang={initialLocale}>
      <body>
        <LanguageProvider initialLocale={initialLocale}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
