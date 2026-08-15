import React from "react"

import { getTranslations } from "next-intl/server"

import { OperatorHero } from "@/features/operator/components/operator-hero"
import { WhoCanApply } from "@/features/operator/components/who-can-apply"
import { OperatorCTA } from "@/features/operator/components/operator-cta"
import { OperatorFormSection } from "@/features/operator/components/operator-form-section"
import { OperatorProcess } from "@/features/operator/components/operator-process"
import { OperatorMarque } from "@/features/operator/components/operator-marque"

const OperatorPage = async () => {
  const t = await getTranslations("operator.form")
  return (
    <React.Fragment>
      <OperatorHero />
      <OperatorMarque />
      <WhoCanApply />
      <OperatorProcess />
      <OperatorFormSection />
      <OperatorCTA />
    </React.Fragment>
  )
}

export default OperatorPage
