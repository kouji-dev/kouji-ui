# KjRichTextEditor — Design Spec

Status: implemented (feat/rich-text-editor)
Engine: [Lexical](https://lexical.dev) ^0.38.2 (browser-only, SSR-guarded)

## Goal

A rich-text editor for kouji-ui following the **engine-wrap** convention already used by
`KjChart` (ECharts) and `KjTable` (TanStack): a headless **core** directive that owns the
third-party engine + reactive state + commands, and a styled **components** wrapper that
composes it with a toolbar and design tokens. **No `@angular/cdk`** (strict repo policy).

## Package split

### Core — `@kouji-ui/core/src/rich-text/`

| File | Responsibility |
|---|---|
| `feature.ts` | The `KjRichTextFeature` contract (`load`/`nodes`/`setup`/`toolbar`/`overlay`/`decorators`), the `KjRichTextContext` (package-agnostic helpers), `KjRteToolbarItem`, `KjRteOverlay`, `KjDecoratorRegistration`. |
| `rich-text-editor.ts` | `KjRichTextEditor` directive (`[kjRichTextEditor]`). SSR-safe lazy init; merges features (DI + `kjFeatures` + child directives); exposes `state`, `toolbarItems`/`toolbarGroups`, `activeOverlay`, `runItem`; value in/out + `ControlValueAccessor`. Provides `KJ_RICH_TEXT`; hosts the decorator mount adapter. |
| `rich-text.context.ts` | `KJ_RICH_TEXT` context token, `KJ_RICH_TEXT_FEATURES` multi-token + `provideKjRichText(...)`, `KJ_RICH_TEXT_NODE`/`injectRichTextNode()`, `KJ_RTE_OVERLAY_DATA`/`injectRteOverlayData()`, `KjDecoratorMountAdapter`. |
| `rich-text-extension.ts` | `KjRichTextExtensionDirective` (`[kjRichTextFeature]`, `[kjRichTextExtension]`) — child directive that self-registers a feature (like `Option`↔`Select`). |
| `rich-text-plugin.ts` | Deprecated aliases: `KjRichTextExtension`/`KjRichTextPlugin` → `KjRichTextFeature`. |
| `decorator-node.ts` | `createKjDecoratorNode(lexical, config)` — Angular-rendered decorator node. Returns `{ Node, $create, $is }`. No eager Lexical import. |
| `image-node.ts` | `createKjImageNode(lexical)` — self-rendering image node (own `<figure><img>` + HTML round-trip). No eager Lexical import; used by the `image` feature. |
| `engine.ts` | Browser-only orchestrator (lazy). Awaits each feature's `load()`, collects nodes **before** `createEditor`, runs setups, package-agnostic state, decorator bridge. Base editing only is statically imported. |
| `rich-text-editor.types.ts` | Public types: `KjBlockType`, `KjTextFormat`, `KjRichTextState`, `KjRichTextValue`, `KjImageInsert`. |
| `index.ts` / `public-api` | Barrel + exports (framework surface is Lexical-free at runtime). |

**SSR-safety** (mirrors `chart.ts`): all Lexical runtime symbols are loaded via `await import()`
inside `afterNextRender`. Only `import type` at module top-level (erased at build → no SSR
`require`). All commands guard on the engine being non-null; before init they are no-ops.

## Feature framework (client-driven)

The editor is composed from **features** — self-contained vertical slices that each own their
**package loading**, **nodes**, **behaviour/activation**, and **UI** (toolbar + overlay). The
client picks features; only chosen features load packages and contribute UI. Built-in editing
(rich-text base) is the engine floor; everything else is a feature.

**Feature contract** (`KjRichTextFeature`):
- `load?()` — **lazily imports the feature's own `@lexical/*` package(s)** (`link()` imports
  `@lexical/link`, `bulletList()` imports `@lexical/list`, …). Each `load` is a per-feature
  dynamic `import()`, so disabling a feature means its package is never downloaded. Awaited in
  parallel at engine init.
- `nodes?()` — node classes (resolved after `load`), collected from **all** features **before**
  `createEditor`.
- `setup?(ctx)` — register commands / transforms / keybindings; returns a teardown.
- `toolbar?: KjRteToolbarItem[]` — declarative contributions `{ id, group, order, icon, label,
  ariaKeyshortcuts?, kind: 'button'|'toggle', isActive?(state), isDisabled?(state), run(ctx) }`.
- `overlay?: KjRteOverlay[]` — `{ id, label, component }`; opened via `ctx.openOverlay(id, data)`.
- `decorators?` — `{ nodeType, component }` for Angular-rendered decorator nodes.

**Context** (`ctx`, package-agnostic helpers): `editor`, live `state`, `update`/`read`,
`toggleInlineFormat`, `setBlock(create)`/`setParagraph`, `insertNodes`, `dispatch`,
`registerCommand`/`registerNodeTransform`/`registerShortcut`, `undo`/`redo`/`focus`,
`openOverlay`/`closeOverlay`, `announce`. Inline formats (bold/italic) load **no** package.

**Package-agnostic engine.** The engine statically imports only the base (`lexical`,
`@lexical/rich-text` for `registerRichText`, `@lexical/selection`, `@lexical/html`). State
(`blockType`, `isLink`) is derived by `node.getType()` + duck-typing — the engine never imports
a feature's package. HTML (de)serialization uses `$generateNodesFromDOM`, which only emits nodes
for **registered (active)** types, so it automatically respects the active node set.

