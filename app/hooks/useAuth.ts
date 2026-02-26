"use client";

import { useState, useEffect, useCallback } from "react";
const API = process.env.NEXT_PUBLIC_BACKEND_API_URL || "";

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

export default function useAuth() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) return null;

      const res = await fetch(`${API}/api/admin/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${refreshToken}` },
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (data?.accessToken) {
        setStoredAccessToken(data.accessToken);
        setAccessToken(data.accessToken);
        return data.accessToken;
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const storedAccess = getStoredAccessToken();
    if (storedAccess) setAccessToken(storedAccess);
    refreshAccessToken().finally(() => setLoading(false));
  }, [refreshAccessToken]);

  // ⏱ AUTO REFRESH EVERY 14 MIN
  useEffect(() => {
    if (!accessToken) return;

    const interval = setInterval(
      refreshAccessToken,
      14 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, [accessToken, refreshAccessToken]);

  return {
    accessToken,
    loading,
    isAuthenticated: !!accessToken,
  };
}
