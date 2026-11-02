import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";

// Mock next/link as a simple anchor
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import AuthLayout from "./layout";

describe("AuthLayout", () => {
  it("renders a back-to-home link pointing to /", () => {
    render(<AuthLayout>{null}</AuthLayout>);

    const link = screen.getByRole("link", { name: /back to home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders children", () => {
    render(
      <AuthLayout>
        <div data-testid="child-content">form</div>
      </AuthLayout>,
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });
});
