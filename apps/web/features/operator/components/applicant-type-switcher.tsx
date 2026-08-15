"use client"

import * as React from "react"
import { Button } from "@blak/ui/components/button"
import { OperatorForm } from "../form/operator-form"
import { DriverForm } from "@/features/driver/form/driver-form"

export function ApplicantTypeSwitcher() {
  const [type, setType] = React.useState<"fleet" | "driver">("fleet")

  return (
    <div className="flex flex-col gap-6">
      <div className="inline-flex w-fit rounded-full bg-muted p-1">
        <Button
          type="button"
          variant={type === "fleet" ? undefined : "ghost"}
          size="sm"
          className="rounded-full"
          onClick={() => setType("fleet")}
        >
          Fleet Operator
        </Button>
        <Button
          type="button"
          variant={type === "driver" ? undefined : "ghost"}
          size="sm"
          className="rounded-full"
          onClick={() => setType("driver")}
        >
          Individual Driver
        </Button>
      </div>
      {type === "fleet" ? <OperatorForm /> : <DriverForm />}
    </div>
  )
}
