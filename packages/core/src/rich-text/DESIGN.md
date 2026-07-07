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
| `rich-text-editor.ts` | `KjRichTextEditor` directive (`[kjRichTextEditor]`). Owns the Lexical editor instance, SSR-safe lazy init, reactive state signals, format/block/list/link/history/image commands, value in/out, `ControlValueAccessor`. |
| `rich-text-plugin.ts` | `KjRichTextPlugin` interface + `KjRichTextContext` — the plugin registration system. Built-ins register through it; consumers can add their own. |
| `plugins.ts` | Built-in plugin factories: history, list, link, markdown-shortcuts, code, image. Each returns a `KjRichTextPlugin`. |
| `image-node.ts` | Self-rendering `ImageNode` (extends `DecoratorNode`, renders its own `<figure><img>` in `createDOM` — no framework decorator infra, jsdom/SSR safe). |
| `rich-text-editor.types.ts` | Public types: `KjBlockType`, `KjTextFormat`, `KjEditorValue`, `KjEditorState`. |
| `index.ts` / `public-api` | Barrel + exports. |

**SSR-safety** (mirrors `chart.ts`): all Lexical runtime symbols are loaded via `await import()`
inside `afterNextRender`. Only `import type` at module top-level (erased at build → no SSR
`require`). All commands guard on `this.#editor()` being non-null; before init they are no-ops.

**Plugin system.** After the editor is created (browser only), each registered
`KjRichTextPlugin.setup(ctx)` runs, receiving `{ editor, lexical, modules, announce }` where
`modules` holds the already-imported `@lexical/*` namespaces. `setup` returns a teardown fn.
Built-in set: `historyPlugin`, `listPlugin`, `linkPlugin`, `markdownShortcutsPlugin`,
`codePlugin`, `imagePlugin`, plus core rich-text (`registerRichText`). Consumers pass extra
plugins via the `kjPlugins` input.

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

## Deferred (honest)

- **Mentions / @-typeahead** — requires a positioned popup menu; doing it without CDK means
  wiring kouji's overlay primitives into a Lexical typeahead. Significant standalone scope;
  deferred to a follow-up. The `KjRichTextPlugin` system is the extension point for it.
- **Angular-rendered decorator nodes** (rich interactive embeds) — the reference mounts Angular
  components into decorator nodes via a `DecoratorsPlugin`. Images here use a self-rendering DOM
  node instead (simpler, SSR/jsdom-safe). Full framework decorator mounting deferred.

## Accessibility (target WCAG 2.1 AAA)

- contenteditable: `role="textbox"`, `aria-multiline="true"`, `aria-label`/`aria-labelledby`,
  `aria-describedby` for placeholder/error.
- Toolbar: `role="toolbar"`, `aria-label`, roving tabindex, `aria-pressed` state.
- Live-region announcements on format/block changes.
- Focus visible; focus returns to editor after toolbar actions.
- `prefers-reduced-motion` respected; AAA contrast tokens.
