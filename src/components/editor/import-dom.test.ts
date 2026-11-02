import { describe, it, expect } from "vitest";
import { createHeadlessEditor } from "@lexical/headless";
import {
  $generateNodesFromDOM,
  $generateHtmlFromNodes,
} from "@lexical/html";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $insertNodes,
  $isElementNode,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { HeadingNode } from "@lexical/rich-text";
import {
  CalloutNode,
  $createCalloutNode,
  $isCalloutNode,
} from "./callout-node";
import {
  CollapsibleContainerNode,
  CollapsibleTitleNode,
  CollapsibleContentNode,
  $createCollapsibleContainerNode,
  $createCollapsibleContentNode,
  $createCollapsibleTitleNode,
  $isCollapsibleContainerNode,
  $isCollapsibleContentNode,
  $isCollapsibleTitleNode,
} from "./collapsible-node";
import {
  ImageNode,
  $createImageNode,
  $isImageNode,
} from "./image-node";
import {
  TableOfContentsNode,
  $createTableOfContentsNode,
  $isTableOfContentsNode,
} from "./table-of-contents-node";
import {
  PageLinkNode,
  $createPageLinkNode,
  $isPageLinkNode,
} from "./page-link-node";
import {
  DatabaseNode,
  $createDatabaseNode,
  $isDatabaseNode,
} from "./database-node";

const ALL_CUSTOM_NODES = [
  CalloutNode,
  CollapsibleContainerNode,
  CollapsibleTitleNode,
  CollapsibleContentNode,
  ImageNode,
  TableOfContentsNode,
  PageLinkNode,
  DatabaseNode,
  HeadingNode,
];

function createEditor(): LexicalEditor {
  return createHeadlessEditor({ nodes: ALL_CUSTOM_NODES });
}

/**
 * Parse HTML and run the same DOM → Lexical conversion the clipboard paste
 * path uses ($insertDataTransferForRichText → $generateNodesFromDOM), then
 * invoke `assert` inside the update so node methods have an active context.
 */
function withImportedNodes(
  html: string,
  assert: (nodes: LexicalNode[]) => void
): void {
  const editor = createEditor();
  const dom = new DOMParser().parseFromString(html, "text/html");
  editor.update(
    () => {
      const nodes = $generateNodesFromDOM(editor, dom);
      assert(nodes);
    },
    { discrete: true }
  );
}

/**
 * Build editor state, serialize it to HTML via exportDOM, then run the
 * import assertions against the re-imported nodes — the paste round-trip.
 */
function roundTrip(
  build: () => void,
  assert: (nodes: LexicalNode[], html: string) => void
): void {
  const editor = createEditor();
  editor.update(build, { discrete: true });
  const html = editor.read(() => $generateHtmlFromNodes(editor, null));
  withImportedNodes(html, (nodes) => assert(nodes, html));
}

/**
 * Depth-first search across nodes and their element children. Inline nodes
 * (ImageNode, PageLinkNode) are wrapped in paragraphs on import, so a flat
 * top-level search would miss them.
 */
function findNode<T extends LexicalNode>(
  nodes: LexicalNode[],
  guard: (node: LexicalNode | null | undefined) => node is T
): T | undefined {
  for (const node of nodes) {
    if (guard(node)) return node;
    if ($isElementNode(node)) {
      const found = findNode(node.getChildren(), guard);
      if (found) return found;
    }
  }
  return undefined;
}

