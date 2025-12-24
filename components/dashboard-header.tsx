"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";

const dashboardTabs = ["overview", "create", "topics", "library", "published"] as const;
type DashboardTab = typeof dashboardTabs[number];

interface DashboardHeaderProps {
  activeTab?: DashboardTab | null;
}

export function DashboardHeader({ activeTab }: DashboardHeaderProps) {
  const router = useRouter();

  // Use activeTab prop if provided, otherwise no tab is active
  const currentTab = activeTab || null;

  const handleTabClick = (tab: DashboardTab) => {
    router.push(`/dashboard?tab=${tab}`);
  };

  return (
    <header className="border-b border-slate-200 dark:border-zinc-800 px-4 sm:px-6 py-4 bg-white dark:bg-zinc-950">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/letaiwriteit-logo-256px.png"
            alt="Let AI Write It!"
            width={48}
            height={48}
            className="flex-shrink-0"
            priority
          />
          <h1 className="text-xl font-bold">
            Let <span className="text-blue-500">AI</span> Write It!
          </h1>
        </Link>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <nav className="flex gap-1 bg-slate-100 dark:bg-zinc-900 rounded-lg p-1 w-full sm:w-auto">
            {dashboardTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabClick(tab)}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  currentTab === tab
                    ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <UserNav />
          </div>
        </div>
      </div>
    </header>
  );
}

