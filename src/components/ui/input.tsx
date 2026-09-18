import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl bg-surface-2 border border-border px-4 py-3 text-[16px] text-foreground placeholder:text-muted outline-none focus:border-accent transition-colors",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl bg-surface-2 border border-border px-4 py-3 text-[16px] text-foreground outline-none focus:border-accent transition-colors",
        className
      )}
      {...props}
    />
  );
}

export function Label({ children, htmlFor }: { children: string; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[14px] font-medium text-muted">
      {children}
    </label>
  );
}
