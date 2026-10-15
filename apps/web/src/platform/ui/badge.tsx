import * as React from "react";
import { cn } from "./formatacao";

const toneClass = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-yellow-700 dark:text-yellow-300",
  danger: "bg-danger/10 text-danger",
  primary: "bg-primary/10 text-primary"
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof toneClass }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium", toneClass[tone], className)}
      {...props}
    />
  );
}
