import { cn } from "@/lib/utils";
export const Input = ({ className, ...p }: React.ComponentProps<"input">) => (
  <input className={cn("h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-[15px] outline-none placeholder:text-muted focus:border-line", className)} {...p} />
);
export const Field = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <label className={cn("flex flex-col gap-1.5 text-[13px] text-muted", className)}>{label}{children}</label>
);
export const Select = ({ className, ...p }: React.ComponentProps<"select">) => (
  <select className={cn("h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-[15px] text-foreground outline-none focus:border-line", className)} {...p} />
);
