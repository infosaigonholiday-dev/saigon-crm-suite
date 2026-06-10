import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-bg-surface text-fg-muted",
        brand: "border-brand/30 bg-brand/10 text-brand",
        success: "border-accent-green/30 bg-accent-green/10 text-accent-green",
        warning: "border-accent-amber/30 bg-accent-amber/10 text-accent-amber",
        danger: "border-accent-red/30 bg-accent-red/10 text-accent-red",
        info: "border-accent-blue/30 bg-accent-blue/10 text-accent-blue",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
