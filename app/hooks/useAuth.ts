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
      if (!refreshToken) {
        console.log("[useAuth] No refresh token – skipping refresh");
        return null;
      }

      console.log("[useAuth] Refreshing access token via /api/admin/refresh");

      const res = await fetch(`${API}/api/admin/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${refreshToken}` },
      });

      if (!res.ok) {
        console.warn(
          "[useAuth] /api/admin/refresh failed with status",
          res.status
        );
        return null;
      }

      const data = await res.json();
      if (data?.accessToken) {
        setStoredAccessToken(data.accessToken);
        setAccessToken(data.accessToken);
        console.log("[useAuth] Access token refreshed successfully");
        return data.accessToken;
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const storedAccess = getStoredAccessToken();
    if (storedAccess) {
      console.log("[useAuth] Loaded existing access token from storage");
      setAccessToken(storedAccess);
    } else {
      console.log("[useAuth] No existing access token found in storage");
    }
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
