import * as React from "react"
import { cn } from "@/lib/utils"

export interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  prefix?: string;
}

export function CurrencyInput({
  className,
  value,
  onValueChange,
  prefix = "₦",
  placeholder,
  ...props
}: CurrencyInputProps) {
  // Format numeric string to locale currency format (e.g. 1000 -> 1,000)
  const formatValue = (val: string) => {
    if (!val) return ""
    // Remove all non-digits except decimals
    const clean = val.replace(/[^\d.]/g, "")
    const parts = clean.split(".")
    
    // Format the integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    
    // Join back with decimal part if it exists
    return parts.join(".")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value
    
    // If prefix is present at start, remove it
    if (prefix && raw.startsWith(prefix)) {
      raw = raw.slice(prefix.length)
    }
    
    // Strip everything except digits and decimal point
    let clean = raw.replace(/[^\d.]/g, "")
    
    // Ensure only one decimal point
    const parts = clean.split(".")
    if (parts.length > 2) {
      clean = parts[0] + "." + parts.slice(1).join("")
    }

    onValueChange(clean)
  }

  const formattedValue = formatValue(value)
  const displayValue = formattedValue ? `${prefix}${formattedValue}` : ""

  return (
    <div className="relative w-full">
      {prefix && (
        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground text-sm pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder ? `${prefix}${placeholder}` : ""}
        data-slot="input"
        className={cn(
          "h-12 w-full min-w-0 rounded-full border-2 border-border bg-input/30 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          prefix ? "pl-9 pr-4" : "px-4",
          className
        )}
        {...props}
      />
    </div>
  )
}
