"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/lib/auth";
import { PERMISSION_ROUTES } from "./permissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  permissions?: string[];
}

export default function ProtectedRoute({
  children,
  permissions = [],
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, hasPermission, checkAuth, user } =
    useAuthStore();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [redirectCount, setRedirectCount] = useState(0);

  // 🔥 Prevent multiple simultaneous checks
  const checkingRef = useRef(false);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;

      console.log("ProtectedRoute: Starting check", {
        isLoading,
        isAuthenticated,
        hasCheckedAuth,
        role: user?.role,
      });

      // ⏳ Still loading auth store
      if (isLoading) {
        console.log("ProtectedRoute: Auth store still loading...");
        checkingRef.current = false;
        return;
      }

      // ============================
      // STEP 1: HARD VERIFY ONCE
      // ============================
      if (!hasCheckedAuth) {
        console.log("ProtectedRoute: Performing initial hard auth check...");
        const isAuth = await checkAuth();

        setHasCheckedAuth(true);

        if (!isAuth) {
          console.log("ProtectedRoute: Initial auth failed, redirecting to login");

          if (redirectCount < 3) {
            setRedirectCount((prev) => prev + 1);
            router.replace("/");
          } else {
            console.error(
              "ProtectedRoute: Too many redirects, stopping to prevent infinite loop"
            );
          }

          setAuthorized(false);
          checkingRef.current = false;
          return;
        }

        console.log("ProtectedRoute: Initial auth passed");
      }

      // ============================
      // STEP 2: PERMISSION CHECK
      // ============================
      if (permissions.length > 0) {
        console.log("🔐 Required permissions:", permissions);
        console.log("👤 User role:", user?.role);
        console.log("📦 User permissions:", user?.permissions);

        const userPermissions = user?.permissions || [];
        if (userPermissions.includes("*")) {
          setAuthorized(true);
          checkingRef.current = false;
          return;
        }

        const allowed = permissions.some((permission) =>
          userPermissions.includes(permission)
        );

        if (!allowed) {
          console.log("❌ Permission denied. Finding alternative route...");

          const fallbackRoute = userPermissions
            .map((perm: string) => PERMISSION_ROUTES[perm])
            .find(Boolean);

          if (fallbackRoute) {
            router.replace(fallbackRoute);
          } else {
            router.replace("/unauthorized");
          }

          setAuthorized(false);
          checkingRef.current = false;
          return;
        }
      }

      // ============================
      // STEP 3: AUTHORIZE
      // ============================
      console.log("ProtectedRoute: All checks passed, allowing access");
      setAuthorized(true);
      setRedirectCount(0);

      checkingRef.current = false;

      // ============================
      // STEP 4: BACKGROUND VERIFY (SAFE)
      // ============================
      setTimeout(async () => {
        console.log("ProtectedRoute: Background auth verification started");

        const stillAuth = await checkAuth();

        if (!stillAuth) {
          console.log(
            "ProtectedRoute: Background auth failed, redirecting to login"
          );
          router.replace("/");
        } else {
          console.log("ProtectedRoute: Background auth still valid");
        }
      }, 15000); // 15 seconds background verify
    }, 300); // small debounce

    return () => clearTimeout(timeoutId);
  }, [
    isLoading,
    isAuthenticated,
    hasCheckedAuth,
    user, // re-run only when user really changes
  ]);

  // ⏳ LOADING STATE
  if (authorized === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-10 w-10 border-t-4 border-green-500 rounded-full" />
      </div>
    );
  }

  // ❌ NOT AUTHORIZED (just in case)
  if (authorized === false) {
    return null;
  }

  // ✅ AUTHORIZED
  return <>{children}</>;
}
