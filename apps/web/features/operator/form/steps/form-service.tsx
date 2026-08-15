import { useTranslations } from "next-intl"
import { Controller, useFormContext } from "react-hook-form"
import { OperatorFormValues } from "../../operator.schema"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@blak/ui/components/field"
import { Input } from "@blak/ui/components/input"
import { SERVICE_TYPES } from "../form.const"
import { Checkbox } from "@blak/ui/components/checkbox"

export const FormService = () => {
  const t = useTranslations("operator.form")
  const form = useFormContext<OperatorFormValues>()

  return (
    <FieldGroup>
      <Controller
        name="vehicleCount"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {t("vehicleCount.label")}
            </FieldLabel>

            <Input
              {...field}
              id={field.name}
              placeholder={t("vehicleCount.placeholder")}
              aria-invalid={fieldState.invalid}
            />

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="chauffeurCount"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {t("chauffeurCount.label")}
            </FieldLabel>

            <Input
              {...field}
              id={field.name}
              placeholder={t("chauffeurCount.placeholder")}
              aria-invalid={fieldState.invalid}
            />

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="serviceTypes"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>{t("serviceTypes.label")}</FieldLabel>

            <div className="grid grid-cols-2 gap-2">
              {SERVICE_TYPES.map((option) => {
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
