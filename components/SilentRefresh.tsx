"use client";

import { useEffect } from "react";
import { startSilentRefreshInterval, stopSilentRefreshInterval } from "@/lib/auth";

/**
 * Restores tokens from localStorage (Remember me) then starts silent access-token
 * refresh every 10 min. Cleans up the interval on unmount.
 */
export default function SilentRefresh() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      startSilentRefreshInterval(); // restores from localStorage and starts interval if refresh_token exists
    }
    return () => stopSilentRefreshInterval();
  }, []);

  return null;
}
