import { useEffect } from "react";
import { X } from "lucide-react";

import Button from "./Button.jsx";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  showCloseButton = true,
  closeOnBackdrop = true,
  "data-testid": testId = "modal",
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function handleBackdropClick(event) {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        data-testid={testId}
        className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-[#1e293b]"
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            {title ? (
              <h2
                id="modal-title"
                className="text-lg font-semibold text-slate-800 dark:text-white"
              >
                {title}
              </h2>
            ) : (
              <span />
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="بستن"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        <div className="px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel = "تأیید",
  cancelLabel = "انصراف",
  isLoading = false,
}) {
  return (
    <>
      <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
        {cancelLabel}
      </Button>
      <Button onClick={onConfirm} isLoading={isLoading}>
        {confirmLabel}
      </Button>
    </>
  );
}
