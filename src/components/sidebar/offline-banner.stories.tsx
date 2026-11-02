import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import { OfflineBanner } from "./offline-banner";

// OfflineBanner subscribes to navigator.onLine via window `offline`/`online`
// events. Stories render the real component inside a mock shell column — the
// Offline story stubs navigator.onLine and dispatches a synthetic `offline`
// event after mount (the same mechanism the component responds to in
// production).

const meta: Meta<typeof OfflineBanner> = {
  title: "Sidebar/OfflineBanner",
  component: OfflineBanner,
  parameters: {
    layout: "fullscreen",
  },
};

export { meta as default };

type Story = StoryObj<typeof OfflineBanner>;

/** Stubs `navigator.onLine` and dispatches a synthetic `offline` event once
 * mounted children have subscribed, then restores both on unmount. */
function OfflineScope({ children }: { children: ReactNode }) {
  useEffect(() => {
    const original = window.navigator.onLine;
    Object.defineProperty(window.navigator, "onLine", {
      value: false,
      configurable: true,
    });
    window.dispatchEvent(new Event("offline"));
    return () => {
      Object.defineProperty(window.navigator, "onLine", {
        value: original,
        configurable: true,
      });
      window.dispatchEvent(new Event("online"));
    };
  }, []);
  return children;
}

function MockShellColumn({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-[200px] flex-col overflow-hidden bg-background">
      {children}
      <main className="flex-1 overflow-y-auto p-6">
        <p className="text-sm text-muted-foreground">
          Main content area. The banner sits above it at the top of the app
          shell while the browser is offline.
        </p>
      </main>
    </div>
  );
}

/** Online (default) — nothing is rendered; the shell looks normal. */
export const Online: Story = {
  render: () => (
    <MockShellColumn>
      <OfflineBanner />
    </MockShellColumn>
  ),
};

/** Offline — the warning banner appears at the top of the shell. */
export const Offline: Story = {
  render: () => (
    <MockShellColumn>
      <OfflineScope>
        <OfflineBanner />
      </OfflineScope>
    </MockShellColumn>
  ),
};

/** Offline at 375px — the message truncates inside the h-8 strip instead of
 * wrapping onto the page background below it. */
export const OfflineNarrow: Story = {
  render: () => (
    <div className="w-[375px]">
      <MockShellColumn>
        <OfflineScope>
          <OfflineBanner />
        </OfflineScope>
      </MockShellColumn>
    </div>
  ),
};
