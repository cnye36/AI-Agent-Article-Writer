"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { ChevronDown, User, CreditCard, LogOut, Settings } from "lucide-react";
import { SettingsModal } from "./settings-modal";

export function UserNav() {
  const { user, loading, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<"settings" | "billing">("settings");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (loading) {
    return (
      <div className="h-9 w-20 bg-slate-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/auth/signin"
        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors whitespace-nowrap font-medium"
      >
        Sign In
      </Link>
    );
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white rounded-lg transition-colors border border-slate-200 dark:border-transparent"
        >
          <span className="truncate max-w-[120px] sm:max-w-[200px]">
            {user.email}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-lg z-50">
            <div className="p-2">
              <div className="px-3 py-2 mb-2 border-b border-slate-200 dark:border-zinc-800">
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Signed in as
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {user.email}
                </p>
              </div>

              <button
                onClick={() => {
                  setInitialTab("settings");
                  setIsSettingsModalOpen(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>

              <button
                onClick={() => {
                  setInitialTab("billing");
                  setIsSettingsModalOpen(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Billing
              </button>

              <div className="my-2 border-t border-slate-200 dark:border-zinc-800" />

              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        initialTab={initialTab}
      />
    </>
  );
}

