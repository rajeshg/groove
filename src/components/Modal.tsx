import * as React from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { X } from "lucide-react";

export function Modal({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const [isClosing, setIsClosing] = React.useState(false);

  // Determine parent route by removing the last segment
  const getParentRoute = () => {
    const segments = location.pathname.split("/").filter(Boolean);
    segments.pop(); // Remove last segment (e.g., 'settings')
    return "/" + segments.join("/");
  };

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.showModal();
      // Prevent focus from jumping to inputs when opening
      dialog.focus();
    }
  }, []);

  const handleClose = () => {
    // Navigate to parent route when modal closes
    const parentRoute = getParentRoute();
    navigate({ to: parentRoute });
  };

  const requestClose = () => {
    if (isClosing) return;

    setIsClosing(true);
    const dialog = dialogRef.current;

    if (dialog) {
      // Add closing animation class
      dialog.classList.add("closing");

      // Wait for animation to complete before closing
      setTimeout(() => {
        dialog.close();
      }, 150);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onClick={(e) => {
        // Close when clicking the backdrop
        if (e.target === dialogRef.current) {
          requestClose();
        }
      }}
      onCancel={(e) => {
        // Prevent ESC from immediately closing without animation
        e.preventDefault();
        requestClose();
      }}
      className="fixed inset-0 z-50 m-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 p-0 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 backdrop:bg-slate-950/50 w-[calc(100%-2rem)] max-w-lg h-auto max-h-[90vh] md:max-h-[calc(100vh-4rem)] overflow-hidden outline-none flex flex-col animate-in fade-in zoom-in-95 duration-200"
      style={{
        animation: isClosing
          ? "fadeOut 150ms ease-out forwards, zoomOut 150ms ease-out forwards"
          : undefined,
      }}
    >
      <style>{`
        @keyframes fadeOut {
          to { opacity: 0; }
        }
        @keyframes zoomOut {
          to { transform: scale(0.95); }
        }
      `}</style>
      <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
        <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <button
          onClick={requestClose}
          className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 md:p-6 overflow-y-auto flex-1 overscroll-contain">
        {children}
      </div>
    </dialog>
  );
}
