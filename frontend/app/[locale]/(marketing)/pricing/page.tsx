import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { locales, defaultLocale } from '@/i18n/config'
import PricingPageClient from './client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo' })

  const languages: Record<string, string> = {}
  for (const loc of locales) {
    languages[loc] = `/${loc}/pricing`
  }
  languages['x-default'] = `/${defaultLocale}/pricing`

  return {
    title: t('pricing.title'),
    description: t('pricing.description'),
    alternates: { languages },
  }
}

export default function Page() {
  return <PricingPageClient />
}
