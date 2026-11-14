"use client";
import { cn } from "@/lib/utils";
export function Segmented<T extends string>({ value, onChange, options, className, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-lg border border-border bg-surface p-0.5", className)}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cn("min-h-8 flex-1 rounded-md px-3 text-[13px] font-medium text-muted transition-colors cursor-pointer", value === o.value && "bg-accent text-foreground")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
