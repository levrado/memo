import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ImageCropDialog } from "./image-crop-dialog";

// Inline SVGs keep stories deterministic — external image URLs fail to load
// in offline/restricted-egress environments and break visual regression.
// Dimensions are set on the <svg> so aspect-ratio behavior is preserved.
function svgImage(width: number, height: number, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const meta: Meta<typeof ImageCropDialog> = {
  title: "Editor/ImageCropDialog",
  component: ImageCropDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    onCropComplete: fn(),
  },
  parameters: {
    layout: "centered",
  },
};

export { meta as default };

type Story = StoryObj<typeof ImageCropDialog>;

/** Default open state with a standard landscape photo. */
export const Default: Story = {
  args: {
    src: svgImage(800, 600, "#4a6fa5", "#2c4566"),
  },
};

/** Landscape image — wider aspect ratio, scales to fit 600×400 canvas area. */
export const LandscapeImage: Story = {
  args: {
    src: svgImage(1200, 400, "#4a7c59", "#2d4f3a"),
  },
};

/** Portrait image — taller aspect ratio, scales to fit 600×400 canvas area. */
export const PortraitImage: Story = {
  args: {
    src: svgImage(400, 800, "#8a5a72", "#4f2f44"),
  },
};

/** Small image below the canvas maximum — renders at native size without scaling. */
export const SmallImage: Story = {
  args: {
    src: svgImage(200, 150, "#b0793f", "#6e4a24"),
  },
};
