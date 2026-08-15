"use client"

import React from "react"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@blak/ui/components/field"
import { API_URL } from "@/lib/API"
import { Input } from "@blak/ui/components/input"
import { Loader2 } from "lucide-react"
import { Button } from "@blak/ui/components/button"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Textarea } from "@blak/ui/components/textarea"

import { partnershipFormSchema, PartnershipFormValues } from "../contact.schema"

import { PhoneInput } from "@blak/ui/components/phone-input"
import { useAppDialog } from "@blak/ui/components/blak/app-dialog"
import { useRouter } from "@/i18n/navigation"

export function PartnershipForm() {
  const router = useRouter()
  const { open } = useAppDialog()
  const [pending, setSubmission] = React.useState(false)

  const form = useForm<PartnershipFormValues>({
    resolver: zodResolver(partnershipFormSchema),
    defaultValues: {
      contactName: "",
      phone: "",
      email: "",
      companyName: "",
      message: "",
    },
  })

  async function onSubmit(values: PartnershipFormValues) {
    setSubmission(true)
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({ ...values, formType: "contact" }),
      })

      open({
        variant: "success",
        title: "Thank you for contacting BLAK.",
        description:
          "Our team will review your request and contact you shortly.",
        action: {
          label: "Done",
          onClick: () => router.push("/"),
        },
      })
      form.reset()
    } catch (error) {
      console.log("submit failed - contact-form:", error)
      open({
        variant: "warning",
        title: "Unable to submit your request.",
        description:
          "Something went wrong while submitting your request. Please try again.",
        action: {
          label: "Okay",
        },
      })
      form.reset()
    } finally {
      setSubmission(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup>
        <Controller
          name="contactName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="your name"
                autoComplete="off"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="phone"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                <PhoneInput
                  {...field}
                  id={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="123 456 7890"
                  aria-invalid={fieldState.invalid}
                ></PhoneInput>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="yourname@email.com"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>
        <Controller
          name="companyName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Company</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="company name"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="message"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Message</FieldLabel>
              <Textarea
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="Type your message here..."
                className="min-h-28 resize-none"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <div className="text-right">
        <Button type="submit" disabled={pending} className="ml-auto min-w-24">
          {pending ? <Loader2 className="animate-spin" /> : "Send"}
        </Button>
      </div>
    </form>
  )
}
