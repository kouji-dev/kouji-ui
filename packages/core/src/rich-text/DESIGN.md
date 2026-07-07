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
| `rich-text-editor.ts` | `KjRichTextEditor` directive (`[kjRichTextEditor]`). Owns the Lexical editor instance, SSR-safe lazy init, reactive state signals, format/block/list/link/history/image commands, value in/out, `ControlValueAccessor`. Provides `KJ_RICH_TEXT`; collects extensions; hosts the Angular decorator mount adapter. |
| `rich-text.context.ts` | `KJ_RICH_TEXT` context token (signal-context pattern), `KJ_RICH_TEXT_EXTENSIONS` multi-token + `provideKjRichText(...)`, `KJ_RICH_TEXT_NODE` + `injectRichTextNode()`, and the `KjDecoratorMountAdapter` contract. |
| `rich-text-extension.ts` | `KjRichTextExtensionDirective` (`[kjRichTextExtension]`) — child directive that self-registers an extension with the nearest editor (like `Option`↔`Select`). |
| `rich-text-plugin.ts` | `KjRichTextExtension` contract (`nodes` lazy factory + `decorators` + `setup`), `KjRichTextContext`, `KjDecoratorRegistration`. `KjRichTextPlugin` kept as a deprecated alias. |
| `decorator-node.ts` | `createKjDecoratorNode(lexical, config)` — builds a `DecoratorNode` subclass rendered by an Angular component via the bridge. Returns `{ Node, $create, $is }`. No eager Lexical import (receives the namespace). |
| `engine.ts` | Browser-only orchestrator (lazy). Collects nodes from all extensions **before** `createEditor`, runs setups after, and runs the decorator bridge. Built-in features are themselves extensions. |
| `image-node.ts` | Self-rendering `KjImageNode` (extends `DecoratorNode`, renders its own `<figure><img>` in `createDOM` — jsdom/SSR safe). Contributed by the built-in `image` extension. |
| `rich-text-editor.types.ts` | Public types: `KjBlockType`, `KjTextFormat`, `KjRichTextState`, `KjRichTextValue`, `KjImageInsert`. |
| `index.ts` / `public-api` | Barrel + exports (framework surface is Lexical-free at runtime). |

**SSR-safety** (mirrors `chart.ts`): all Lexical runtime symbols are loaded via `await import()`
inside `afterNextRender`. Only `import type` at module top-level (erased at build → no SSR
`require`). All commands guard on the engine being non-null; before init they are no-ops.

## Extension framework

The core is a **registration framework** so nodes/behaviours can be added from outside the
engine, in kouji's directive idiom. Built-in features (rich-text, list, link, code, image,
history, markdown) are themselves extensions.

**Extension contract** (`KjRichTextExtension`):
- `nodes?(lexical)` — **lazy** node-class factory, resolved at engine init *after* the dynamic
  Lexical import, so node classes stay out of the base bundle and SSR-safe. Nodes from **all**
  extensions are collected **before** `createEditor` (fixing the old flaw where `setup` ran too
  late to add nodes).
- `decorators?` — `{ nodeType, component }[]` mapping decorator-node types to Angular components.
- `setup?(ctx)` — runtime behaviour; `ctx` exposes `editor` + `registerCommand` /
  `registerNodeTransform` passthroughs; returns an optional teardown.

**Node factory** — `createKjDecoratorNode(lexical, { type, component, inline?, ariaLabel? })`
returns `{ Node, $create, $is }`: a `DecoratorNode` subclass storing JSON `data`, whose
instances render `component` (which reads its node via `injectRichTextNode()`).

**Decorator bridge (no CDK)** — the engine registers a Lexical `decoratorListener`; for each
decorator node it mounts the registered Angular component into the node's DOM using a
`KjDecoratorMountAdapter` supplied by the directive (`createComponent` + `ApplicationRef` +
an element injector providing `KJ_RICH_TEXT_NODE`), disposing on node removal / editor destroy.

**Registration surfaces** (both kouji-idiomatic):
- Child directive `[kjRichTextExtension]="ext | ext[]"` — injects `KJ_RICH_TEXT`, registers on
  `ngOnInit` (before init).
- `provideKjRichText(...exts)` — multi-provider (`KJ_RICH_TEXT_EXTENSIONS`) for app/route/component
  scope, like `provideIcons`.
- Per-instance input `kjExtensions` (`kjPlugins` kept as a deprecated alias).

```ts
// Define + register a custom node in ~10 lines, from outside the engine:
const badge = createKjDecoratorNode(lexical, { type: 'badge', component: BadgeChip, inline: true });
export const badgeExtension: KjRichTextExtension = {
  name: 'badge',
  nodes: () => [badge.Node],
  decorators: [{ nodeType: 'badge', component: BadgeChip }],
};
// <div kjRichTextEditor [kjRichTextExtension]="badgeExtension"></div>
// editor.update(() => $insertNodes([badge.$create({ label: 'New' })]));
```

**Reactive state** (signals, updated from a Lexical `registerUpdateListener` +
`SELECTION_CHANGE`/`CAN_UNDO`/`CAN_REDO` command listeners):
- `activeFormats: Signal<Set<KjTextFormat>>` — bold/italic/underline/strikethrough/code
- `blockType: Signal<KjBlockType>` — paragraph/h1/h2/h3/quote/code/bullet/number
- `canUndo`, `canRedo`, `isLink`, `empty`, `focused` — booleans
- convenience computeds: `isBold`, `isItalic`, … for template ergonomics

**Commands** (public methods; no-op until initialized):
`toggleFormat(f)`, `setBlock(b)`, `toggleList('bullet'|'number')`, `toggleLink(url|null)`,
`getSelectedLinkUrl()`, `insertImage({src,alt})`, `undo()`, `redo()`, `focus()`, `clear()`,
`getHtml()`, `setHtml()`, `getJson()`, `setJson()`.

**Value I/O + forms.** `kjValue` input (HTML string) / `valueChange`, `htmlChange`,
`jsonChange`, `textChange` outputs. Implements `ControlValueAccessor` (HTML string is the
model) so it drops into template & reactive forms.

**Keyboard shortcuts** wired inside the editor: Ctrl/Cmd+B/I/U (bold/italic/underline),
Ctrl/Cmd+K (link), plus Lexical's built-in undo/redo (Ctrl/Cmd+Z / Shift+Z) and
markdown shortcuts (`# `, `- `, `1. `, `> `, ``` ``` ```, `**`, `*`, `` ` ``).

### Components — `@kouji-ui/components/src/rich-text/`

| File | Responsibility |
|---|---|
| `rich-text-editor.ts` | `KjRichTextEditorComponent` (`kj-rich-text-editor`). Renders a labelled `role="toolbar"` (roving tabindex) of formatting controls + a `contenteditable` host carrying the core directive, plus inline (non-CDK) link and image entry forms shown in normal flow when their toolbar control is toggled. Forwards value I/O + `kjLabel`/`kjPlaceholder`. Composes core. |
| `rich-text-editor.css` | Themed styles via CSS custom properties (`--kj-rte-*`), light/dark (via shared tokens), reduced-motion, focus rings, AAA touch targets, content typography (headings/lists/quote/code/link/image). |
| `index.ts` | Barrel. |

Toolbar buttons use `kjRovingTabindexItem` (single tab stop, arrow-key nav — WCAG toolbar
pattern). `aria-pressed` reflects `activeFormats`. A `kjLiveRegion` announces format/block
changes ("Bold on", "Heading 1"). Icons via `kjIcon` (lucide), decorative buttons carry
`aria-label`. Touch targets ≥ 44px.

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
