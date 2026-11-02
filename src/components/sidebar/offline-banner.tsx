"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribeToConnectivity(onChange: () => void) {
  window.addEventListener("offline", onChange);
  window.addEventListener("online", onChange);
  return () => {
    window.removeEventListener("offline", onChange);
    window.removeEventListener("online", onChange);
  };
}

function isOfflineSnapshot() {
  return !navigator.onLine;
}

function isOfflineServerSnapshot() {
  return false;
}

/**
 * Non-blocking connectivity indicator shown at the top of the app shell while
 * the browser reports offline (`offline` event / `navigator.onLine === false`).
 * Dismisses automatically on the `online` event. This is an indicator only —
 * it does not queue saves or retry them.
 */
export function OfflineBanner() {
  const isOffline = useSyncExternalStore(
    subscribeToConnectivity,
    isOfflineSnapshot,
    isOfflineServerSnapshot,
  );

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-8 shrink-0 items-center justify-center gap-2 border-b border-overlay-border bg-muted px-4"
      data-testid="as-offline-banner"
    >
      <WifiOff className="h-3.5 w-3.5 text-code-type" aria-hidden="true" />
      <span className="text-xs text-muted-foreground">
        You are offline — changes may not be saved until you reconnect.
      </span>
    </div>
  );
}
