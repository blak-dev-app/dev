"use client"

import * as React from "react"
import { API_URL } from "@/lib/API"
import { useTranslations } from "next-intl"
import { ArrowRight, Loader2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm } from "react-hook-form"

import { Button } from "@blak/ui/components/button"
import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@blak/ui/components/field"

import { STEPS } from "./form.steps"
import { INITIAL_VALUES } from "./form.const"
import { type PartnerSchema, partnerSchema } from "../partner.schema"
import { useAppDialog } from "@blak/ui/components/blak/app-dialog"
import { useRouter } from "@/i18n/navigation"

const SUBMIT_STEP = STEPS.length - 1

export function PartnerForm() {
  const commonT = useTranslations("common")
  const router = useRouter()
  const { open } = useAppDialog()
  const t = useTranslations("partner.form")
  const [active, setActive] = React.useState(0)
  const [pending, setPending] = React.useState(false)

  const form = useForm<PartnerSchema>({
    resolver: zodResolver(partnerSchema),
    defaultValues: INITIAL_VALUES,
    mode: "onTouched",
  })

  async function onSubmit(values: PartnerSchema) {
    setPending(true)
    try {
      const payload = {
        formType: "partner",
        ...values,
        phone: `${values.countryCode} ${values.phoneNumber}`,
        transportationServices: values.transportationServices.join(", "),
        partnershipUses: values.partnershipUses.join(", "),
        title: values.position,
      }

      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      open({
        variant: "success",
        title: "Application received.",
        description:
          "Thank you for your interest in joining the BLAK Partner Network. Our team will review your application and contact you shortly.",
        action: {
          label: "Done",
          onClick: () => router.push("/"),
        },
      })
      form.reset()
      setActive(0)
    } catch (error) {
      console.log("submit failed - partner-form:", error)
      open({
        variant: "warning",
        title: "Unable to submit your request.",
        description:
          "Something went wrong while submitting your request. Please try again.",
        action: {
          label: "Okay",
        },
      })
    } finally {
      setPending(false)
    }
  }

  const handleNext = async () => {
    const step = STEPS[active]
    console.log("handle next", step)
    if (!step) return

    const fields = Object.keys(step.schema.shape) as (keyof PartnerSchema)[]
    console.log(fields)
    const valid = await form.trigger(fields)
    console.log("valid", valid)
    if (!valid) return

    setActive((current) => current + 1)
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="relative grid gap-6 rounded-2xl bg-muted/80 p-8 shadow-[1px_-1px_0px_0px_#ffffff20] lg:p-12"
      >
        {STEPS.map((step, i) => {
          if (i !== active) return null
          return (
            <div key={step.key}>
              <StepWrapper
                title={t(`${step.key}.title`)}
                description={t(`${step.key}.description`)}
              >
                <step.component />
              </StepWrapper>
            </div>
          )
        })}

        {active === SUBMIT_STEP ? (
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {commonT("actions.loading")}
              </>
            ) : (
              <>
                {commonT("actions.submit")} <ArrowRight />
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              handleNext()
            }}
            className="w-full"
          >
            {commonT("actions.continue")} <ArrowRight />
          </Button>
        )}
        <div className="flex items-center justify-center gap-1">
          {[...Array(SUBMIT_STEP + 1)].map((_, i) => (
            <Button
              key={i}
              type="button"
              className="h-1 w-4 rounded-full bg-primary"
            />
          ))}
        </div>
      </form>
    </FormProvider>
  )
}

export function StepWrapper({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <FieldSet>
      <div className="space-y-1.5">
        <FieldLegend className="text-xl! font-semibold">{title}</FieldLegend>
        {description && <FieldDescription>{description}</FieldDescription>}
      </div>
      {children}
    </FieldSet>
  )
}
