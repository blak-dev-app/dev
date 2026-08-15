import React from "react"
import { useFormContext } from "react-hook-form"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@blak/ui/components/field"

import { Controller } from "react-hook-form"

import { Input } from "@blak/ui/components/input"

import { useTranslations } from "next-intl"
import { PartnerSchema } from "../../partner.schema"
import { PhoneInput } from "@blak/ui/components/phone-input"

export const FormContact = () => {
  const t = useTranslations("partner.form")
  const form = useFormContext<PartnerSchema>()

  return (
    <FieldGroup>
      <Controller
        name="fullName"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {t(`${field.name}.label`)}
            </FieldLabel>

            <Input
              {...field}
              id={field.name}
              placeholder={t(`${field.name}.placeholder`)}
              autoComplete="name"
              aria-invalid={fieldState.invalid}
            />

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="position"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {t(`${field.name}.label`)}
            </FieldLabel>

            <Input
              {...field}
              id={field.name}
              placeholder={t(`${field.name}.placeholder`)}
              aria-invalid={fieldState.invalid}
            />

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="businessEmail"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {t(`${field.name}.label`)}
            </FieldLabel>

            <Input
              {...field}
              id={field.name}
              type="email"
              placeholder={t(`${field.name}.placeholder`)}
              autoComplete="email"
              aria-invalid={fieldState.invalid}
            />

            <FieldDescription>
              {t(`${field.name}.description`)}
            </FieldDescription>

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="phoneNumber"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {t(`${field.name}.label`)}
            </FieldLabel>

            <PhoneInput
              {...field}
              id={field.name}
              value={field.value}
              onChange={field.onChange}
              placeholder={t(`${field.name}.placeholder`)}
              aria-invalid={fieldState.invalid}
            />

            <FieldDescription>
              {t(`${field.name}.description`)}
            </FieldDescription>

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </FieldGroup>
  )
}
