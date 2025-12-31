import * as React from "react"
import { cn } from "@/components/utils/cn"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 focus-visible:border-[#D4AF37] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm hover:bg-white hover:border-[#D4AF37]/30 resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }