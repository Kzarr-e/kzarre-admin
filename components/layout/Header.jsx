"use client";

import React, { useState } from "react";
import { Search, Bell } from "lucide-react";
import DarkModeToggle from "@/components/DarkModeToggle";
import NotificationProvider from "@/components/NotificationProvider";
import { useNotificationStore } from "@/lib/notificationStore";
export default function Header() {
  const [open, setOpen] = useState(false);

  // Temporary count (replace later with real notification count)
  const notificationCount = 3;
  const { unreadCount } = useNotificationStore();
  return (
    <>
      {/* Notification Panel */}
      {open && (
        <NotificationProvider
          isOpen={open}
          onClose={() => setOpen(false)}
        />
      )}

      <header className="bg-[var(--background-card)] border-b border-[var(--sidebar-border)] sticky top-0 z-40">
        <div className="flex items-center justify-between px-8 py-4">

          {/* Search */}
          <div className="flex-1 max-w-md px-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                size={18}
              />

              <input
                type="text"
                placeholder="Search"
                className="
                w-full
                bg-[var(--background-card)]
                border border-[var(--sidebar-border)]
                text-[var(--text-primary)]
                rounded-lg
                pl-10 pr-4 py-2
                text-sm
                focus:outline-none
                focus:ring-1
                focus:ring-[var(--accent-green)]
                "
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-6 ml-8">

            {/* Notification Bell */}
            <button
              onClick={() => setOpen(!open)}
              className="relative p-2 rounded-lg hover:bg-[var(--accent-green)] transition"
            >
              <Bell size={20} />

              {unreadCount > 0 && (
                <span
                  className="
                  absolute -top-1 -right-1
                  flex items-center justify-center
                  min-w-[18px] h-[18px]
                  px-1
                  text-[10px] font-semibold
                  text-white
                  bg-green-500 dark:bg-green-600
                  rounded-full
                  shadow
                  "
                >
                    {unreadCount}
                </span>
              )}
            </button>

            {/* Dark Mode */}
            <DarkModeToggle />

          </div>
        </div>
      </header>
    </>
  );
}