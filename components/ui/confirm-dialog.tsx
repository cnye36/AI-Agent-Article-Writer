"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "default";
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<{
    id: string;
    title?: string;
    message: string;
    confirmText: string;
    cancelText: string;
    variant: "danger" | "default";
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback(
    (options: ConfirmDialogOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        const id = Math.random().toString(36).substring(2, 9);
        setDialog({
          id,
          title: options.title,
          message: options.message,
          confirmText: options.confirmText || "Confirm",
          cancelText: options.cancelText || "Cancel",
          variant: options.variant || "default",
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    if (dialog) {
      dialog.resolve(true);
      setDialog(null);
    }
  }, [dialog]);

  const handleCancel = useCallback(() => {
    if (dialog) {
      dialog.resolve(false);
      setDialog(null);
    }
  }, [dialog]);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 max-w-md w-full mx-4 shadow-2xl pointer-events-auto">
            <div className="flex items-start gap-4">
              {dialog.variant === "danger" && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
              )}
              <div className="flex-1">
                {dialog.title && (
                  <h3 className="text-lg font-semibold text-white mb-2">{dialog.title}</h3>
                )}
                <p className="text-zinc-300 text-sm mb-4">{dialog.message}</p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-white transition-colors"
                  >
                    {dialog.cancelText}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`px-4 py-2 rounded text-sm text-white transition-colors ${
                      dialog.variant === "danger"
                        ? "bg-red-600 hover:bg-red-500"
                        : "bg-blue-600 hover:bg-blue-500"
                    }`}
                  >
                    {dialog.confirmText}
                  </button>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="text-zinc-400 hover:text-zinc-300 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider");
  }
  return context;
}

