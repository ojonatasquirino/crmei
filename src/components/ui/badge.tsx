import { cn } from "@/lib/utils";
const tones = { default: "bg-surface-2 text-foreground", ok: "bg-accent text-positive", warn: "bg-warn-bg text-negative border border-warn-border" };
export const Badge = ({ tone = "default", className, ...p }: React.ComponentProps<"span"> & { tone?: keyof typeof tones }) => (
  <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", tones[tone], className)} {...p} />
);
