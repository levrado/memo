import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TrashItemRow, type TrashedPage } from "./trash-item-row";

const page: TrashedPage = {
  id: "p1",
  title: "Old Meeting Notes",
  icon: "📝",
  deleted_at: "2026-10-20T10:00:00Z",
};

function renderRow(overrides: Partial<Parameters<typeof TrashItemRow>[0]> = {}) {
  const props = {
    page,
    daysLeft: 12,
    operating: false,
    onRestore: vi.fn(),
    onPermanentDelete: vi.fn(),
    ...overrides,
  };
  render(<TrashItemRow {...props} />);
  return props;
}

describe("TrashItemRow", () => {
  it("shows the page title and emoji icon", () => {
    renderRow();
    expect(screen.getByText("Old Meeting Notes")).toBeInTheDocument();
    expect(screen.getByText("📝")).toBeInTheDocument();
  });

  it("falls back to Untitled and the document icon", () => {
    renderRow({ page: { ...page, title: "", icon: null } });
    expect(screen.getByText("Untitled")).toBeInTheDocument();
    expect(screen.queryByText("📝")).not.toBeInTheDocument();
  });

  it("shows days remaining in muted styling above the expiry threshold", () => {
    renderRow({ daysLeft: 12 });
    const countdown = screen.getByTestId("trash-purge-countdown");
    expect(countdown).toHaveTextContent("12d left");
    expect(countdown).toHaveClass("text-muted-foreground");
    expect(countdown).toHaveAttribute(
      "title",
      "Permanently deleted in 12 days",
    );
  });

  it("uses singular 'day' in the tooltip for 1 day remaining", () => {
    renderRow({ daysLeft: 1 });
    const countdown = screen.getByTestId("trash-purge-countdown");
    expect(countdown).toHaveTextContent("1d left");
    expect(countdown).toHaveAttribute("title", "Permanently deleted in 1 day");
  });

  it("marks items at the expiry threshold as destructive", () => {
    renderRow({ daysLeft: 3 });
    const countdown = screen.getByTestId("trash-purge-countdown");
    expect(countdown).toHaveClass("text-destructive");
  });

  it("shows 'Deletes today' when no days remain", () => {
    renderRow({ daysLeft: 0 });
    const countdown = screen.getByTestId("trash-purge-countdown");
    expect(countdown).toHaveTextContent("Deletes today");
    expect(countdown).toHaveClass("text-destructive");
    expect(countdown).toHaveAttribute("title", "Permanently deleted today");
  });

  it("fires onRestore with the page when restore is clicked", async () => {
    const { onRestore } = renderRow();
    await userEvent.click(
      screen.getByRole("button", { name: /restore page/i }),
    );
    expect(onRestore).toHaveBeenCalledWith(page);
  });

  it("fires onPermanentDelete with the page when delete is clicked", async () => {
    const { onPermanentDelete } = renderRow();
    await userEvent.click(
      screen.getByRole("button", { name: /permanently delete page/i }),
    );
    expect(onPermanentDelete).toHaveBeenCalledWith(page);
  });

  it("disables action buttons while an operation is in flight", () => {
    renderRow({ operating: true });
    expect(
      screen.getByRole("button", { name: /restore page/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /permanently delete page/i }),
    ).toBeDisabled();
  });
});
