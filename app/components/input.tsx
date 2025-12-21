import { forwardRef, useId } from "react";

export let Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ onFocus, className = "", ...props }, ref) => {
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Move cursor to end of text when focused (only if there's text)
    if (e.target.value) {
      const len = e.target.value.length;
      e.target.setSelectionRange(len, len);
    }

    // Call the original onFocus handler if provided
    onFocus?.(e);
  };

  return (
    <input
      {...props}
      ref={ref}
      onFocus={handleFocus}
      className={`block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 shadow-sm ring-0 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent sm:text-sm sm:leading-6 ${className}`}
    />
  );
});

export let Label = forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>((props, ref) => {
  return (
    <label
      {...props}
      ref={ref}
      className="block text-sm font-medium leading-6 text-slate-700 dark:text-slate-300"
    />
  );
});

export let LabeledInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label: React.ReactNode;
    id?: string;
  }
>(({ id, label, ...props }, ref) => {
  let uid = useId();
  id = id ?? uid;
  return (
    <>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-2">
        <Input {...props} ref={ref} id={id} />
      </div>
    </>
  );
});
