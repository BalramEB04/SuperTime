import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary-subtle text-primary border border-primary-subtle-border",
        primary:
          "bg-primary text-primary-foreground shadow-2xs",
        secondary:
          "bg-secondary text-secondary-foreground border border-border",
        success:
          "bg-success-subtle text-success-foreground border border-success-border",
        warning:
          "bg-warning-subtle text-warning-foreground border border-warning-border",
        destructive:
          "bg-destructive-subtle text-destructive-foreground border border-destructive-border",
        info:
          "bg-info-subtle text-info-foreground border border-info-border",
        outline:
          "text-foreground border border-border bg-surface",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
