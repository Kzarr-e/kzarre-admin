"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { toast } from "react-hot-toast";
import { socket } from "@/app/lib/socket";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  isSuperAdmin?: boolean;
}

export interface AuthState {
  [x: string]: any;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (token: string, user: User) => void;
  logout: () => void;

  checkAuth: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
}

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5500";

// Silent refresh every 10 min (access token expires in 15 min)
const SILENT_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
let refreshIntervalId: ReturnType<typeof setInterval> | null = null;

// Use sessionStorage first, then localStorage (so "Remember me" works with refresh)
function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("refresh_token") || localStorage.getItem("refresh_token");
}
function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
}
function setStoredAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("access_token", token);
  if (localStorage.getItem("refresh_token")) localStorage.setItem("access_token", token);
}

/** Call on app load so "Remember me" tokens in localStorage are available for refresh. */
export function restoreTokensFromLocalStorage(): void {
  if (typeof window === "undefined") return;
  const localRefresh = localStorage.getItem("refresh_token");
  const localAccess = localStorage.getItem("access_token");
  if (localRefresh && !sessionStorage.getItem("refresh_token")) {
    sessionStorage.setItem("refresh_token", localRefresh);
    if (localAccess) sessionStorage.setItem("access_token", localAccess);
  }
}

async function refreshAccessTokenSilent(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    console.log("[Auth] Silent refresh skipped – no refresh token");
    return false;
  }

  console.log("[Auth] Silent refresh: calling /api/admin/refresh");

  try {
    const res = await fetch(`${API_BASE}/api/admin/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);

      if (errorData?.code === "SESSION_REPLACED") {
        console.warn("Session replaced by another login");
        toast.error("Logged in from another device. Session ended.");
        setTimeout(() => {
          window.location.href = "/";
        }, 800);
      }

      useAuthStore.getState().logout();
      stopSilentRefreshInterval();
      return false;
    }

    const data = await res.json();
    const newAccessToken = data?.accessToken;

    if (!newAccessToken) {
      useAuthStore.getState().logout();
      return false;
    }

    setStoredAccessToken(newAccessToken);
    useAuthStore.setState({ token: newAccessToken });

    console.log("[Auth] Silent refresh succeeded – access token updated");

    return true;
  } catch (err) {
    console.error("[Auth] Silent refresh error", err);
    useAuthStore.getState().logout();
    return false;
  }
}

export function startSilentRefreshInterval(): void {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
  if (typeof window === "undefined") return;
  restoreTokensFromLocalStorage();
  if (!getStoredRefreshToken()) {
    console.log("[Auth] Not starting silent refresh – no refresh token");
    return;
  }
  refreshIntervalId = setInterval(refreshAccessTokenSilent, SILENT_REFRESH_INTERVAL_MS);
  console.log(
    "[Auth] Silent refresh interval started – every",
    SILENT_REFRESH_INTERVAL_MS / 60000,
    "minutes"
  );
}

export function stopSilentRefreshInterval(): void {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
}

// 🔥 ROLE NORMALIZER
const normalizeRole = (role?: string) => {
  if (!role) return "Admin";
  if (role.toLowerCase() === "superadmin") return "SuperAdmin";
  return role;
};

// Cache for authentication verification
let authVerificationCache = {
  result: null as boolean | null,
  timestamp: 0,
  ttl: 30000,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // =====================
      // INITIAL STATE
      // =====================
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      // =====================
      // LOGIN
      // =====================
      login: (token: string, user: User) => {
        console.log("Auth Store: Login called, token present =", !!token);

        const normalizedUser: User = {
          ...user,
          role: normalizeRole(user.role),
          permissions: user.permissions || [],
          isSuperAdmin: user.isSuperAdmin ?? false,
        };

        set({
          token,
          user: normalizedUser,
          isAuthenticated: true,
          isLoading: false,
        });

        if (socket && normalizedUser._id) {
          if (!socket.connected) {
            socket.connect();
          }

          socket.emit("register_admin", normalizedUser._id);
        }

        startSilentRefreshInterval();
        console.log("Auth Store: Login successful, state updated");
      },

      // =====================
      // LOGOUT
      // =====================
      logout: () => {
        const token = getStoredAccessToken();

        // Stop refresh immediately
        stopSilentRefreshInterval();


        if (socket) {
          socket.disconnect();
        }

        // Clear state immediately
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });

        authVerificationCache = {
          result: null,
          timestamp: 0,
          ttl: 30000,
        };

        if (typeof window !== "undefined") {
          sessionStorage.removeItem("access_token");
          sessionStorage.removeItem("refresh_token");
          sessionStorage.removeItem("auth-storage");
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }

        // 🔥 Fire-and-forget backend logout
        if (token) {
          fetch(`${API_BASE}/api/admin/logout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => { });
        }

        console.log("Auth Store: Logged out");
      },

      // =====================
      // CHECK AUTH (🔥 CORE FIX)
      // =====================
      checkAuth: async () => {
        const now = Date.now();
        const token = getStoredAccessToken();

        if (!token) {
          set({ isAuthenticated: false, user: null });
          return false;
        }

        if (
          authVerificationCache.result !== null &&
          now - authVerificationCache.timestamp < authVerificationCache.ttl
        ) {
          return authVerificationCache.result;
        }

        try {
          set({ isLoading: true });

          const response = await fetchWithAuth(
            `${API_BASE}/api/auth/verify`,
            {
              headers: {
                "Cache-Control": "no-cache",
              },
            }
          );

          const isAuthenticated = response.ok;

          authVerificationCache = {
            result: isAuthenticated,
            timestamp: now,
            ttl: isAuthenticated ? 30000 : 5000,
          };

          if (!isAuthenticated) {
            set({ isAuthenticated: false, user: null, token: null });
            return false;
          }

          const data = await response.json();

          const normalizedUser: User = {
            _id: data.user._id,
            name: data.user.name,
            email: data.user.email,
            role: normalizeRole(data.user.role),
            permissions: data.user.permissions || [],
            isSuperAdmin: data.user.isSuperAdmin ?? false,
          };

          set({
            user: normalizedUser,
            isAuthenticated: true,
            isLoading: false,
          });

          return true;
        } catch (error) {
          set({ isAuthenticated: false, user: null, token: null });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      // =====================
      // PERMISSIONS
      // =====================
      hasPermission: (permission: string) => {
        const { user } = get();

        // 🔥 SuperAdmin has ALL permissions
        if (user?.role === "SuperAdmin" || user?.isSuperAdmin) {
          return true;
        }

        return user?.permissions?.includes(permission) || false;
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") return sessionStorage;

        // Use sessionStorage if token was saved there
        const hasSessionToken = getStoredAccessToken();

        return hasSessionToken ? sessionStorage : sessionStorage;
      }),

      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// =====================
// AUTH API HELPERS
// =====================
export const authApi = {
  authenticatedFetch: async (
    url: string,
    options: RequestInit = {}
  ) => {
    const getAccessToken = () =>
      getStoredAccessToken();

    const refreshToken = () =>
      getStoredRefreshToken();

    let accessToken = getAccessToken();

    // 🔹 1️⃣ First attempt with current access token
    let response = await fetch(url, {
      ...options,
      headers: {
        Authorization: accessToken
          ? `Bearer ${accessToken}`
          : "",
        "Cache-Control": "no-cache",
        ...options.headers,
      },
    });

    // 🔁 2️⃣ If token expired → try refresh ONCE
    if (response.status === 401 && refreshToken()) {
      console.warn("Access token expired → refreshing...");

      const refreshRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/admin/refresh`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${refreshToken()}`,
          },
        }
      );

      if (!refreshRes.ok) {
        const errorData = await refreshRes.json().catch(() => null);

        if (
          errorData?.code === "SESSION_REPLACED" ||
          errorData?.code === "REFRESH_EXPIRED"
        ) {
          toast.error("Session expired. Please login again.");

        }

        useAuthStore.getState().logout();
        setTimeout(() => {
          window.location.href = "/";
        }, 800);
        throw new Error("Session expired");
      }

      const refreshData = await refreshRes.json();
      const newAccessToken = refreshData.accessToken;

      if (!newAccessToken) {
        useAuthStore.getState().logout();
        throw new Error("Invalid refresh response");
      }

      // 🔐 Save new access token
      setStoredAccessToken(newAccessToken);
      useAuthStore.setState({ token: newAccessToken });

      console.log("Access token refreshed");

      // 🔁 3️⃣ Retry original request with new token
      response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${newAccessToken}`,
          "Cache-Control": "no-cache",
          ...options.headers,
        },
      });
    }

    // ❌ Still unauthorized after retry → logout
    if (response.status === 401) {
      useAuthStore.getState().logout();
      throw new Error("Authentication expired");
    }

    return response;
  },
};

