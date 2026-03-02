// Match auth.ts: sessionStorage first, then localStorage (Remember me)
function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
}
function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("refresh_token") || localStorage.getItem("refresh_token");
}
function setStoredAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("access_token", token);
  if (localStorage.getItem("refresh_token")) localStorage.setItem("access_token", token);
}

export const fetchWithAuth = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  let accessToken = getStoredAccessToken();
  let refreshToken = getStoredRefreshToken();

  const makeRequest = (token: string | null) =>
    fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: token ? `Bearer ${token}` : "",
      },
    });

  let response = await makeRequest(accessToken);

  // 🔥 If access token expired → refresh then retry
  if (response.status === 401 && refreshToken) {
    console.warn(
      "[fetchWithAuth] 401 received – attempting refresh with /api/admin/refresh"
    );
    const refreshRes = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/admin/refresh`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    );

    if (!refreshRes.ok) {
      console.error(
        "[fetchWithAuth] Refresh failed with status",
        refreshRes.status,
        "– clearing tokens and redirecting to /admin-login"
      );
      sessionStorage.clear();
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/admin-login";
      throw new Error("Session expired");
    }

    const data = await refreshRes.json();
    const newAccess = data?.accessToken;
    if (newAccess) {
      setStoredAccessToken(newAccess);
      console.log("[fetchWithAuth] Access token refreshed via /api/admin/refresh");
    } else {
      console.warn(
        "[fetchWithAuth] Refresh response had no accessToken – reusing old access token"
      );
    }

    response = await makeRequest(newAccess || accessToken);
  }

  return response;
};