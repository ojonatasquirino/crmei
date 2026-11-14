import { cn } from "@/lib/utils";
export const Card = ({ className, ...p }: React.ComponentProps<"div">) => <div className={cn("rounded-2xl border border-border bg-surface p-5", className)} {...p} />;
export const CardTitle = ({ className, ...p }: React.ComponentProps<"h2">) => <h2 className={cn("text-[15px] font-semibold", className)} {...p} />;
export const Label = ({ className, ...p }: React.ComponentProps<"div">) => <div className={cn("text-[13px] text-muted", className)} {...p} />;
