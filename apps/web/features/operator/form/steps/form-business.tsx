import { useTranslations } from "next-intl"
import { Controller, useFormContext } from "react-hook-form"
import { OperatorFormValues } from "../../operator.schema"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@blak/ui/components/field"
import { Input } from "@blak/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@blak/ui/components/select"
import { PhoneInput } from "@blak/ui/components/phone-input"
import { COMPANY_TYPES } from "../form.const"

export const FormBusiness = () => {
  const t = useTranslations("operator.form")
  const form = useFormContext<OperatorFormValues>()

  return (
    <FieldGroup>
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>{t("name.label")}</FieldLabel>

            <Input
              {...field}
              id={field.name}
              placeholder={t("name.placeholder")}
              aria-invalid={fieldState.invalid}
            />

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="operatingName"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {t("operatingName.label")}
            </FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder={t("operatingName.placeholder")}
              aria-invalid={fieldState.invalid}
            />

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="type"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>{t("type.label")}</FieldLabel>

            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger aria-invalid={fieldState.invalid}>
                <SelectValue placeholder={t("type.placeholder")} />
              </SelectTrigger>

              <SelectContent>
                {COMPANY_TYPES.map((market) => (
                  <SelectItem key={market.value} value={market.value}>
                    {market.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Controller
          name="phone"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{t("phone.label")}</FieldLabel>
              <PhoneInput
                {...field}
                id={field.name}
                value={field.value}
                onChange={field.onChange}
                placeholder={t(`phone.placeholder`)}
                aria-invalid={fieldState.invalid}
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{t("email.label")}</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder={t("email.placeholder")}
                aria-invalid={fieldState.invalid}
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <Controller
        name="website"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>{t("website.label")}</FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder={t("website.placeholder")}
              aria-invalid={fieldState.invalid}
            />

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </FieldGroup>
  )
}
