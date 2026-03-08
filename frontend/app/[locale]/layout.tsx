import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { locales, defaultLocale } from '@/i18n/config';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import { JsonLd } from '@/components/seo/json-ld';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `/${loc}`;
  }
  languages['x-default'] = `/${defaultLocale}`;

  return {
    title: t('home.title'),
    description: t('home.description'),
    openGraph: {
      title: t('home.title'),
      description: t('home.description'),
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      siteName: t('siteName'),
    },
    twitter: {
      title: t('home.title'),
      description: t('home.description'),
    },
    alternates: {
      languages,
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <JsonLd locale={locale} />
      {children}
      <CookieConsentBanner />
    </NextIntlClientProvider>
  );
}
