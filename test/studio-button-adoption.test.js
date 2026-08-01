import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "svelte/compiler";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Every listed file owns at least one standard Studio action that must use the
 * Giada UI Button component.
 */
const adoptionFiles = [
  "src/lib/components/StudioItemGalleryFields.svelte",
  "src/lib/components/StudioItemMetaFields.svelte",
  "src/lib/components/StudioItemRelationFields.svelte",
  "src/routes/studio/about/+page.svelte",
  "src/routes/studio/catalog/+page.svelte",
  "src/routes/studio/collections/+page.svelte",
  "src/routes/studio/collections/[id]/+page.svelte",
  "src/routes/studio/collections/new/+page.svelte",
  "src/routes/studio/items/+page.svelte",
  "src/routes/studio/items/[id]/+page.svelte",
  "src/routes/studio/items/new/+page.svelte",
  "src/routes/studio/news/+page.svelte",
  "src/routes/studio/news/[id]/+page.svelte",
  "src/routes/studio/news/new/+page.svelte",
  "src/routes/studio/readiness/+page.svelte",
  "src/routes/studio/signal-clouds/+page.svelte",
  "src/routes/studio/site/appearance/+page.svelte",
  "src/routes/studio/site/contact/+page.svelte",
  "src/routes/studio/site/footer/+page.svelte",
  "src/routes/studio/site/hero/+page.svelte",
  "src/routes/studio/site/identity/+page.svelte",
  "src/routes/studio/site/layout/+page.svelte",
  "src/routes/studio/site/social/+page.svelte",
  "src/routes/studio/system/+page.svelte",
];

/**
 * Native buttons retained deliberately because Giada UI Button does not own
 * their specialized interaction contract.
 *
 * Each matcher receives the exact source slice of one native button.
 */
/** @typedef {(source: string) => boolean} NativeButtonMatcher */

/** @type {Map<string, NativeButtonMatcher[]>} */
const nativeButtonAllowlist = new Map([
  [
    "src/lib/components/StudioItemGalleryFields.svelte",
    [
      (source) => source.includes("moveUp(index)") && source.includes("↑"),
      (source) => source.includes("moveDown(index)") && source.includes("↓"),
    ],
  ],
  [
    "src/lib/components/StudioItemMetaFields.svelte",
    [
      (source) => source.includes("moveUp(index)") && source.includes("↑"),
      (source) => source.includes("moveDown(index)") && source.includes("↓"),
    ],
  ],
  [
    "src/lib/components/StudioItemRelationFields.svelte",
    [(source) => source.includes("chooseTarget(index, item)")],
  ],
  [
    "src/routes/studio/collections/+page.svelte",
    [
      (source) => source.includes("moveUp(index)") && source.includes("↑"),
      (source) => source.includes("moveDown(index)") && source.includes("↓"),
    ],
  ],
  [
    "src/routes/studio/collections/[id]/+page.svelte",
    [
      (source) => source.includes("moveUp(index)") && source.includes("↑"),
      (source) => source.includes("moveDown(index)") && source.includes("↓"),
    ],
  ],
  [
    "src/routes/studio/items/+page.svelte",
    [
      (source) => source.includes("moveUp(index)") && source.includes("↑"),
      (source) => source.includes("moveDown(index)") && source.includes("↓"),
    ],
  ],
  [
    "src/routes/studio/news/+page.svelte",
    [
      (source) => source.includes("moveUp(index)") && source.includes("↑"),
      (source) => source.includes("moveDown(index)") && source.includes("↓"),
    ],
  ],
]);

/** @typedef {Record<string, any>} AstNode */

/**
 * @param {unknown} node
 * @param {(node: AstNode) => void} visit
 */
function walk(node, visit) {
  if (!node || typeof node !== "object") return;

  const astNode = /** @type {AstNode} */ (node);
  visit(astNode);

  for (const value of Object.values(astNode)) {
    if (Array.isArray(value)) {
      for (const child of value) walk(child, visit);
    } else {
      walk(value, visit);
    }
  }
}

/**
 * @param {string} relativePath
 */
function inspectSvelte(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  const ast = parse(source, { modern: true });

  /** @type {AstNode[]} */
  const components = [];
  /** @type {AstNode[]} */
  const nativeButtons = [];

  walk(ast.fragment, (node) => {
    if (node.type === "Component" && node.name === "Button") {
      components.push(node);
    }

    if (node.type === "RegularElement" && node.name === "button") {
      nativeButtons.push(node);
    }
  });

  return {
    source,
    components,
    nativeButtons: nativeButtons.map((node) =>
      source.slice(node.start, node.end),
    ),
  };
}

test("standard Studio actions adopt the Giada UI Button entry point", () => {
  for (const relativePath of adoptionFiles) {
    const { source, components } = inspectSvelte(relativePath);

    assert.match(
      source,
      /import\s*\{[^}]*\bButton\b[^}]*\}\s*from\s*['"]giadaware-ui-components\/studio['"]/,
      `${relativePath}: imports Button from the narrow Studio entry point`,
    );

    assert.ok(
      components.length > 0,
      `${relativePath}: renders at least one Giada UI Button`,
    );
  }
});

test("only explicitly classified specialized controls remain native buttons", () => {
  for (const relativePath of adoptionFiles) {
    const { nativeButtons } = inspectSvelte(relativePath);
    const allowedMatchers = nativeButtonAllowlist.get(relativePath) ?? [];

    assert.equal(
      nativeButtons.length,
      allowedMatchers.length,
      `${relativePath}: native button count`,
    );

    const unmatched = [...nativeButtons];

    for (const matcher of allowedMatchers) {
      const index = unmatched.findIndex((source) => matcher(source));

      assert.notEqual(
        index,
        -1,
        `${relativePath}: expected specialized native button is present`,
      );

      unmatched.splice(index, 1);
    }

    assert.deepEqual(
      unmatched,
      [],
      `${relativePath}: no unclassified native buttons remain`,
    );
  }
});

test("Studio layout no longer styles every descendant button globally", () => {
  const layout = fs.readFileSync(
    path.join(root, "src/routes/studio/+layout.svelte"),
    "utf8",
  );

  assert.doesNotMatch(
    layout,
    /:global\(\.studio-panel\s+button(?::disabled)?\)/,
  );

  assert.match(
    layout,
    /--giu-button-/,
    "Atelier-Kit themes package-owned buttons through Giada UI tokens",
  );
});
