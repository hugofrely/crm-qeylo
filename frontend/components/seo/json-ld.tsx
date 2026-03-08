import { getTranslations } from 'next-intl/server'

export async function JsonLd({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'seo' })

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Qeylo',
    url: 'https://qeylo.com',
    logo: 'https://qeylo.com/icon',
    description: t('home.description'),
    sameAs: [],
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: t('siteName'),
    url: 'https://qeylo.com',
    inLanguage: locale === 'fr' ? 'fr-FR' : 'en-US',
  }

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Qeylo CRM',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
    </>
  )
}