**Client composition:**
- `provideKjRichText(bold(), italic(), link(), …)` — multi-provider (`KJ_RICH_TEXT_FEATURES`).
- `[kjFeatures]` input (per-instance) / `[kjRichTextFeature]` child directive.
- `defaultFeatures()` — the full bundle, so zero-config still gives the complete editor.

**Node factories** (SSR-safe — receive the `lexical` namespace, no eager import):
`createKjDecoratorNode(lexical, cfg) → { Node, $create, $is }` (Angular-rendered node) and
`createKjImageNode(lexical) → { Node, $create, $is }` (self-rendering image). The decorator
bridge mounts Angular components via a `KjDecoratorMountAdapter` (`createComponent` +
`ApplicationRef` + an element injector providing `KJ_RICH_TEXT_NODE`), disposing on removal.

```ts
// A custom feature: its own node + toolbar button, from outside the engine.
const badge = createKjDecoratorNode(lexical, { type: 'badge', component: BadgeChip, inline: true });
export const badgeFeature: KjRichTextFeature = {
  name: 'badge',
  nodes: () => [badge.Node],
  decorators: [{ nodeType: 'badge', component: BadgeChip }],
  toolbar: [{ id: 'badge', group: 'insert', order: 20, icon: 'sparkles', label: 'Insert badge',
    kind: 'button', run: (ctx) => ctx.insertNodes(() => [badge.$create({ label: 'New' })]) }],
};
// <kj-rich-text-editor [kjFeatures]="[...defaultFeatures(), badgeFeature]" />
```

**Value I/O + forms.** `kjValue` input (HTML) + `valueChange`/`textChange`/`jsonChange` outputs;
`ControlValueAccessor` (HTML string model). **Reactive state**: `state` signal +
`isBold`/`blockType`/`canUndo`/… computeds. **Keyboard**: features register their own shortcuts
(Ctrl/Cmd+B/I/U, Ctrl/Cmd+K), plus Lexical undo/redo + markdown shortcuts.

### Components — `@kouji-ui/components/src/rich-text/`

| File | Responsibility |
|---|---|
| `rich-text-editor.ts` | `KjRichTextEditorComponent` (`kj-rich-text-editor`). Renders a **dynamic** `role="toolbar"` from `ed.toolbarGroups()` (roving tabindex, `aria-pressed` on toggles) — no hardcoded buttons. Feature overlays render via `NgComponentOutlet` in a `role="dialog"` popover. `kjFeatures` defaults to `defaultFeatures()`. |
| `features/*.ts` | The feature factories: `bold`/`italic`/`underline`/`strike`/`inlineCode`, `heading`, `bulletList`/`orderedList`, `quote`, `codeBlock`, `link`, `image`, `markdownShortcuts`, `history`, + `defaultFeatures()`. Each `load()`s its own package. |
| `overlays/*.ts` | `LinkEditor`, `ImageEditor` overlay components (contributed by the link/image features). |
| `rich-text-editor.css` | Themed styles via `--kj-rte-*`, reduced-motion, focus rings, AAA touch targets, overlay + content typography. |

Toolbar buttons use `kjRovingTabindexItem` (single tab stop, arrow-key nav — WCAG toolbar
pattern). `aria-pressed` reflects toggle state; `aria-keyshortcuts` advertises shortcuts. A
`kjLiveRegion` announces format/block changes + feature announcements. Touch targets ≥ 44px.

> **Overlay note (honest):** feature overlays render in a scoped, accessible `role="dialog"`
> popover managed by the RTE component (no CDK, Esc/outside dismissable, focus-managed) rather
> than the shared `KjOverlayService` — the repo's connected-overlay path is directive-based and
> doesn't fit dynamic per-feature components cleanly. The `overlay` contribution API is engine-
> agnostic and ready to route to `KjOverlayService` in a follow-up.

## Scope shipped

bold, italic, underline, strikethrough, inline code; headings h1–h3; paragraph; blockquote;
ordered + unordered lists; links (inline editor, Ctrl+K); undo/redo history; code blocks;
markdown shortcuts; image insertion (by URL/alt, self-rendering node).

## Delivered via the framework

- **Angular-rendered decorator nodes** — the decorator bridge mounts Angular components into
  Lexical decorator nodes (no CDK). Proven by the shipped **badge chip** custom-node example
  (`rich-text-editor.custom-node.example.ts`).

## Deferred (honest)

- **Mentions / @-typeahead** — requires a positioned popup menu; doing it without CDK means
  wiring kouji's overlay primitives into a Lexical typeahead. Significant standalone scope;
  deferred to a follow-up. It is now straightforward to build **on top of** the extension
  framework (a `nodes` + `decorators` + `setup` extension registering the typeahead command).

## Accessibility (target WCAG 2.1 AAA)

- contenteditable: `role="textbox"`, `aria-multiline="true"`, `aria-label`/`aria-labelledby`,
  `aria-describedby` for placeholder/error.
- Toolbar: `role="toolbar"`, `aria-label`, roving tabindex, `aria-pressed` state.
- Live-region announcements on format/block changes.
- Focus visible; focus returns to editor after toolbar actions.
- `prefers-reduced-motion` respected; AAA contrast tokens.
