import { Container } from "@/components/container"
import { Link } from "@/i18n/navigation"
import { Button } from "@blak/ui/components/button"
import { getTranslations } from "next-intl/server"
import React from "react"

export const ManagedExperience = async () => {
  const t = await getTranslations("home.managedExperience")
  return (
    <section>
      <div className="grid">
        <div className="h-fulloverflow-hidden col-start-1 row-start-1 rounded-lg">
          <video
            className="h-180 w-full object-cover md:h-150"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          >
            <source src={"/blak.mp4"} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        <div className="relative z-1 col-start-1 row-start-1 bg-background/90">
          <Container>
            <div className="flex h-180 flex-col items-center justify-center space-y-8 py-20 text-center md:h-150">
              <h2 className="flex flex-col items-center gap-2">
                <span className="bg-linear-to-r from-primary to-foreground bg-clip-text text-sm font-medium text-transparent uppercase">
                  {t("subtitle")}
                </span>
                <span className="text-center text-4xl font-semibold">
                  {t("title")}
                </span>
              </h2>

              <div className="mx-auto max-w-3xl text-center">
                <p className="text-lg font-medium wrap-break-word">
                  {t("description")}
                </p>
              </div>
              <Button asChild>
                <Link href="/partners"> {t("overview")}</Link>
              </Button>
            </div>
          </Container>
        </div>
      </div>
    </section>
  )
}
