import { NAV } from "@/lib/config/nav"
import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  const routes = ["/", ...NAV.map((item) => item.href)].filter((i) => i !== "#")

  return routes.map((path) => {
    const normalizedPath =
      path === "/" || path === "#" ? "" : path.replace(/^\/+/, "")

    const enUrl = normalizedPath ? `${SITE_URL}/${normalizedPath}` : SITE_URL

    const esUrl = normalizedPath
      ? `${SITE_URL}/es/${normalizedPath}`
      : `${SITE_URL}/es`

    return {
      url: enUrl,
      lastModified,
      alternates: {
        languages: {
          en: enUrl,
          es: esUrl,
        },
      },
    }
  })
}
