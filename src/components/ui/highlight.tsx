import { cn } from "@/lib/utils";

const variants = {
  good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  bad: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  neutral: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
} as const;

export function Hi({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
}) {
  return (
    <mark
      className={cn(
        "rounded px-1 py-0.5 font-semibold",
        variants[variant],
      )}
      style={{ textDecoration: "none" }}
    >
      {children}
    </mark>
  );
}
