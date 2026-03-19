import * as React from "react"

import { cn } from "@/lib/utils"

type WwwLayoutProps = {
  children: React.ReactNode
  className?: string
}

export function WwwLayout({ children, className }: WwwLayoutProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  )
}
