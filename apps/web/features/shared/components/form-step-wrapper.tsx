import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@blak/ui/components/field"

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
