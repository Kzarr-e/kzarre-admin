'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/auth';

import {
  LayoutDashboard,
  Users,
  Layers,
  BarChart3,
  ShoppingCart,
  Truck,
  TrendingUp,
  DollarSign,
  Shield,
  Settings,
  MoreVertical,
  Menu,
  Handshake,
  X,
  Newspaper,
} from 'lucide-react';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

const isActive = (href: string) =>
  pathname === href || pathname.startsWith(href + "/");

  const [profile, setProfile] = useState({
    name: "User",
    email: "user@system.com",
    role: "Admin",
  });

const initials =
  profile?.name
    ?.split(" ")
    ?.map(n => n[0])
    ?.join("")
    ?.slice(0, 2)
    ?.toUpperCase() || "U";


useEffect(() => {
  console.log("Sidebar: Fetching user profile...");
  authApi.authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/profile/me`)
    .then(res => {
      console.log("Sidebar: Profile response status:", res.status);
      if (!res.ok) {
        console.error("Sidebar: Failed to fetch profile");
        return null;
      }
      return res.json();
    })
    .then(data => {
      if (data) {
        console.log("Sidebar: Profile data:", data);
        setProfile({
          name: data.name,
          email: data.email,
          role: data.role,
        });
      }
    })
    .catch(error => {
      console.error("Sidebar: Error fetching profile:", error);
    });
    .catch(() => {});
}, []);


  const menuItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
      permission: "view_dashboard",
    },
    {
      label: "User Management",
      icon: Users,
      href: "/user-management",
      permission: "manage_users",
    },
    {
      label: "CMS",
      icon: Layers,
      href: "/cms",
      permission: "manage_cms",
    },
    {
      label: "Analytics",
      icon: BarChart3,
      href: "/analytics",
      permission: "view_analytics",
    },
    {
      label: "E-Commerce",
      icon: ShoppingCart,
      href: "/ecom",
      permission: "manage_orders",
    },
    {
      label: "Stories",
      icon: Newspaper,
      href: "/stories",
      permission: "manage_stories",
    },
    {
      label: "S&L",
      icon: Truck,
      href: "/s&l",
      permission: "manage_shipping",
    },
    {
      label: "360",
      icon: Handshake,
      href: "/360",
      permission: "view_crm",
    },
    {
      label: "Marketing",
      icon: TrendingUp,
      href: "/marketing",
      permission: "manage_marketing",
    },
    // {
    //   label: "Payments & Finance",
    //   icon: DollarSign,
    //   href: "/payments",
    //   permission: "view_finance",
    // },
    {
      label: "Security & Compliance",
      icon: Shield,
      href: "/security",
      permission: "manage_security",
    },
    {
      label: "Website Settings",
      icon: Settings,
      href: "/settings",
      permission: "manage_settings",
    },
  ];
  // Load role from localStorage
  const [role, setRole] = useState("");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setRole(localStorage.getItem("role") || "");
    }
  }, []);

  // Define role-wise menu visibility
  const [permissions, setPermissions] = useState<string[]>([]);


  useEffect(() => {
    const perms = localStorage.getItem("permissions");
    setPermissions(perms ? JSON.parse(perms) : []);
  }, []);

const hasPermission = (permission: string): boolean => {
  if (profile.role === "SuperAdmin") return true;
  return permissions.includes(permission);
};



  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const perms = localStorage.getItem("permissions");
      setPermissions(perms ? JSON.parse(perms) : []);
    }
  }, []);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 
                   p-2 bg-[var(--background-card)] 
                   border border-[var(--sidebar-border)] 
                   rounded-lg transition"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${isOpen ? 'w-64' : 'w-22'}
          bg-[var(--sidebar-bg)]
          border-r border-[var(--sidebar-border)]
          text-[var(--text-primary)]
          h-screen flex flex-col transition-all duration-300
          overflow-y-auto fixed lg:relative z-40 lg:z-auto
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-[var(--sidebar-border)]">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 hover:opacity-80 transition"
            onClick={() => setIsMobileOpen(false)}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center">
              <span className="text-[var(--logo-color)] !text-[var(--logo-color)] font-bold text-sm">KZ</span>
            </div>

            {isOpen && (
              <span className="font-semibold text-lg tracking-wide">
                KZARRÈ
              </span>
            )}
          </Link>
        </div>
        {/* Menu Items */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems
              .filter(item => hasPermission(item.permission))
              .map(item => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg 
              transition-all
              ${active
                          ? "bg-[var(--accent-green)] text-black font-semibold"
                          : "hover:bg-[var(--background-card)]"
                        }`}
                    >
                      <Icon size={22} />
                      {isOpen && (
                        <span className="text-sm font-small">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
          </ul>

        </nav>

        {/* User Section */}
        <div className="p-0 border-t border-[var(--sidebar-border)] ">
          <div
            className="bg-[var(--background-card)] 
                       rounded-lg p-3 cursor-pointer
                       hover:opacity-90 transition"
            onClick={() => router.push("/profile")}
          >
            <div
              onClick={() => router.push("/profile")}
              className="flex items-center gap-3 bg-[var(--background-card)] rounded-lg p-3 cursor-pointer hover:bg-[var(--accent-green)]"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600
    flex items-center justify-center text-white font-bold">
                {initials}
              </div>

              {isOpen && (
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {profile.name}
                  </p>
                  <p className="text-xs truncate opacity-70">
                    {profile.email}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Collapse Button */}
        <div className="p-4 border-t border-[var(--sidebar-border)] hidden lg:block">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-center p-2 
                       hover:bg-[var(--background-card)] rounded-lg transition"
          >
            <span className="font-bold text-[var(--text-primary)]">
              {isOpen ? '←' : '→'}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
