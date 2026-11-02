import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { GalleryView } from "./gallery-view";
import type {
  DatabaseProperty,
  DatabaseRow,
  DatabaseViewConfig,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

// Inline SVG gradients keep covers deterministic — external image URLs fail
// to load in offline/restricted-egress environments and break visual tests.
function svgCover(from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const PLACEHOLDER_COVERS = [
  svgCover("#4a7c59", "#2d4f3a"),
  svgCover("#4a6fa5", "#2c4566"),
  svgCover("#b0793f", "#6e4a24"),
  svgCover("#8a5a72", "#4f2f44"),
  svgCover("#3d7a7a", "#235252"),
];

const mockProperties: DatabaseProperty[] = [
  {
    id: "prop-title",
    database_id: "db-1",
    name: "Name",
    type: "text",
    config: {},
    position: 0,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
  {
    id: "prop-cover",
    database_id: "db-1",
    name: "Cover",
    type: "files",
    config: {},
    position: 1,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
  {
    id: "prop-status",
    database_id: "db-1",
    name: "Status",
    type: "select",
    config: {
      options: [
        { id: "opt-draft", name: "Draft", color: "gray" },
        { id: "opt-published", name: "Published", color: "green" },
      ],
    },
    position: 2,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
];

function makeRow(
  id: string,
  title: string,
  icon: string | null,
  coverUrl: string | null,
  filesCoverUrl?: string,
): DatabaseRow {
  const values: DatabaseRow["values"] = {};
  if (filesCoverUrl) {
    values["prop-cover"] = {
      id: `rv-${id}-cover`,
      row_id: id,
      property_id: "prop-cover",
      value: { files: [{ url: filesCoverUrl, name: "cover.jpg" }] },
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-01T00:00:00Z",
    };
  }
  return {
    page: {
      id,
      title,
      icon,
      cover_url: coverUrl,
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-15T00:00:00Z",
      created_by: "user-1",
    },
    values,
  };
}

const mockRowsWithPageCovers: DatabaseRow[] = [
  makeRow("row-1", "Mountain Landscape", "🏔️", PLACEHOLDER_COVERS[0]),
  makeRow("row-2", "Forest Trail", "🌲", PLACEHOLDER_COVERS[1]),
  makeRow("row-3", "Autumn Colors", null, PLACEHOLDER_COVERS[2]),
  makeRow(
    "row-4",
    "A card with a very long title that should be truncated to two lines maximum in the gallery view",
    "📝",
    PLACEHOLDER_COVERS[3],
  ),
  makeRow("row-5", "No Cover Page", null, null),
  makeRow("row-6", "River Valley", "🏞️", PLACEHOLDER_COVERS[4]),
  makeRow("row-7", "Another No Cover", null, null),
  makeRow("row-8", "Untitled", null, null),
];

const mockRowsWithFileCovers: DatabaseRow[] = [
  makeRow("row-1", "Mountain Landscape", "🏔️", null, PLACEHOLDER_COVERS[0]),
  makeRow("row-2", "Forest Trail", "🌲", null, PLACEHOLDER_COVERS[1]),
  makeRow("row-3", "Autumn Colors", null, null, PLACEHOLDER_COVERS[2]),
  makeRow("row-4", "No Cover Page", null, null),
  makeRow("row-5", "River Valley", "🏞️", null, PLACEHOLDER_COVERS[4]),
];

const defaultConfig: DatabaseViewConfig = {};

const configWithCoverProperty: DatabaseViewConfig = {
  cover_property: "prop-cover",
};

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof GalleryView> = {
  title: "Database/GalleryView",
  component: GalleryView,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="max-w-4xl bg-background p-6">
        <Story />
      </div>
    ),
  ],
  args: {
    workspaceSlug: "my-workspace",
    onAddRow: fn(),
    onNavigate: fn(),
  },
};

export { meta as default };

type Story = StoryObj<typeof GalleryView>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Default: Story = {
  args: {
    rows: mockRowsWithPageCovers,
    properties: mockProperties,
    viewConfig: defaultConfig,
  },
};

export const Empty: Story = {
  args: {
    rows: [],
    properties: mockProperties,
    viewConfig: defaultConfig,
  },
};

export const EmptyReadOnly: Story = {
  args: {
    rows: [],
    properties: mockProperties,
    viewConfig: defaultConfig,
    onAddRow: undefined,
  },
};

export const FilteredEmpty: Story = {
  args: {
    rows: [],
    properties: mockProperties,
    viewConfig: defaultConfig,
    hasActiveFilters: true,
    onClearFilters: fn(),
  },
};

export const Loading: Story = {
  args: {
    rows: [],
    properties: mockProperties,
    viewConfig: defaultConfig,
    loading: true,
  },
};

export const SmallCards: Story = {
  args: {
    rows: mockRowsWithPageCovers,
    properties: mockProperties,
    viewConfig: { card_size: "small" },
  },
};

export const MediumCards: Story = {
  args: {
    rows: mockRowsWithPageCovers,
    properties: mockProperties,
    viewConfig: { card_size: "medium" },
  },
};

export const LargeCards: Story = {
  args: {
    rows: mockRowsWithPageCovers,
    properties: mockProperties,
    viewConfig: { card_size: "large" },
  },
};

export const WithCoverProperty: Story = {
  args: {
    rows: mockRowsWithFileCovers,
    properties: mockProperties,
    viewConfig: configWithCoverProperty,
  },
};

export const AllNoCover: Story = {
  args: {
    rows: [
      makeRow("row-1", "Page One", null, null),
      makeRow("row-2", "Page Two", null, null),
      makeRow("row-3", "Page Three", null, null),
      makeRow("row-4", "Page Four", null, null),
    ],
    properties: mockProperties,
    viewConfig: defaultConfig,
  },
};

export const SingleCard: Story = {
  args: {
    rows: [mockRowsWithPageCovers[0]],
    properties: mockProperties,
    viewConfig: defaultConfig,
  },
};

export const ManyCards: Story = {
  args: {
    rows: [
      ...mockRowsWithPageCovers,
      ...Array.from({ length: 12 }, (_, i) =>
        makeRow(
          `row-extra-${i}`,
          `Gallery Item ${i + 1}`,
          null,
          i % 3 === 0 ? null : PLACEHOLDER_COVERS[i % PLACEHOLDER_COVERS.length],
        ),
      ),
    ],
    properties: mockProperties,
    viewConfig: defaultConfig,
  },
};

export const ReadOnlyNoActions: Story = {
  args: {
    rows: mockRowsWithPageCovers,
    properties: mockProperties,
    viewConfig: defaultConfig,
    onAddRow: undefined,
  },
};

export const KeyboardNavigation: Story = {
  args: {
    rows: mockRowsWithPageCovers,
    properties: mockProperties,
    viewConfig: defaultConfig,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Tab to a card to focus it. Use ←/→ to move between adjacent cards, ↑/↓ to jump rows in the grid. Enter opens the card. Escape clears focus. Focused cards show a ring-2 ring-ring focus ring.",
      },
    },
  },
};
