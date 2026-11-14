import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line [&_svg:not([class*=size-])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        outline: "border border-border-strong bg-transparent hover:bg-surface-2",
        ghost: "hover:bg-surface-2",
        soft: "bg-accent text-foreground hover:opacity-90",
      },
      size: { default: "h-10 px-4", sm: "h-8 px-3 text-xs", lg: "h-12 px-5 text-base", icon: "size-10" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export function Button({ className, variant, size, asChild, ...p }: React.ComponentProps<"button"> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const C = asChild ? Slot : "button";
  return <C className={cn(variants({ variant, size }), className)} {...p} />;
}