describe("CalloutNode importDOM", () => {
  it("reconstructs a callout with variant and emoji from exported HTML", () => {
    withImportedNodes(
      '<div class="callout" data-variant="warning" data-emoji="⚠️">Careful!</div>',
      (nodes) => {
        const callout = findNode(nodes, $isCalloutNode);
        expect(callout).toBeDefined();
        expect(callout!.getVariant()).toBe("warning");
        expect(callout!.getEmoji()).toBe("⚠️");
        expect(callout!.getTextContent()).toBe("Careful!");
      }
    );
  });

  it("defaults to info variant and default emoji for missing/invalid attributes", () => {
    withImportedNodes(
      '<div class="callout" data-variant="bogus">Hello</div>',
      (nodes) => {
        const callout = findNode(nodes, $isCalloutNode);
        expect(callout).toBeDefined();
        expect(callout!.getVariant()).toBe("info");
        expect(callout!.getEmoji()).toBe("💡");
      }
    );
  });

  it("does not convert a plain div to a callout", () => {
    withImportedNodes("<div>Just a div</div>", (nodes) => {
      expect(findNode(nodes, $isCalloutNode)).toBeUndefined();
    });
  });

  it("round-trips through exportDOM HTML preserving variant, emoji, and content", () => {
    roundTrip(
      () => {
        const callout = $createCalloutNode("🚀", "success");
        callout.append($createTextNode("Ship it"));
        $getRoot().append(callout);
      },
      (nodes) => {
        const callout = findNode(nodes, $isCalloutNode);
        expect(callout).toBeDefined();
        expect(callout!.getVariant()).toBe("success");
        expect(callout!.getEmoji()).toBe("🚀");
        expect(callout!.getTextContent()).toBe("Ship it");
      }
    );
  });
});

describe("Collapsible nodes importDOM", () => {
  it("reconstructs container, title, and content from exported HTML", () => {
    withImportedNodes(
      '<details open><summary>My title</summary>' +
        '<div data-lexical-collapsible-content="true"><p>Hidden content</p></div>' +
        "</details>",
      (nodes) => {
        const container = findNode(nodes, $isCollapsibleContainerNode);
        expect(container).toBeDefined();
        expect(container!.getOpen()).toBe(true);

        const children = container!.getChildren();
        const title = children.find($isCollapsibleTitleNode);
        const content = children.find($isCollapsibleContentNode);
        expect(title).toBeDefined();
        expect(content).toBeDefined();
        expect(title!.getTextContent()).toBe("My title");
        expect(content!.getTextContent()).toBe("Hidden content");
      }
    );
  });

  it("preserves collapsed state when the open attribute is absent", () => {
    withImportedNodes(
      "<details><summary>T</summary>" +
        '<div data-lexical-collapsible-content="true"><p>C</p></div>' +
        "</details>",
      (nodes) => {
        const container = findNode(nodes, $isCollapsibleContainerNode);
        expect(container).toBeDefined();
        expect(container!.getOpen()).toBe(false);
      }
    );
  });

  it("does not convert an unmarked div to collapsible content", () => {
    withImportedNodes("<div><p>Not collapsible content</p></div>", (nodes) => {
      expect(findNode(nodes, $isCollapsibleContentNode)).toBeUndefined();
    });
  });

  it("round-trips through exportDOM HTML preserving structure and open state", () => {
    roundTrip(
      () => {
        const title = $createCollapsibleTitleNode();
        title.append($createTextNode("Round trip title"));
        const contentParagraph = $createParagraphNode();
        contentParagraph.append($createTextNode("Round trip body"));
        const content = $createCollapsibleContentNode();
        content.append(contentParagraph);
        const container = $createCollapsibleContainerNode(false);
        container.append(title, content);
        $getRoot().append(container);
      },
      (nodes, html) => {
        const container = findNode(nodes, $isCollapsibleContainerNode);
        expect(container).toBeDefined();
        expect(container!.getOpen()).toBe(false);

        const children = container!.getChildren();
        expect(
          children.find($isCollapsibleTitleNode)!.getTextContent()
        ).toBe("Round trip title");
        expect(
          children.find($isCollapsibleContentNode)!.getTextContent()
        ).toBe("Round trip body");

        // Sanity check the exported HTML carries the content marker.
        expect(html).toContain("data-lexical-collapsible-content");
      }
    );
  });
});

