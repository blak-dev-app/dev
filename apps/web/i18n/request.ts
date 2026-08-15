import { getRequestConfig } from "next-intl/server"
import { routing } from "./routing"

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (!locale || !routing.locales.includes(locale as "en" | "es")) {
    locale = routing.defaultLocale
  }
  const [common, home, partner, operator] = await Promise.all([
    import(`../messages/${locale}/common.json`),
    import(`../messages/${locale}/home.json`),
    import(`../messages/${locale}/partner.json`),
    import(`../messages/${locale}/operator.json`),
  ])

  return {
    locale: locale as "en" | "es",
    messages: {
      common: common.default,
      home: home.default,
      partner: partner.default,
      operator: operator.default,
    },
  }
})
