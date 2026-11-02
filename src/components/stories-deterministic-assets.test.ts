import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Regression test for issue #32: the GalleryView story loaded cover images
 * from images.unsplash.com. In environments without unrestricted egress the
 * fetch fails, the story renders broken-image placeholders, and the visual
 * regression suite produces large pixel diffs against baselines captured
 * with the images loaded.
 *
 * Stories must be deterministic — any URL the browser would fetch as an
 * image (external image hosts, or URLs ending in an image extension) must
 * be inlined as a data: URI. Display-only URLs that are never fetched
 * (link href text, URL property values, non-image file entries) are fine.
 */

const SRC_DIR = join(__dirname, "..");
const PROJECT_ROOT = join(__dirname, "..", "..");

/** External hosts that serve placeholder/stock images or avatars. */
const EXTERNAL_IMAGE_HOSTS = [
  "picsum.photos",
  "unsplash.com",
  "pravatar.cc",
  "placehold.co",
  "via.placeholder.com",
  "dummyimage.com",
  "loremflickr.com",
  "placekitten.com",
];

/**
 * Any http(s) URL ending in an image extension is almost certainly fetched
 * by an <img> (or CSS) and must be inlined instead. Matches URLs inside
 * quotes, so data: URIs and w3.org namespace strings never match.
 */
const EXTERNAL_IMAGE_URL =
  /https?:\/\/[^"'`\s]+?\.(?:png|jpe?g|gif|webp|avif|bmp|tiff?)(?:[?#][^"'`\s]*)?/gi;

function collectStoryFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (entry.endsWith(".stories.tsx")) {
        files.push(full);
      }
    }
  }

  walk(dir);
  return files;
}

describe("Storybook stories use deterministic assets (#32)", () => {
  const storyFiles = collectStoryFiles(SRC_DIR);

  it("finds story files", () => {
    expect(storyFiles.length).toBeGreaterThan(0);
  });

  it("no story references external image-hosting domains", () => {
    const violations: string[] = [];

    for (const file of storyFiles) {
      const rel = relative(PROJECT_ROOT, file);
      const content = readFileSync(file, "utf-8");

      for (const host of EXTERNAL_IMAGE_HOSTS) {
        if (content.includes(host)) {
          violations.push(`${rel}: references ${host}`);
        }
      }
    }

    expect(
      violations,
      `Stories must not load images from external hosts — use inline data: URIs:\n${violations.join("\n")}`,
    ).toEqual([]);
  });

  it("no story embeds an external URL ending in an image extension", () => {
    const violations: string[] = [];

    for (const file of storyFiles) {
      const rel = relative(PROJECT_ROOT, file);
      const content = readFileSync(file, "utf-8");

      EXTERNAL_IMAGE_URL.lastIndex = 0;
      for (const match of content.matchAll(EXTERNAL_IMAGE_URL)) {
        violations.push(`${rel}: ${match[0]}`);
      }
    }

    expect(
      violations,
      `Stories must not fetch external images — use inline data: URIs:\n${violations.join("\n")}`,
    ).toEqual([]);
  });
});
