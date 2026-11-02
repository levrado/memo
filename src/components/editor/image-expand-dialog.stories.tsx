import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ImageExpandDialog } from "./image-expand-dialog";

// Inline SVGs keep stories deterministic — external image URLs fail to load
// in offline/restricted-egress environments and break visual regression.
function svgImage(width: number, height: number, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const meta: Meta<typeof ImageExpandDialog> = {
  title: "Editor/ImageExpandDialog",
  component: ImageExpandDialog,
  args: {
    open: true,
    onOpenChange: fn(),
  },
  parameters: {
    layout: "fullscreen",
  },
};

export { meta as default };

type Story = StoryObj<typeof ImageExpandDialog>;

/** Lightbox overlay with a standard landscape photo. */
export const Default: Story = {
  args: {
    src: svgImage(800, 600, "#4a6fa5", "#2c4566"),
  },
};

/** Image wider than the viewport — constrained by max-w-[90vw]. */
export const LargeImage: Story = {
  args: {
    src: svgImage(2400, 1600, "#4a7c59", "#2d4f3a"),
  },
};
