import { cn } from "@/lib/utils";

interface SectionTagProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'info';
}

const tagVariants = {
  default: "bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-400/20 text-purple-700 dark:text-purple-300",
  primary: "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-400/20 text-blue-700 dark:text-blue-300",
  secondary: "bg-gradient-to-r from-gray-500/10 to-slate-500/10 border-gray-400/20 text-gray-700 dark:text-gray-300",
  accent: "bg-gradient-to-r from-rose-500/10 to-pink-500/10 border-rose-400/20 text-rose-700 dark:text-rose-300",
  success: "bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-400/20 text-emerald-700 dark:text-emerald-300",
  warning: "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-400/20 text-amber-700 dark:text-amber-300",
  info: "bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border-teal-400/20 text-teal-700 dark:text-teal-300",
};

export function SectionTag({
  children,
  className,
  variant = 'default'
}: SectionTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium backdrop-blur-sm",
        "shadow-lg hover:shadow-xl transition-all duration-300",
        "cursor-default",
        tagVariants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}