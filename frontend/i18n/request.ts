import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  const common = (await import(`@/messages/${locale}/common.json`)).default;
  const auth = (await import(`@/messages/${locale}/auth.json`)).default;
  const contacts = (await import(`@/messages/${locale}/contacts.json`)).default;
  const deals = (await import(`@/messages/${locale}/deals.json`)).default;
  const tasks = (await import(`@/messages/${locale}/tasks.json`)).default;
  const settings = (await import(`@/messages/${locale}/settings.json`)).default;
  const calendar = (await import(`@/messages/${locale}/calendar.json`)).default;
  const chat = (await import(`@/messages/${locale}/chat.json`)).default;
  const dashboard = (await import(`@/messages/${locale}/dashboard.json`)).default;
  const pipeline = (await import(`@/messages/${locale}/pipeline.json`)).default;
  const marketing = (await import(`@/messages/${locale}/marketing.json`)).default;
  const sidebar = (await import(`@/messages/${locale}/sidebar.json`)).default;
  const companies = (await import(`@/messages/${locale}/companies.json`)).default;
  const segments = (await import(`@/messages/${locale}/segments.json`)).default;
  const products = (await import(`@/messages/${locale}/products.json`)).default;
  const workflows = (await import(`@/messages/${locale}/workflows.json`)).default;
  const sequences = (await import(`@/messages/${locale}/sequences.json`)).default;
  const notifications = (await import(`@/messages/${locale}/notifications.json`)).default;
  const seo = (await import(`@/messages/${locale}/seo.json`)).default;

  return {
    locale,
    messages: {
      common,
      auth,
      contacts,
      deals,
      tasks,
      settings,
      calendar,
      chat,
      dashboard,
      pipeline,
      marketing,
      sidebar,
      companies,
      segments,
      products,
      workflows,
      sequences,
      notifications,
      seo,
    },
  };
});