describe("ImageNode importDOM", () => {
  it("reconstructs an image with src, alt, and dimensions", () => {
    withImportedNodes(
      '<p><img src="https://example.com/pic.png" alt="A picture" width="400" height="300"></p>',
      (nodes) => {
        const image = findNode(nodes, $isImageNode);
        expect(image).toBeDefined();
        expect(image!.getSrc()).toBe("https://example.com/pic.png");
      }
    );
  });

  it("serializes width/height/alt through the round-trip", () => {
    roundTrip(
      () => {
        $insertNodes([
          $createImageNode({
            src: "https://example.com/pic.png",
            altText: "A picture",
            width: 400,
            height: 300,
          }),
        ]);
      },
      (nodes, html) => {
        const image = findNode(nodes, $isImageNode);
        expect(image).toBeDefined();
        expect(image!.getSrc()).toBe("https://example.com/pic.png");
        expect(html).toContain('width="400"');
        expect(html).toContain('alt="A picture"');
      }
    );
  });

  it("ignores img elements without a src", () => {
    withImportedNodes("<p><img alt='broken'></p>", (nodes) => {
      expect(findNode(nodes, $isImageNode)).toBeUndefined();
    });
  });

  it("ignores file:// image sources", () => {
    withImportedNodes("<p><img src='file:///etc/passwd' alt='x'></p>", (nodes) => {
      expect(findNode(nodes, $isImageNode)).toBeUndefined();
    });
  });
});

describe("TableOfContentsNode importDOM", () => {
  it("reconstructs a fresh TOC node from the exported placeholder", () => {
    withImportedNodes(
      '<div data-type="table-of-contents">[Table of Contents]</div>',
      (nodes) => {
        expect(findNode(nodes, $isTableOfContentsNode)).toBeDefined();
      }
    );
  });

  it("does not convert a div with a different data-type", () => {
    withImportedNodes('<div data-type="something-else">x</div>', (nodes) => {
      expect(findNode(nodes, $isTableOfContentsNode)).toBeUndefined();
    });
  });

  it("round-trips through exportDOM HTML", () => {
    roundTrip(
      () => {
        $insertNodes([$createTableOfContentsNode()]);
      },
      (nodes) => {
        expect(findNode(nodes, $isTableOfContentsNode)).toBeDefined();
      }
    );
  });
});

describe("PageLinkNode importDOM", () => {
  it("reconstructs an inline page link from a marked span", () => {
    withImportedNodes(
      '<p>See <span data-page-id="page-123">[[page:page-123]]</span> here</p>',
      (nodes) => {
        const pageLink = findNode(nodes, $isPageLinkNode);
        expect(pageLink).toBeDefined();
        expect(pageLink!.getPageId()).toBe("page-123");
      }
    );
  });

  it("does not convert a plain span", () => {
    withImportedNodes("<p><span>plain</span></p>", (nodes) => {
      expect(findNode(nodes, $isPageLinkNode)).toBeUndefined();
    });
  });

  it("round-trips through exportDOM HTML preserving the pageId", () => {
    roundTrip(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.append(
          $createTextNode("See "),
          $createPageLinkNode({ pageId: "page-abc" })
        );
        $insertNodes([paragraph]);
      },
      (nodes) => {
        const pageLink = findNode(nodes, $isPageLinkNode);
        expect(pageLink).toBeDefined();
        expect(pageLink!.getPageId()).toBe("page-abc");
      }
    );
  });
});

describe("DatabaseNode importDOM", () => {
  it("reconstructs a database embed from the exported div", () => {
    withImportedNodes(
      '<div data-database-id="db-42">[[database:db-42]]</div>',
      (nodes) => {
        const database = findNode(nodes, $isDatabaseNode);
        expect(database).toBeDefined();
        expect(database!.getDatabaseId()).toBe("db-42");
        expect(database!.getViewId()).toBeNull();
      }
    );
  });

  it("does not convert an unmarked div", () => {
    withImportedNodes("<div>Not a database</div>", (nodes) => {
      expect(findNode(nodes, $isDatabaseNode)).toBeUndefined();
    });
  });

  it("round-trips through exportDOM HTML preserving the databaseId", () => {
    roundTrip(
      () => {
        $insertNodes([
          $createDatabaseNode({ databaseId: "db-99", viewId: null }),
        ]);
      },
      (nodes) => {
        const database = findNode(nodes, $isDatabaseNode);
        expect(database).toBeDefined();
        expect(database!.getDatabaseId()).toBe("db-99");
      }
    );
  });
});
