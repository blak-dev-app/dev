"use client"
import React from "react"
import { API_URL } from "@/lib/API"
import { useTranslations } from "next-intl"
import { Button } from "@blak/ui/components/button"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm } from "react-hook-form"
import { ArrowRight, Loader2 } from "lucide-react"
import { OperatorFormValues, operatorSchema } from "../operator.schema"
import { StepWrapper } from "@/features/shared/components/form-step-wrapper"
import { INITIAL_VALUES } from "./form.const"
import { STEPS } from "./form.steps"
import { useRouter } from "@/i18n/navigation"
import { useAppDialog } from "@blak/ui/components/blak/app-dialog"

const SUBMIT_STEP = STEPS.length - 1

export const OperatorForm = () => {
  const commonT = useTranslations("common")
  const t = useTranslations("operator.form")
  const router = useRouter()
  const { open } = useAppDialog()
  const [active, setActive] = React.useState(0)
  const [pending, setPending] = React.useState(false)

  const form = useForm({
    defaultValues: INITIAL_VALUES,
    resolver: zodResolver(operatorSchema),
    mode: "onTouched",
  })

  async function onSubmit(values: OperatorFormValues) {
    setPending(true)
    try {
      const payload = {
        formType: "operator",
        ...values,
        operatingMarkets: values.operatingMarkets.join(", "),
        serviceTypes: values.serviceTypes.join(", "),
      }

      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      open({
        variant: "success",
        title: "Application received.",
        description:
          "Thank you for your interest in joining the BLAK Operator Network. Our team will review your application and contact you shortly.",
        action: {
          label: "Done",
          onClick: () => router.push("/"),
        },
      })
      form.reset()
    } catch (error) {
      console.log("submit failed - operator-form:", error)
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

    if (!step) return

    const fields = Object.keys(
      step.schema.shape
    ) as (keyof OperatorFormValues)[]

    const valid = await form.trigger(fields)

    if (!valid) return

    setActive((current) => current + 1)
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (e) => console.log("error", e))}
        className="relative grid gap-6 rounded-2xl bg-muted/80 p-8 shadow-[1px_-1px_0px_0px_#ffffff20] lg:p-12"
      >
        {STEPS.map((step, i) => {
          if (i !== active) return null

          return (
            <div key={step.key}>
              <StepWrapper
                title={t(`steps.${step.key}.title`)}
                description={t(`steps.${step.key}.description`)}
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
