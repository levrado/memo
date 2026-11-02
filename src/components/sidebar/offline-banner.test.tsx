import "@testing-library/jest-dom/vitest";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { OfflineBanner } from "./offline-banner";

function setNavigatorOnLine(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    value,
    configurable: true,
  });
}

describe("OfflineBanner", () => {
  afterEach(() => {
    setNavigatorOnLine(true);
  });

  it("renders nothing while online", () => {
    render(<OfflineBanner />);
    expect(
      screen.queryByTestId("as-offline-banner"),
    ).not.toBeInTheDocument();
  });

  it("shows the banner on mount when navigator.onLine is false", () => {
    setNavigatorOnLine(false);
    render(<OfflineBanner />);
    expect(screen.getByTestId("as-offline-banner")).toBeInTheDocument();
  });

  it("appears on the offline event and dismisses on the online event", () => {
    render(<OfflineBanner />);
    expect(
      screen.queryByTestId("as-offline-banner"),
    ).not.toBeInTheDocument();

    // Browsers update navigator.onLine before firing the event
    setNavigatorOnLine(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByTestId("as-offline-banner")).toBeInTheDocument();

    setNavigatorOnLine(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(
      screen.queryByTestId("as-offline-banner"),
    ).not.toBeInTheDocument();
  });

  it("communicates that changes may not be saved", () => {
    setNavigatorOnLine(false);
    render(<OfflineBanner />);
    expect(screen.getByTestId("as-offline-banner")).toHaveTextContent(
      /changes may not be saved/i,
    );
  });

  it("is announced to screen readers as a polite status region", () => {
    setNavigatorOnLine(false);
    render(<OfflineBanner />);
    const banner = screen.getByTestId("as-offline-banner");
    expect(banner).toHaveAttribute("role", "status");
    expect(banner).toHaveAttribute("aria-live", "polite");
  });
});
