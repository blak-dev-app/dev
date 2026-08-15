"use client"

import * as React from "react"
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  InfoIcon,
  TriangleAlertIcon,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@blak/ui/components/alert-dialog"
import { cn } from "@blak/ui/lib/utils"

type AppDialogVariant = "success" | "info" | "warning" | "error"

type AppDialogActionConfig = {
  label?: string
  onClick?: () => void | Promise<void>
}

export type AppDialogOptions = {
  variant?: AppDialogVariant
  title: React.ReactNode
  description?: React.ReactNode
  action?: AppDialogActionConfig
  cancel?: AppDialogActionConfig
}

type AppDialogContextValue = {
  open: (options: AppDialogOptions) => void
  close: () => void
}

const AppDialogContext = React.createContext<AppDialogContextValue | null>(null)

const variantConfig = {
  success: {
    icon: CheckCircle2Icon,
    mediaClassName: "text-green-500",
    actionVariant: "default" as const,
  },

  info: {
    icon: InfoIcon,
    mediaClassName: "text-blue-500",
    actionVariant: "default" as const,
  },

  warning: {
    icon: TriangleAlertIcon,
    mediaClassName: "text-yellow-500",
    actionVariant: "default" as const,
  },

  error: {
    icon: AlertCircleIcon,
    mediaClassName: "text-red-500",
    actionVariant: "destructive" as const,
  },
}

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = React.useState<AppDialogOptions | null>(null)

  const open = React.useCallback((options: AppDialogOptions) => {
    setDialog(options)
  }, [])

  const close = React.useCallback(() => {
    setDialog(null)
  }, [])

  const handleAction = React.useCallback(async () => {
    if (!dialog?.action?.onClick) {
      close()
      return
    }

    await dialog.action.onClick()

    close()
  }, [dialog, close])

  const handleCancel = React.useCallback(async () => {
    if (dialog?.cancel?.onClick) {
      await dialog.cancel.onClick()
    }

    close()
  }, [dialog, close])

  const variant = dialog?.variant ?? "info"
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <AlertDialog
      open={!!dialog}
      onOpenChange={(open) => {
        if (!open) {
          close()
        }
      }}
    >
      <AppDialogContext.Provider value={{ open, close }}>
        {children}

        {dialog && (
          <AlertDialogContent className="max-w-sm! p-6">
            <div className="flex flex-col items-center justify-center gap-1.5 text-center">
              <AlertDialogMedia
                className={cn("size-12 rounded-full", config.mediaClassName)}
              >
                <Icon className="size-6" />
              </AlertDialogMedia>

              <AlertDialogTitle className="text-xl font-semibold">
                {dialog.title}
              </AlertDialogTitle>

              {dialog.description && (
                <AlertDialogDescription>
                  {dialog.description}
                </AlertDialogDescription>
              )}
            </div>

            <AlertDialogFooter className="mt-4 grid grid-cols-1 gap-2">
              {dialog.action && (
                <AlertDialogAction
                  variant={config.actionVariant}
                  className="h-10! flex-1"
                  onClick={handleAction}
                >
                  {dialog.action.label ?? "Continue"}
                </AlertDialogAction>
              )}

              {dialog.cancel && (
                <AlertDialogCancel
                  variant="secondary"
                  className="h-10! flex-1"
                  onClick={handleCancel}
                >
                  {dialog.cancel.label ?? "Cancel"}
                </AlertDialogCancel>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AppDialogContext.Provider>
    </AlertDialog>
  )
}

export function useAppDialog() {
  const context = React.useContext(AppDialogContext)

  if (!context) {
    throw new Error("useAlertDialog must be used within <AlertDialogProvider>")
  }

  return context
}
