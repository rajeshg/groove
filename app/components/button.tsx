import { forwardRef } from "react";

export let Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger";
  }
>((props, ref) => {
  const { variant = "primary", className, ...rest } = props;

  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-slate-200 hover:bg-slate-300 text-slate-900",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };

  return (
    <button
      {...rest}
      ref={ref}
      className={`flex w-full justify-center rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest leading-6 shadow-md transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className || ""}`}
    />
  );
});
