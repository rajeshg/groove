import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export type StatusButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    status?: "idle" | "pending" | "success" | "error";
    variant?: "primary" | "secondary" | "danger";
  };

export const StatusButton = forwardRef<HTMLButtonElement, StatusButtonProps>(
  (
    {
      status = "idle",
      variant = "primary",
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20",
      secondary:
        "bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100",
      danger: "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20",
    };

    const isPending = status === "pending";
    const isDisabled = disabled || isPending;

    return (
      <button
        ref={ref}
        {...props}
        type={props.type || "submit"}
        disabled={isDisabled}
        className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest leading-6 shadow-md transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      >
        <span>{children}</span>
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
      </button>
    );
  }
);

StatusButton.displayName = "StatusButton";
