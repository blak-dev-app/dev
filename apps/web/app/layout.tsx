import "./styles.css"
import { cn } from "@blak/ui/lib/utils"

import { Manrope } from "next/font/google"
import { Metadata } from "next"
import GoogleAnalytics from "@/components/analytics/google-analytics"
import { WebVitals } from "@/components/analytics/web-vitals"
import { AppDialogProvider } from "@blak/ui/components/blak/app-dialog"

const varela = Manrope({
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "BLAK | A First Class Experience",
  description:
    "Experience first class transportation from curb to destination with BLAK's managed network of vetted chauffeurs, premium black vehicles, and hospitality-led service.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        varela.variable,
        "font-sans font-normal antialiased selection:bg-primary/10"
      )}
    >
      <body>
        <AppDialogProvider>{children}</AppDialogProvider>
        <GoogleAnalytics />
        {/* Core Web Vitals Tracking */}
        <WebVitals />
      </body>
    </html>
  )
}
