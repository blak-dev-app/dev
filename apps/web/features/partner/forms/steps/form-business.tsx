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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@blak/ui/components/select"
import { Input } from "@blak/ui/components/input"

import { BUSINESS_TYPES } from "../form.const"

import { COUNTRIES } from "@/features/shared/shared.data"
import { useTranslations } from "next-intl"
import { PartnerSchema } from "../../partner.schema"

export const FormBusiness = () => {
  const t = useTranslations("partner.form")
  const form = useFormContext<PartnerSchema>()

  return (
    <FieldGroup>
      <Controller
        name="businessName"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {t("businessName.label")}
            </FieldLabel>

            <Input
              {...field}
              id={field.name}
              placeholder={t("businessName.placeholder")}
              aria-invalid={fieldState.invalid}
            />

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="businessType"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>{t("businessType.label")}</FieldLabel>

            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger aria-invalid={fieldState.invalid}>
                <SelectValue placeholder={t("businessType.placeholder")} />
              </SelectTrigger>

              <SelectContent>
                {BUSINESS_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <FieldDescription>{t("businessType.description")}</FieldDescription>

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="website"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>{t("website.label")}</FieldLabel>

            <Input
              {...field}
              id={field.name}
              type="url"
              placeholder={t("website.placeholder")}
              aria-invalid={fieldState.invalid}
            />

            <FieldDescription>{t("website.description")}</FieldDescription>

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="socialMedia"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {t("socialMedia.label")}
            </FieldLabel>

            <Input
              {...field}
              id={field.name}
              placeholder={t("socialMedia.placeholder")}
            />

            <FieldDescription>{t("website.description")}</FieldDescription>
          </Field>
        )}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <Controller
          name="city"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{t("city.label")}</FieldLabel>

              <Input
                {...field}
                id={field.name}
                placeholder={t("city.placeholder")}
                aria-invalid={fieldState.invalid}
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="country"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t("country.label")}</FieldLabel>

              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder={t("country.placeholder")} />
                </SelectTrigger>

                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
    </FieldGroup>
  )
}
