import React from "react"
import { useFormContext } from "react-hook-form"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldTitle,
} from "@blak/ui/components/field"

import { Controller } from "react-hook-form"
import { Input } from "@blak/ui/components/input"
import { useTranslations } from "next-intl"
import { PartnerSchema } from "../../partner.schema"
import { Checkbox } from "@blak/ui/components/checkbox"
import { Textarea } from "@blak/ui/components/textarea"
import { RadioGroup, RadioGroupItem } from "@blak/ui/components/radio-group"
import { TRANSPORTATION_OPTIONS, TRANSPORTATION_SERVICES } from "../form.const"

export const FormOperation = () => {
  const form = useFormContext<PartnerSchema>()
  const t = useTranslations("partner.form")
  return (
    <FieldGroup>
      <Controller
        name="propertiesRooms"
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
            <FieldDescription>
              {t(`${field.name}.description`)}
            </FieldDescription>

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="monthlyBookings"
        control={form.control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>
              {t(`${field.name}.label`)}
            </FieldLabel>

            <Input
              {...field}
              id={field.name}
              placeholder={t(`${field.name}.placeholder`)}
            />

            <FieldDescription>
              {t(`${field.name}.description`)}
            </FieldDescription>
          </Field>
        )}
      />

      <Controller
        name="currentTransportation"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLegend variant="label">
              {t(`${field.name}.label`)}
            </FieldLegend>
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="grid gap-3 sm:grid-cols-3"
            >
              {TRANSPORTATION_OPTIONS.map((option) => (
                <FieldLabel
                  key={option.value}
                  htmlFor={option.value}
                  className="bg-secondary/50"
                >
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>{option.label}</FieldTitle>
                    </FieldContent>
                    <RadioGroupItem
                      className="border-neutral-700"
                      value={option.value}
                      id={option.value}
                    />
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="transportationDetails"
        control={form.control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>
              {t(`${field.name}.label`)}
            </FieldLabel>
            <Textarea
              {...field}
              id={field.name}
              placeholder={t(`${field.name}.placeholder`)}
              className="min-h-28 resize-none"
            />
          </Field>
        )}
      />

      <Controller
        name="transportationServices"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div>
              <FieldLegend variant="label" className="mb-2">
                {t(`${field.name}.label`)}
              </FieldLegend>
              <FieldDescription>
                {t(`${field.name}.description`)}
              </FieldDescription>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {TRANSPORTATION_SERVICES.map((option) => {
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
    </FieldGroup>
  )
}
