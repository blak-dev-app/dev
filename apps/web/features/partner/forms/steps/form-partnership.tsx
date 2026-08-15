import React from "react"
import { useFormContext } from "react-hook-form"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@blak/ui/components/field"

import { Controller } from "react-hook-form"

import { useTranslations } from "next-intl"
import { PartnerSchema } from "../../partner.schema"

import { Checkbox } from "@blak/ui/components/checkbox"
import { PARTNERSHIP_USES } from "../form.const"
import { Textarea } from "@blak/ui/components/textarea"

export const FormPartnership = () => {
  const t = useTranslations("partner.form")
  const form = useFormContext<PartnerSchema>()
  return (
    <FieldGroup>
      <Controller
        name="partnershipUses"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>{t(`${field.name}.label`)}</FieldLabel>
            <div className="space-y-3">
              {PARTNERSHIP_USES.map((option) => {
                const checked = field.value.includes(option.value)

                return (
                  <FieldLabel
                    key={option.value}
                    htmlFor={option.value}
                    className="bg-secondary/50"
                  >
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>{option.label}</FieldTitle>
                      </FieldContent>
                      <Checkbox
                        className="border-neutral-700"
                        id={option.value}
                        checked={checked}
                        onCheckedChange={(value) => {
                          if (value) {
                            field.onChange([...field.value, option.value])
                          } else {
                            field.onChange(
                              field.value.filter(
                                (item) => item !== option.value
                              )
                            )
                          }
                        }}
                      />
                    </Field>
                  </FieldLabel>
                )
              })}
            </div>

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="additionalInformation"
        control={form.control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>
              {t(`${field.name}.label`)}
              <span className="text-muted-foreground">
                {t(`${field.name}.optional`)}
              </span>
            </FieldLabel>
            <Textarea
              {...field}
              id={field.name}
              placeholder={t(`${field.name}.placeholder`)}
              className="min-h-32 resize-none"
            />
          </Field>
        )}
      />

      <Controller
        name="acknowledgment"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel data-invalid={fieldState.invalid}>
              <Field orientation="horizontal">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="border-neutral-700"
                  aria-invalid={fieldState.invalid}
                />
                <FieldContent>
                  <FieldTitle>{t(`${field.name}.title`)}</FieldTitle>
                  <FieldDescription>
                    {t(`${field.name}.description`)}
                  </FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </FieldGroup>
  )
}
