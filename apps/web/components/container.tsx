import { cn } from "@blak/ui/lib/utils"
import React from "react"

export const Container = ({
  className,

  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="container"
      className={cn("mx-auto w-full px-6 md:px-8 2xl:container", className)}
      {...props}
    />
  )
}
