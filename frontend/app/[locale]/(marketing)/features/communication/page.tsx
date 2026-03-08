import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { locales, defaultLocale } from '@/i18n/config'
import FeaturePageClient from './client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo' })

  const languages: Record<string, string> = {}
  for (const loc of locales) {
    languages[loc] = `/${loc}/features/communication`
  }
  languages['x-default'] = `/${defaultLocale}/features/communication`

  return {
    title: t('features.communication.title'),
    description: t('features.communication.description'),
    alternates: { languages },
  }
}

export default function Page() {
  return <FeaturePageClient />
}
