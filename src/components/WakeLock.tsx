"use client";

import { useEffect, useRef } from "react";

export function WakeLock() {
  // We use a ref to hold onto the lock so we can release it if needed
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      // Feature detection: Check if the browser actually supports it
      if ("wakeLock" in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        } catch (err: any) {
          // It's safe to silently fail here. Some devices restrict wake locks 
          // if the battery is critically low.
          console.warn(`Wake Lock denied: ${err.message}`);
        }
      }
    };

    // If the user minimizes the browser to check a text, iOS/Android will kill the lock.
    // This listener catches them coming back and re-applies it.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    // Initial request
    requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup when the component unmounts
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // This component is entirely invisible!
  return null; 
}