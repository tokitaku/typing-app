import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({
  value,
  className
}: {
  value: number;
  className?: string;
}) {
  const normalized = Math.min(100, Math.max(0, value));
  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={normalized}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      data-slot="progress"
      role="progressbar"
    >
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}
