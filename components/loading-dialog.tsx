"use client";

interface LoadingDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
}

export function LoadingDialog({ 
  isOpen, 
  title = "Processing...", 
  message = "Please wait while we work on this." 
}: LoadingDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 max-w-md w-full mx-4 shadow-2xl pointer-events-auto">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-zinc-400 text-sm">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

