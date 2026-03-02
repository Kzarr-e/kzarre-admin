"use client";

import { useEffect, useRef, useState } from "react";
import { socket } from "@/app/lib/socket";
import { X } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import toast from "react-hot-toast";

const AUTO_HIDE_MS = 3000;

export default function NotificationProvider({ isOpen = false, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const audioRef = useRef(null);

  // ✅ Load from storage
  useEffect(() => {
    const stored = JSON.parse(
      sessionStorage.getItem("admin_notifications") || "[]"
    );
    setNotifications(stored);
    audioRef.current = new Audio("/notification.mp3");
  }, []);

  useEffect(() => {
    const { logout } = useAuthStore.getState();

    // 🔔 Notification listener
    socket.on("notification", (data) => {
      const item = {
        id: crypto.randomUUID(),
        title: data.title || "New Notification",
        message: data.message || "",
        time: Date.now(),
        read: false,
      };

      setNotifications((prev) => {
        const updated = [item, ...prev];
        sessionStorage.setItem("admin_notifications", JSON.stringify(updated));
        return updated;
      });

      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => { });
      }

      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== item.id)
        );
      }, AUTO_HIDE_MS);
    });

    // 🚨 FORCE LOGOUT LISTENER
  socket.on("force_logout", (data) => {
  console.log("🚨 Force logout received");

  toast.error(data?.message || "Logged in from another device");

  setTimeout(() => {
    // 🔥 CLEAR SESSION STORAGE (NOT localStorage)
    sessionStorage.clear();

    // stop auto reconnect
    socket.io.opts.reconnection = false;

    socket.disconnect();

    window.location.replace("/");
  }, 1500);
});
    return () => {
      socket.off("notification");
      socket.off("force_logout");
    };
  }, []);

  // ✅ Clear all
  const clearAll = () => {
    setNotifications([]);
    sessionStorage.removeItem("admin_notifications");
  };

  // ✅ Show when either:
  // - New notification arrives
  // - Bell icon is clicked
  const visible = notifications.length > 0 || isOpen;

  if (!visible) return null;

  return (
    <div className="fixed top-18 right-4 z-[9999] flex flex-col items-end gap-3">
      {notifications.length > 0 && (
        <button
          onClick={clearAll}
          className="
    mb-1 p-1.5 rounded-full
    bg-black/80 text-white hover:bg-black
    dark:bg-white/80 dark:text-black dark:hover:bg-white
    transition shadow-md
  "
          title="Clear Notifications"
        >
          <X size={14} />
        </button>

      )}

      <div className="flex flex-col gap-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="
        notification-card
        backdrop-blur-2xl
        bg-white/60 dark:bg-black/60
        shadow-2xl
        border border-white/40 dark:border-white/10
        ring-1 ring-white/20
        rounded-2xl p-4 w-[340px]
        transform transition-all animate-slide-in
      "
          >
            <div className="font-semibold text-sm text-gray-900 dark:text-white">
              {n.title}
            </div>

            <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
              {n.message}
            </div>
          </div>
        ))}
      </div>



    </div>
  );
}
