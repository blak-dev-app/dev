import { routing } from "./i18n/routing"
import createMiddleware from "next-intl/middleware"

export default createMiddleware(routing)

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next`, `/_vercel` or `/admin`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: "/((?!api|trpc|_next|_vercel|admin|.*\\..*).*)",
}
