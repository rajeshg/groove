import { useState } from "react";

/**
 * Hook for implementing two-step confirmation dialogs
 * First click shows confirmation state, second click submits
 * Escape key or blur resets the state
 *
 * Usage:
 * ```
 * const dc = useDoubleCheck()
 * <button {...dc.getButtonProps({ type: 'submit' })}>
 *   {dc.doubleCheck ? 'Are you sure?' : 'Delete'}
 * </button>
 * ```
 */
export function useDoubleCheck() {
  const [doubleCheck, setDoubleCheck] = useState(false);

  function getButtonProps(
    props?: React.ButtonHTMLAttributes<HTMLButtonElement>
  ) {
    const onBlur = () => setDoubleCheck(false);

    const onClick = doubleCheck
      ? undefined
      : (e: React.MouseEvent<HTMLButtonElement>) => {
          e.preventDefault();
          setDoubleCheck(true);
        };

    const onKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Escape") {
        setDoubleCheck(false);
      }
    };

    return {
      ...props,
      onBlur,
      onClick,
      onKeyUp,
    };
  }

  return { doubleCheck, getButtonProps };
}
