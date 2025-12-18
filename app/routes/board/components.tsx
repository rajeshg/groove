import { useFetcher } from "react-router";
import { forwardRef, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Input } from "../../components/input";

export let SaveButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  return (
    <button
      ref={ref}
      // this makes it so the button takes focus on clicks in safari I can't
      // remember if this is the proper workaround or not, it's been a while!
      // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#clicking_and_focus
      // https://bugs.webkit.org/show_bug.cgi?id=22261
      tabIndex={0}
      {...props}
      className="text-sm rounded-lg text-left p-2 font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
    />
  );
});

export let CancelButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      tabIndex={0}
      {...props}
      className="text-sm rounded-lg text-left p-2 font-medium hover:bg-slate-200 focus:bg-slate-200"
    />
  );
});

export function EditableText({
  children,
  fieldName,
  value,
  inputClassName,
  inputLabel,
  buttonClassName,
  buttonLabel,
  placeholder,
  hiddenFields = {},
}: {
  children: React.ReactNode;
  fieldName: string;
  value: string;
  inputClassName: string;
  inputLabel: string;
  buttonClassName: string;
  buttonLabel: string;
  placeholder?: string;
  hiddenFields?: Record<string, string>;
}) {
  let fetcher = useFetcher();
  let [edit, setEdit] = useState(false);
  let inputRef = useRef<HTMLInputElement>(null);
  let buttonRef = useRef<HTMLButtonElement>(null);
  let editContainerRef = useRef<HTMLDivElement>(null);

  // optimistic update
  if (fetcher.formData?.has(fieldName)) {
    value = String(fetcher.formData.get("name"));
  }

  const submitEdit = () => {
    const newValue = inputRef.current?.value || "";
    if (newValue.trim() !== "" && newValue !== value) {
      // Include the hidden fields in the submission
      const formDataObj: Record<string, string> = {
        [fieldName]: newValue,
        ...hiddenFields,
      };
      fetcher.submit(formDataObj, { method: "post" });
    }
    setEdit(false);
  };

  const handleClickOutside = (e: React.FocusEvent<HTMLDivElement>) => {
    if (
      edit &&
      editContainerRef.current &&
      !editContainerRef.current.contains(e.relatedTarget as Node)
    ) {
      submitEdit();
    }
  };

  return edit ? (
    <div ref={editContainerRef} onBlur={handleClickOutside}>
      {children}
      <Input
        required
        ref={inputRef}
        type="text"
        aria-label={inputLabel}
        name={fieldName}
        defaultValue={value}
        className={inputClassName}
        placeholder={placeholder}
        autoFocus
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            submitEdit();
          } else if (event.key === "Escape") {
            flushSync(() => {
              setEdit(false);
            });
            buttonRef.current?.focus();
          }
        }}
      />
    </div>
  ) : (
    <button
      aria-label={buttonLabel}
      type="button"
      ref={buttonRef}
      onClick={() => {
        flushSync(() => {
          setEdit(true);
        });
        inputRef.current?.select();
      }}
      className={buttonClassName}
    >
      {value || <span className="text-slate-400 italic">Edit</span>}
    </button>
  );
}
