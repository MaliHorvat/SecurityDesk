import type { HTMLAttributes } from "react";
import { cn } from "../utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        className,
      )}
      {...props}
    />
  );
}
