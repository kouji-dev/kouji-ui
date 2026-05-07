# File Input / File Upload

The **File Input / File Upload** family lets users select files from the
local filesystem, optionally drag-and-drop them, and (in the advanced
flavour) review a list of selected files with per-file status, progress,
and retry / cancel affordances.

The category sits awkwardly between Data Input (it is form-bound — value
is `File | File[] | FileList`) and Feedback (per-file progress, status
toasts, live-region announcements). The **input side** belongs in
`data-input/`; the **progress / status side** lives in `feedback/`
(forward-references to a future `feedback/progress-bar.md` and the
existing `KjLiveRegion`).

Two distinct shapes ship — **not one component with `kjMode`**:

- **`KjFileInput`** — a thin headless directive on a native
  `<input type="file">` plus a styled wrapper that renders a single
  `KjButton` "browse" trigger and a value-text readout. The kouji
  analogue of daisyUI's [file-input](https://daisyui.com/components/file-input/),
  PrimeNG's `FileUpload mode="basic"`, and what consumers of Material /
  shadcn end up rolling by hand.
- **`KjFileUpload`** — a compound (root + four child directives) for the
  drop-zone + per-file list + progress UI. The kouji analogue of
  PrimeNG's [`FileUpload mode="advanced"`](https://primeng.org/fileupload).

This document covers both. The split is the central decision (see
[Decision: basic vs. advanced](#decision-basic-vs-advanced)).

Cross-references:
- [`input.md`](./input.md) — the canonical leaf-control pattern.
  `KjFileInput` is the next leaf in that family; the `[type="file"]`
  shape borrows the `KjFormControl` plumbing but **rejects** value
  reflection from form-model → DOM (see
  [Open questions](#open-questions--risks) #1).
- [`field.md`](./field.md) — `KjField` wraps both `KjFileInput` and
  `KjFileUpload`. The drop-zone instructional text ("Drag files here, or
  click to browse") lives as a `KjFieldHint` inside the field, not as
  bare text inside the drop-zone. The field's describedby chain flows
  onto the `<input type="file">` (basic) or onto the drop-zone host
  (advanced) — see [Accessibility](#accessibility-wcag-21-aaa).
- [`form.md`](./form.md) — `KjFileUpload` participates in a form like any
  other control; its value is `File[]` (or `File` when
  `kjMultiple=false`). Form-level submit semantics are unchanged — the
  consumer decides whether to upload-on-change (auto) or upload-on-submit
  (form), and the **actual transport is out of scope for core** (see
  [Decision: upload transport](#decision-upload-transport)).
- [`../actions/button.md`](../actions/button.md) — the "browse" /
  "upload all" / "cancel all" / per-file retry / per-file remove
  controls are all `KjButton`s with various `kjVariant` / `kjSize`.
  No new button shape is introduced.
- `feedback/progress-bar.md` *(forward-reference, not yet written)* —
  per-file `<progress kjProgress>` (or `<div role="progressbar">`).
  `KjFileUploadItem` exposes a `progress` signal (0–100, or `null` for
  indeterminate); the styled wrapper renders a `KjProgressBar` bound to
  it.
- **`KjLiveRegion`** (already shipped, `packages/core/src/a11y/`) — used
  to announce file additions, removals, completions, and errors. See
  [Accessibility](#accessibility-wcag-21-aaa).
- **Future `KjDragDrop` primitive** *(not shipped, not yet specified)* —
  see [Decision: drag-and-drop primitive](#decision-drag-and-drop-primitive).

## Source comparison

### PrimeNG — `<p-fileUpload>` with two modes

[primeng.org/fileupload](https://primeng.org/fileupload) ships a single
component with three behavioural modes selected via `[mode]`:

- **`mode="advanced"`** (default). Renders a toolbar (Choose / Upload /
  Cancel buttons), a drag-and-drop zone, and a file list with previews
  (image thumbnails for image MIME types) and per-file remove buttons.
  Inputs: `name`, `url` (target endpoint), `multiple`, `accept`,
  `maxFileSize`, `fileLimit`, `auto` (auto-upload on selection),
  `customUpload` (caller takes over the XHR), `withCredentials`,
  `chooseLabel` / `uploadLabel` / `cancelLabel`,
  `previewWidth`, `chooseIcon` / `uploadIcon` / `cancelIcon`,
  `showUploadButton`, `showCancelButton`, `headers`. Outputs:
  `onSelect`, `onSend`, `onUpload`, `onError`, `onClear`, `onRemove`,
  `onProgress`, `uploadHandler` (when `customUpload`).
- **`mode="basic"`**. Renders a single button-styled trigger that opens
  the file picker. Same inputs, fewer outputs (no progress / list /
  drag-drop). The "value" is exposed via `onSelect` and the underlying
  file array.
- **`mode="basic" auto="true"`**. Auto-upload on pick — useful for
  one-shot avatar uploads.

PrimeNG **owns the XHR** by default (unless `customUpload` is set) and
ships built-in progress, success, error, retry. This is convenient and
also the source of half PrimeNG's open issues on the component (CORS
quirks, auth header threading, server response shape coupling). The
opt-out via `customUpload` exists exactly because the built-in
transport doesn't fit every backend.

A11y: the choose button is a real `<button>`, the drop-zone is a
`<div>` with no `role` and no keyboard handler — clicking the choose
button is the only keyboard path. The file list is a `<div>` of
`<div>` rows (no `role="list"` / `role="listitem"`). Progress uses
`<p-progressBar>` (which renders `role="progressbar"` correctly). No
`KjLiveRegion`-style announcement on add / complete.

### Angular Material — gap

Material does **not** ship a file-upload component.
[material.angular.dev](https://material.angular.dev/components/categories)
has no entry. The official guidance is "wrap a `<button mat-raised-button>`
that triggers a hidden `<input type="file">` via `click()`, or style the
input with `display: none` and label it". Material's `<input matInput>`
explicitly rejects `type="file"` (the type union excludes it; runtime
throws `MatInputUnsupportedTypeError`). Per-file progress, drag-drop,
multi-file lists are entirely the consumer's job — typically with a
hand-rolled service plus `MatProgressBar` plus `MatList`.

This gap is the single biggest argument for kouji shipping a real
file-upload component family — Material consumers re-invent it on every
project.

### shadcn/ui — gap

shadcn does not ship a file-upload component either. The community
recipes pair `<Input type="file">` (the styled wrapper) with custom
JSX for drag-drop, file lists, progress (using `<Progress>`), and
react-dropzone for the drop-zone behaviour. There is no first-class
component. Same gap as Material.

### daisyUI — basic only

[daisyui.com/components/file-input](https://daisyui.com/components/file-input/)
ships **only** the basic shape — a styled `<input type="file" class="file-input">`
with size / colour modifiers (`file-input-bordered`, `file-input-primary`,
`file-input-xs` / `sm` / `md` / `lg`). No drag-drop, no list, no
progress, no validation. Pure CSS over the native input. This is the
exact shape `KjFileInput` matches.

### ng-primitives — gap (as of writing)

[angularprimitives.com](https://angularprimitives.com) does not ship a
file-upload primitive. Same gap.

**Pattern picked up.** Compose what daisyUI does for **basic**
(`KjFileInput` = styled wrapper around native `<input type="file">` +
a `KjButton` browse trigger), and what PrimeNG does for **advanced**
(`KjFileUpload` = compound with drop-zone + list + progress) — but
**without** PrimeNG's bundled XHR transport. Transport is the
consumer's job; core ships the *state machine* (selected → uploading →
success / error → retry) and the *UI shell*. Three reasons:

1. Transport variance is the source of PrimeNG's bug volume.
2. Bundling fetch/XHR pulls non-trivial code into the headless package
   and clashes with HTTP interceptors / auth schemes consumers already
   have.
3. WCAG and keyboard semantics are entirely separable from transport.

## Decision: basic vs. advanced

**Two components, not one.** The `kjMode` toggle — PrimeNG's choice — is
rejected for kouji.

Reasons:

1. **API surface diverges sharply.** Basic has 4 meaningful inputs
   (`kjAccept`, `kjMultiple`, `kjMaxSize`, `kjDisabled`). Advanced has
   the same plus `kjMaxFiles`, drop-zone state, per-file state machine,
   and a per-file `progress` model. A single component would either
   ignore most inputs in basic mode (lying API surface) or expose a
   coupled mode-and-input matrix that's hard to type and harder to
   document.
2. **DOM shape diverges sharply.** Basic is a single `<input>` (with a
   styled-button label). Advanced is a wrapper `<div>` with a drop-zone,
   a hidden file input, a file-list `<ul>`, and per-file `<li>` rows.
   Forcing both into one component pushes the consumer into either
   `kjMode="basic"` with content-projection slots they don't use, or
   `kjMode="advanced"` with markup they didn't ask for.
3. **Composition wins.** `KjFileUpload` (advanced) can *internally
   compose* `KjFileInput` (basic) for its hidden file input. The
   "browse" button in advanced is the same `KjButton` pattern as the
   browse button in basic. There is no duplication penalty for splitting.
4. **Tree-shaking.** Apps that only need basic don't pay for the
   drop-zone state machine, file-list rendering, or live-region
   announcement code.

The split mirrors the wider library pattern: every "advanced"
component (Combobox vs. Select, Tree-Select vs. Select, Multi-Select
vs. Select) is a separate sibling, not a mode flag.

## Decision: upload transport

**Out of scope for core.** `KjFileUpload` ships the state machine and
emits a request whenever an upload should start; the consumer wires
the actual `HttpClient` (or `fetch`, or signed-URL POST, or chunked
upload) and feeds progress / completion back into the state.

The contract is a per-file **handler input** the consumer provides:

```ts
type KjFileUploadHandler = (file: KjUploadableFile) => Observable<KjUploadEvent>;

type KjUploadEvent =
  | { kind: 'progress'; loaded: number; total: number }   // 0..total bytes
  | { kind: 'success'; response?: unknown }                // server payload (opaque to core)
  | { kind: 'error'; message: string; cause?: unknown };   // human-readable + opaque cause

interface KjUploadableFile {
  readonly id: string;            // stable id, minted by KjFileUpload
  readonly file: File;            // the native File
  readonly status: KjFileStatus;  // see below
}

type KjFileStatus = 'pending' | 'uploading' | 'success' | 'error' | 'cancelled';
```

The directive subscribes per file when the consumer (or `kjAuto`)
triggers upload, applies events to the per-file signal store, and
unsubscribes on cancel / destroy. Cancel propagates by completing the
observable from the consumer side (`HttpClient` requests have a
built-in unsubscribe path that aborts the XHR; consumers using `fetch`
pass an `AbortController` through their handler).

Three reasons this is the right boundary:

1. **HTTP shape is consumer-specific.** Auth, CSRF, retry policy,
   chunking, signed URLs, multi-part vs. single-part — all
   per-backend. Anything we ship is wrong for half the consumers.
2. **Observable contract is universal.** Any HTTP client or custom
   transport can produce a `progress / success / error` stream.
   `HttpClient.request({ reportProgress: true, observe: 'events' })`
   maps cleanly. `fetch` + `AbortController` + manual progress (via
   `ReadableStream`) maps cleanly.
3. **Testability.** The state machine can be tested with a synchronous
   `Subject<KjUploadEvent>` — no network mocking.

When the consumer doesn't provide a handler (`kjUploadHandler` is
`undefined`), `KjFileUpload` is **selection-only**: the file list shows
selected files with remove buttons; no upload buttons render. This is
the canonical "form input that happens to allow drag-drop" use-case
(submit the files as part of a multipart form on form submit).

## Decision: drag-and-drop primitive

**Future `KjDragDrop` primitive — design now, ship with `KjFileUpload`.**
The drop-zone behaviour is non-trivial:

- `dragenter` / `dragleave` correctness across nested children (the
  classic "leave fires when entering a child" bug).
- `dragover.preventDefault()` to allow drop.
- `dataTransfer.types` introspection to filter to file drops only.
- Drop-zone highlight (`data-drag-active`) reflecting an entered state
  with a counter (incremented on `dragenter`, decremented on
  `dragleave`, cleared on `drop`).
- Keyboard-equivalent: a drop-zone *must* be focusable and Enter / Space
  must trigger the file picker. WCAG 2.1.1 (Keyboard) requires this.

Three options:

(a) Inline the logic into `KjFileUploadDropZone` and revisit when a
    second consumer needs drag-drop.
(b) Extract a tiny `KjDropZone` primitive in `packages/core/src/a11y/`
    or `packages/core/src/primitives/interaction/` now.
(c) Build a full `KjDragDrop` primitive that handles both drag *and*
    drop sides (sortable lists, kanban, etc.).

**Recommendation: (b).** Inline first, with the explicit intent to
extract once a second consumer (image gallery upload, JSON file import)
lands. (a) is fine; (c) is over-scoped — full drag-drop sortable lists
are a separate problem with different semantics
(`role="application"` workarounds, screen-reader sortable patterns,
keyboard reordering protocols), and `KjFileUpload` does not need any
of that. Document the inline implementation in
`packages/core/src/file-upload/drop-zone.ts` as "extract candidate".

## Base features

### `KjFileInput` (basic)

| Concern | Where | Notes |
|---|---|---|
| **Selector** | `[kjFileInput]` on `<input type="file">` | Mirrors `[kjInput]` shape. |
| **Browse button** | wrapper component `<kj-file-input>` projects a `KjButton` | The styled wrapper renders a `<label>` styled as a button (clicking the label opens the file picker without JavaScript). When the consumer uses just the directive, they bring their own `<label kjButton>` or external trigger. |
| **Value display** | wrapper component | Reads `formCtrl.value()` (a `File \| File[] \| null`) and renders `'No file selected'` / single filename / `'{n} files'`. Locale-bound; see [Open questions](#open-questions--risks) #6. |
| **Multiple** | native `multiple` attribute, surfaced as `kjMultiple` | When set, value type is `File[]`. |
| **Accept** | native `accept` attribute, surfaced as `kjAccept` | MIME types or extensions; comma-separated. The browser filters the picker but **does not validate drop** — that's our job for advanced (basic doesn't have drop). |
| **Variants / sizes** | via `KjVariant` / `KjSize` host directives | Same shape as `KjInput` (proposed). The visual is on the *button* (the `<label>`-styled-as-button) — `kjVariant` flows into the wrapper's button. |

### `KjFileUpload` (advanced)

| Concern | Where | Notes |
|---|---|---|
| **Root selector** | `[kjFileUpload]` | Provides `KJ_FILE_UPLOAD` context. Hosts the value, file list, drop-zone state. |
| **Drop-zone** | `[kjFileUploadDropZone]` child | Reflects `data-drag-active` when files are over the zone. Focusable (`tabindex="0"`), `role="button"`, `aria-label="Drag files here, or click to browse"` (configurable). Enter / Space triggers the file picker. |
| **Hidden file input** | inside the drop-zone (or root) | A native `<input type="file" kjFileInput>` with `hidden` (CSS-hidden, not attribute-hidden — keyboard-focusable for one path) — see [Open questions](#open-questions--risks) #2. The drop-zone clicks this input to open the picker. |
| **File list** | `[kjFileUploadList]` child | Renders an `<ul role="list">` (or projects rows; structural directives — see below). When empty, can be hidden by the wrapper. |
| **File row** | `[kjFileUploadItem]` child of list | One per selected file. Exposes a `KjFileUploadItemContext` (file, status, progress, retry / cancel callbacks). Renders thumbnail (image MIME types) / filename / size / progress bar / status icon / remove button via projection. |
| **Toolbar** | not a directive — projection slot in wrapper | "Upload all" and "Cancel all" buttons are `KjButton` instances bound to root context's bulk actions. Conditional on a handler being present. |
| **Auto-upload** | root input `kjAuto` | When `true`, calls the handler immediately on selection. When `false`, files sit in `pending` until the consumer (or the toolbar Upload button) triggers them. Default: `false`. |
| **Validation** | root | `kjAccept`, `kjMaxSize` (per file, bytes), `kjMaxFiles` (total selected, count). Failed files get `status: 'error'` with a built-in message ("File too large", "Type not allowed", "Too many files"); the consumer can override messages via `kjValidationMessages`. |
| **Variants / sizes** | via `KjVariant` / `KjSize` on root | Themes drive drop-zone padding, list density, thumbnail size. |

## Accessibility (WCAG 2.1 AAA)

### `KjFileInput` (basic)

| Concern | Where | Mechanism |
|---|---|---|
| **Role** | DOM | Native `<input type="file">`. Implicit role; **no** `role` override. |
| **Label association** | `KjField` / `KjFieldLabel` | `<label for="…">` to the input id, **or** `<label kjButton>` wrapping the input as a clickable picker. The directive auto-mints an id (delegates to `KjField` when present, or mints inline). WCAG 1.3.1 / 3.3.2. |
| **`aria-invalid`** | `KjInput`-style host binding | Touched-gated, same as `KjInput`. WCAG 3.3.1. |
| **`aria-describedby`** | via `KjField` | Field hint ("PNG or JPG, up to 5 MB") flows in. WCAG 1.3.1. |
| **`aria-required`** | derived from `Validators.required` | Same as `KjField`'s required mirror. WCAG 3.3.2. |
| **`aria-disabled` vs native `disabled`** | **native** `disabled` | Same policy as `KjInput` (text inputs use native disabled because there's no meaningful "discoverable but blocked" affordance for an input). Document the policy split — Button uses ARIA-disabled; file-input does not. |
| **Keyboard contract** | native | Tab focus, Enter / Space opens picker (browser-native). Nothing custom. WCAG 2.1.1. |
| **Focus-visible** | `KjFocusRing` host directive | `data-focus-visible` on keyboard focus only. The wrapper's button-styled `<label>` carries the visible ring. |
| **Touch target ≥ 44×44** | wrapper CSS | The `<label>`-styled-as-button is the visible target. Same `KjSize` `md` floor as `KjButton`. WCAG 2.5.5. |
| **Selected-file readout** | wrapper, not announced | Plain text inside the wrapper, not a live region — the user explicitly initiated the action so SR doesn't need to announce. The new value *is* however bound to `aria-describedby` of the input via the `KjField` chain when wired through a hint. |
| **Color/contrast** | themes layer | Same `--kj-color-*` tokens as `KjButton` / `KjInput`. |

### `KjFileUpload` (advanced)

| Concern | Where | Mechanism |
|---|---|---|
| **Drop-zone role** | `KjFileUploadDropZone` host | `role="button"`, `tabindex="0"`, `aria-label` defaulting to *"Drag files here, or click to browse"* (overridable via `kjLabel` input). When a file count limit is set, the label includes it (*"Drag up to 5 files here, or click to browse"*). WCAG 4.1.2. |
| **Drop-zone keyboard** | host listener | Enter / Space on the drop-zone clicks the hidden `<input type="file">`. WCAG 2.1.1. The drop-zone *also* receives Escape to clear the current drag-active state if the user changes their mind (cosmetic). |
| **Drop-zone visual highlight** | `data-drag-active` | Reflects the dragenter / dragleave counter. Themes apply a background / border treatment. Color contrast at the highlighted state must hit AAA against the surrounding background (≥ 7:1 for any text inside, ≥ 3:1 for non-text border). WCAG 1.4.6 / 1.4.11. |
| **Hidden file input** | `<input type="file" hidden>` | CSS-hidden (`opacity: 0; position: absolute; inset: 0; pointer-events: none;` *while drop-zone has focus*, see [Open questions](#open-questions--risks) #2) — **not** `[hidden]` attribute (which removes from accessibility tree). Tab order: the drop-zone receives focus; the hidden input is skipped (`tabindex="-1"`). The drop-zone is the keyboard surface. |
| **File list role** | `[kjFileUploadList]` | `role="list"` (an `<ul>` already has this implicitly; the directive enforces it for a `<div>` consumer). Each row is `role="listitem"`. WCAG 1.3.1. |
| **File row labelling** | `[kjFileUploadItem]` | The row's accessible name is the **filename** (visually; if the filename is truncated, the full name is in `aria-label` on the row). The progress bar inside the row is *labelled by* the row (`aria-labelledby="row-id"`) so the SR announces *"thumbnail.png, uploading, 47%"* — not just *"47%"*. |
| **Progress** | per-file `<progress>` or `<div role="progressbar">` | `aria-valuenow` (0–100), `aria-valuemin="0"`, `aria-valuemax="100"`. When indeterminate (server is processing post-upload), `aria-valuenow` is omitted. Forward-reference: `feedback/progress-bar.md`. WCAG 4.1.2. |
| **Status announcements** | `KjLiveRegion` (already shipped) | The root provides an `aria-live="polite"` region. It announces: *"3 files added"* on multi-add, *"thumbnail.png removed"* on remove, *"thumbnail.png uploaded"* on success, *"thumbnail.png failed: file too large"* on error. Bulk actions: *"All uploads complete"*, *"5 of 7 files failed"*. WCAG 4.1.3. |
| **Error announcements per row** | row's status icon + label | Beyond the live-region announcement, the row carries `data-status="error"` and an icon with `aria-label="Upload failed"`. The error message text is rendered inline (visible) and `aria-describedby` from the row points to it, so re-focusing the row re-announces the error. |
| **Per-row controls** | `KjButton` | Retry / Cancel / Remove. Each has an explicit `aria-label` ("Retry upload of thumbnail.png", "Remove thumbnail.png from list"). The label includes the filename — generic *"Retry"* fails WCAG 2.4.6 / 2.5.3. |
| **Focus management on remove** | row removed → focus moves to next row, or back to drop-zone | Mirrors how list-row deletion is handled in the wider Angular Material / shadcn ecosystem. Without explicit focus management, Angular's DOM detachment leaves focus on `<body>` — keyboard users get dropped. Implement via `afterNextRender` after the structural removal. WCAG 2.4.3. |
| **Drag from outside the page** | native | The browser fires `dragenter` on `document.body` first. Our drop-zone only highlights when the drag is over its own host — that's correct. WCAG 2.5.7 (Dragging Movements, AAA) requires an alternative single-pointer mechanism — the click-to-browse path satisfies this. |
| **Reduced motion** | themes layer | Drop-zone hover / drag-active transitions and progress-bar animations must respect `prefers-reduced-motion: reduce`. WCAG 2.3.3. |
| **Touch target ≥ 44×44** | per-row controls | Retry / Cancel / Remove icon-buttons must hit the 44×44 floor. `KjButton kjSize="md"` (or `icon` with explicit min-size). WCAG 2.5.5. |
| **Color vs. status** | row `data-status` | Status is *not* conveyed by colour alone — each row has a status icon (success ✓ / error ✕ / spinner) with `aria-label`. WCAG 1.4.1. |

**Where each piece lives:**
- ARIA on the input itself (basic) → `KjFileInput` directive (and
  `KjFormControl` for `aria-invalid`).
- ARIA on the drop-zone → `KjFileUploadDropZone` directive.
- ARIA on the file list / rows → `KjFileUploadList` / `KjFileUploadItem`.
- Live-region announcements → `KjFileUpload` root, composing
  `KjLiveRegion`.
- Required / describedby / label-for → delegated to `KjField` (same as
  every other Data Input).

## Composition model

```text
file-upload/
  file-input.ts                 ← KjFileInput (directive on <input type="file">)
  file-upload.ts                ← KjFileUpload (root directive, holds context + value)
  file-upload-drop-zone.ts      ← KjFileUploadDropZone
  file-upload-list.ts           ← KjFileUploadList
  file-upload-item.ts           ← KjFileUploadItem
  file-upload.context.ts        ← KjFileUploadContext + KJ_FILE_UPLOAD + KjFileUploadItemContext + KJ_FILE_UPLOAD_ITEM
  file-upload.types.ts          ← KjUploadableFile / KjFileStatus / KjUploadEvent / KjFileUploadHandler / KjFileUploadValidationMessages
  drop-zone.ts                  ← inline drag-state primitive (extract candidate; see Decisions)
  file-input.spec.ts
  file-upload.spec.ts
  index.ts
```

The styled wrappers live under `packages/components/src/file-input/`
and `packages/components/src/file-upload/` and render the visible
toolbar / list / row markup with theme CSS.

### `KjFileInput` (basic)

```ts
@Directive({
  selector: 'input[type=file][kjFileInput]',
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize,    inputs: ['kjSize'] },
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFocusRing,
    KjFormControl,
  ],
  host: {
    '[attr.accept]':   'kjAccept() || null',
    '[attr.multiple]': 'kjMultiple() ? "" : null',
    '[attr.aria-invalid]': 'formCtrl.touched() && kjInvalid() ? "true" : null',
    '[attr.data-invalid]': 'formCtrl.touched() && kjInvalid() ? "" : null',
    '(change)': 'onChange($event)',
    '(blur)':   'formCtrl.notifyTouched()',
  },
})
export class KjFileInput { /* … */ }
```

Inputs:

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjAccept` | `input` | `string \| undefined` | `undefined` | MIME / extension list (e.g. `'image/*,.pdf'`). |
| `kjMultiple` | `input` | `boolean` | `false` | When `true`, value type is `File[]`. |
| `kjMaxSize` | `input` | `number \| undefined` | `undefined` | Bytes per file. Failed files are *omitted* from the value and `change` emits with the surviving files; rejected files surface via the `kjReject` output. |
| `kjMaxFiles` | `input` | `number \| undefined` | `undefined` | Cap on multiple. Same reject behaviour. |
| `kjInvalid` | `input` | `boolean` | `false` | Same as `KjInput.kjInvalid`. |
| `kjDisabled` | forwarded to `KjDisabled` | `boolean` | `false` | |
| `kjVariant` | forwarded | preset | from `KJ_FILE_INPUT_CONFIG` | |
| `kjSize` | forwarded | preset | from `KJ_FILE_INPUT_CONFIG` | |

Outputs:

| Name | Kind | Type | Notes |
|---|---|---|---|
| `kjReject` | `output<KjFileRejection[]>` | `[{ file: File; reason: 'size' \| 'type' \| 'count' }]` | Emitted on selection when files were filtered out. Allows the consumer to surface a hint / toast without subscribing to the value. |

Value plumbing: `KjFormControl.notifyChange(file | files | null)`.
On `multiple`, value is `File[]` (always — empty array, not null, when
the user opens the picker and cancels). On single, value is `File` or
`null` (cleared). The value flow is one-way out — programmatic value
*reset* clears the input; programmatic value *set* to a `File` object
**does not** populate the native picker (browsers prevent this for
security). See [Open questions](#open-questions--risks) #1.

### `KjFileUpload` (advanced)

```ts
@Directive({
  selector: '[kjFileUpload]',
  providers: [{ provide: KJ_FILE_UPLOAD, useExisting: KjFileUpload }],
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize,    inputs: ['kjSize'] },
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFormControl,           // the value is File[] (or File when !multiple)
    KjLiveRegion,            // announcement region
  ],
  host: {
    '[attr.data-disabled]': 'kjDisabled() ? "" : null',
    '[attr.data-status]':   'aggregateStatus()',  // 'idle'|'pending'|'uploading'|'complete'|'partial-error'
  },
})
export class KjFileUpload implements KjFileUploadContext { /* … */ }
```

Inputs:

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjAccept` | `input` | `string \| undefined` | `undefined` | Same as basic. |
| `kjMultiple` | `input` | `boolean` | `true` | Default `true` for advanced (the typical use-case). |
| `kjMaxSize` | `input` | `number \| undefined` | `undefined` | Bytes per file. |
| `kjMaxFiles` | `input` | `number \| undefined` | `undefined` | Total cap on the list. |
| `kjAuto` | `input` | `boolean` | `false` | Auto-call the handler on selection. |
| `kjUploadHandler` | `input` | `KjFileUploadHandler \| undefined` | `undefined` | When `undefined`, the component is selection-only — no upload buttons render. |
| `kjValidationMessages` | `input` | `Partial<KjFileUploadValidationMessages>` | (built-in, locale-neutral English) | Per-reason message map. |
| `kjAnnouncements` | `input` | `Partial<KjFileUploadAnnouncements>` | (built-in) | Live-region message templates (`'{n} files added'`, etc.). Locale opt-in. |
| `kjInvalid` | `input` | `boolean` | `false` | |
| `kjDisabled` | forwarded | `boolean` | `false` | |

Outputs:

| Name | Kind | Type | Notes |
|---|---|---|---|
| `kjSelect` | `output<File[]>` | Files newly selected this interaction (after validation filtering). |
| `kjReject` | `output<KjFileRejection[]>` | Same as basic. |
| `kjUploadStart` | `output<KjUploadableFile>` | Per-file. |
| `kjUploadProgress` | `output<{ file: KjUploadableFile; loaded: number; total: number }>` | Per-file. |
| `kjUploadSuccess` | `output<{ file: KjUploadableFile; response?: unknown }>` | Per-file. |
| `kjUploadError` | `output<{ file: KjUploadableFile; message: string }>` | Per-file. |
| `kjAllComplete` | `output<{ ok: KjUploadableFile[]; failed: KjUploadableFile[] }>` | Fires once when no `pending`/`uploading` files remain. |
| `kjRemove` | `output<KjUploadableFile>` | When the user removes a file from the list (pre- or post-upload). |

Models: none on the directive — value flows through the host
`KjFormControl` (`File[]` model). Per-file *progress* is read via the
context, not via a model.

### `KjFileUploadDropZone`

```ts
@Directive({
  selector: '[kjFileUploadDropZone]',
  host: {
    'role': 'button',
    'tabindex': '0',
    '[attr.aria-label]':   'kjLabel()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.data-drag-active]': 'dragActive() ? "" : null',
    '(dragenter)': 'onDragEnter($event)',
    '(dragover)':  'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)':      'onDrop($event)',
    '(click)':     'openPicker()',
    '(keydown.enter)': 'openPicker(); $event.preventDefault()',
    '(keydown.space)': 'openPicker(); $event.preventDefault()',
  },
})
export class KjFileUploadDropZone { /* … */ }
```

Input:

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjLabel` | `input` | `string` | `'Drag files here, or click to browse'` | Locale opt-in. |

### `KjFileUploadList` and `KjFileUploadItem`

`KjFileUploadList` is a structural-light directive: it iterates
`ctx.files()` and renders a child for each via `*ngFor`-equivalent
template (`@for (file of ctx.files(); track file.id)`), or — if the
consumer has projected a custom `<ng-template kjFileUploadItemTemplate let-file>` —
uses that. Falls back to a default row layout in the styled wrapper.

`KjFileUploadItem` provides per-row context:

```ts
export interface KjFileUploadItemContext {
  readonly file: Signal<KjUploadableFile>;
  readonly progress: Signal<number | null>; // 0..100 or null (indeterminate / not started)
  readonly status: Signal<KjFileStatus>;
  retry(): void;
  cancel(): void;
  remove(): void;
}
export const KJ_FILE_UPLOAD_ITEM = new InjectionToken<KjFileUploadItemContext>('KjFileUploadItem');
```

Per-row buttons are wired by the consumer (or by the styled wrapper)
to `ctx.retry()` / `ctx.cancel()` / `ctx.remove()`.

### Cross-component pointers

- **`data-input/input.md`** — `KjFileInput` reuses the `KjInput`
  composition shape (`KjFormControl` + `KjFocusRing` + `KjDisabled` +
  `KjVariant` + `KjSize`) but with `<input type="file">`-specific value
  semantics. The "value reflection from form-model → DOM" effect that
  `KjInput` carries is **explicitly disabled** for file inputs (browser
  security: programmatic `.value` set is rejected for `type="file"`).
- **`data-input/field.md`** — `KjField` wraps both basic and advanced.
  In advanced, the registered control is the **drop-zone host** (the
  thing that carries `aria-labelledby`), not the hidden `<input>`. The
  field's hint text ("PNG / JPG up to 5 MB") is the one place
  validation rules belong; don't duplicate them inside the drop-zone
  label. The describedby chain flows onto the drop-zone, so per-file
  rejection messages can surface as `KjFieldError` blocks.
- **`data-input/form.md`** — `KjFileUpload` participates in
  reactive forms: bind `[formControl]="files"` to the root, value is
  `File[]`. Async validators that hit the server (e.g., scan-for-virus)
  compose normally. The form's `submit` does *not* trigger uploads —
  the consumer decides whether `kjAuto="true"` (upload-on-pick) or
  `submit` triggers a programmatic `uploadAll()` via the context.
- **`actions/button.md`** — every button in both flavours
  (browse / upload-all / cancel-all / per-row retry / per-row cancel /
  per-row remove) is a `KjButton`. Per-row icon-only buttons use
  `KjButton kjVariant="ghost" kjSize="icon"`; bulk actions use
  `kjVariant="default"` (upload) and `kjVariant="ghost"` (cancel).
- **`feedback/progress-bar.md` (forward-reference)** — per-row
  progress bars consume `KjFileUploadItemContext.progress`. The
  progress bar is responsible for `role="progressbar"` /
  `aria-valuenow` / indeterminate handling; `KjFileUpload` doesn't
  duplicate that. Until `KjProgressBar` ships, the advanced wrapper
  uses a native `<progress>` with `aria-labelledby` to the row id.
- **`a11y/live-region.ts`** (`KjLiveRegion`, already shipped) —
  composed via `hostDirectives` on `KjFileUpload`. Announcement
  templates live on the root's `kjAnnouncements` input.
- **Future `KjDragDrop` primitive** — the drop-zone's drag-state
  logic is *currently inlined* into `KjFileUploadDropZone` (or a tiny
  `drop-zone.ts` helper in the same folder). When a second consumer
  appears, extract to `packages/core/src/primitives/interaction/drop-zone.ts`.
  Document as an **extract candidate** in the source.

## Inputs / Outputs / Models — `kj`-prefixed

All names are `kj`-prefixed per `rules/code_style.md`. Tabular surfaces
are listed under each directive in [Composition model](#composition-model)
above. Summary:

- **`KjFileInput`** — inputs: `kjAccept`, `kjMultiple`, `kjMaxSize`,
  `kjMaxFiles`, `kjInvalid`, `kjDisabled`, `kjVariant`, `kjSize`.
  Outputs: `kjReject`. Value flows through `KjFormControl`.
- **`KjFileUpload`** — inputs: `kjAccept`, `kjMultiple` (default
  `true`), `kjMaxSize`, `kjMaxFiles`, `kjAuto`, `kjUploadHandler`,
  `kjValidationMessages`, `kjAnnouncements`, `kjInvalid`,
  `kjDisabled`, `kjVariant`, `kjSize`. Outputs: `kjSelect`,
  `kjReject`, `kjUploadStart`, `kjUploadProgress`, `kjUploadSuccess`,
  `kjUploadError`, `kjAllComplete`, `kjRemove`. Value flows through
  `KjFormControl` (`File[]`).
- **`KjFileUploadDropZone`** — input: `kjLabel`.
- **`KjFileUploadList`** — no inputs; iterates context.
- **`KjFileUploadItem`** — no inputs; provides per-row context.

Following shape (A) from `rules/code_style.md` (property name carries
the prefix) for all directives.

### Preset config tokens

Mirroring `KJ_BUTTON_CONFIG` / `KJ_INPUT_CONFIG`:

```ts
KJ_FILE_INPUT_DEFAULTS = {
  variants: ['default', 'filled', 'ghost', 'destructive'],
  sizes:    ['sm', 'md', 'lg'],
  defaults: { variant: 'default', size: 'md' },
};

KJ_FILE_UPLOAD_DEFAULTS = {
  variants: ['default', 'bordered', 'ghost'],
  sizes:    ['sm', 'md', 'lg'],
  defaults: { variant: 'default', size: 'md' },
};
```

Plus `provideKjFileInput()` / `provideKjFileUpload()` helpers.

## Examples to ship

Files under `packages/components/src/file-input/` and
`packages/components/src/file-upload/`:

### `KjFileInput` (basic)

1. **Default** — `file-input.example.ts`. Single file, no validation,
   no field wrapper. The "just give me a styled file input" demo.
2. **Multiple + accept** — `file-input.multiple.example.ts`. Image-only,
   multiple files, with file-count readout in the wrapper.
3. **In a field** — `file-input.field.example.ts`. Wrapped in
   `<div kjField>` with a `<label kjFieldLabel>Avatar</label>` and a
   `<span kjFieldHint>PNG or JPG, up to 5 MB</span>`. Demonstrates
   `aria-describedby` flow.
4. **Reactive form** — `file-input.reactive.example.ts`.
   `[formControl]="avatar"` with `Validators.required` + a custom
   `maxSizeValidator`. Error rendered via `KjFieldError`.
5. **Sizes** — `file-input.sizes.example.ts`. `sm` / `md` / `lg`
   side-by-side; demonstrates `KjSize` integration.
6. **Variants** — `file-input.variants.example.ts`.

### `KjFileUpload` (advanced)

1. **Default (selection-only)** — `file-upload.example.ts`. No handler
   provided; the component is a drop-zone + list + remove buttons.
   Submit the form to actually upload (consumer handles in `onSubmit`).
2. **With `HttpClient` handler** — `file-upload.http.example.ts`. The
   canonical "upload to a server" demo. `kjUploadHandler` returns
   `httpClient.request('POST', url, ...).pipe(map(event → KjUploadEvent))`.
   `kjAuto="true"`. Per-row progress, success, error.
3. **Manual upload trigger** — `file-upload.manual.example.ts`. Same
   handler but `kjAuto="false"`. The toolbar's "Upload all" button
   calls `ctx.uploadAll()` programmatically.
4. **Image gallery (preview)** — `file-upload.gallery.example.ts`.
   Custom `kjFileUploadItemTemplate` renders thumbnails (using
   `URL.createObjectURL(file.file)` cleaned up on remove).
5. **Validation** — `file-upload.validation.example.ts`.
   `kjAccept="image/*"`, `kjMaxSize="5_000_000"`, `kjMaxFiles="3"`.
   Demonstrates `kjReject` rendering as a transient hint.
6. **Custom messages** — `file-upload.localized.example.ts`. Provides
   `kjValidationMessages` and `kjAnnouncements` in French. Shows the
   live-region announcements via a visible debug pane.
7. **In a field** — `file-upload.field.example.ts`. Wrapped in
   `<div kjField>`; the registered control is the drop-zone.
   Hint and error wiring exercised.
8. **Reactive form** — `file-upload.reactive.example.ts`.
   `[formControl]="files"` with `Validators.required` (i.e. at least
   one file) and a custom async validator (server-side virus scan).
9. **Disabled** — `file-upload.disabled.example.ts`. `[kjDisabled]`
   propagates: drop-zone is `aria-disabled="true"`, picker doesn't
   open, drop is rejected, per-row remove buttons are disabled.
10. **Themed (core-only)** — `file-upload.example.ts`,
    `file-upload.retro.example.ts`, `file-upload.finance.example.ts`
    under `packages/core/src/file-upload/`. Demonstrates the headless
    directives drive arbitrary themes.

## Open questions / risks

1. **Programmatic value setting on `<input type="file">`.** Browsers
   reject `inputEl.value = '...'` for security (only the empty string
   is accepted, to clear). `KjFormControl`'s value-reflection effect
   for `KjInput` writes the form value back to the DOM; for
   `KjFileInput` this *cannot work* and will log to console. The
   `KjFileInput` directive must override / opt out of the reflection
   effect — recommended: a flag on `KjFormControl` (`reflectsValue: boolean`,
   default `true`) that the file directive sets to `false`. Document
   the divergence from `KjInput`. **Decision: opt-out flag on
   `KjFormControl`, applied by `KjFileInput`'s host directive
   composition.**

2. **Hidden file input — `[hidden]` attribute vs. visually-hidden CSS.**
   The hidden `<input type="file">` inside `KjFileUpload` must remain
   in the accessibility tree (so `<label for>` works, and so the
   drop-zone's programmatic `.click()` actually opens a file picker
   the SR announces as "select file"). Use visually-hidden CSS
   (`opacity: 0; width: 1px; height: 1px; position: absolute; pointer-events: none;`)
   with `tabindex="-1"`. **Not** the `hidden` attribute (which removes
   from the a11y tree and may not respond to programmatic click in some
   browsers). Document.

3. **Drop-zone `role="button"` on a `<div>` vs. wrapping a `<button>`.**
   The simpler path is `<button kjFileUploadDropZone>`, which gets
   role / focus / Enter / Space for free. But: `<button>` cannot
   contain block-level children (e.g. a thumbnail grid), and the
   drop-zone *needs* to host arbitrary content. **Decision: stick
   with `<div role="button" tabindex="0">` and wire Enter/Space
   manually**, because the content is unconstrained. WCAG 4.1.2 is
   satisfied either way; HTML semantic purity loses to layout
   freedom.

4. **`accept` attribute does not validate drop.** The browser only
   filters the *picker* by the `accept` MIME / extension list —
   dropping a `.exe` onto a zone with `accept="image/*"` is **not**
   rejected by the browser. We must validate `file.type` (and / or
   extension) on drop, in `onDrop`. Built-in. Document loudly — the
   most common drop-zone bug in the wild is "I set accept and assumed
   it filtered drops".

5. **`File.type` is unreliable.** Browsers fill `file.type` from a
   small set of known MIME-types based on extension; weird
   extensions (`.heic`, `.webp` on older browsers, `.flac`) come
   through as `''`. When `kjAccept` is set and `file.type` is empty,
   fall back to extension matching (parse the trailing `.ext` from
   `file.name`). Document.

6. **i18n of value-text readout / validation messages / announcements.**
   `KjFileInput`'s wrapper renders "No file selected" / "{n} files".
   `KjFileUpload`'s built-in messages and live-region announcements are
   English. Three options:
   (a) Hard-code English; consumers override via the per-input maps
       (`kjValidationMessages`, `kjAnnouncements`) and a per-wrapper
       `kjEmptyLabel` / `kjFileCountLabel`.
   (b) Inject an i18n token (`KJ_FILE_UPLOAD_I18N`) with the full
       message set, providing a `provideKjFileUploadI18n(en | fr | …)`.
   (c) Defer to Angular's built-in `$localize`.
   **Recommendation: (a) + (b).** Per-instance overrides for one-offs;
   global token for "set the whole library to French". Match the
   pattern future Date Picker / OTP Input will need.

7. **Memory for `URL.createObjectURL` previews.** When the consumer
   renders thumbnails via `URL.createObjectURL`, the URLs must be
   `URL.revokeObjectURL`'d on remove / destroy or memory leaks. Don't
   ship preview rendering in core — but document this caveat in the
   gallery example so consumers don't ship the leak.

8. **Drop-zone behaviour while a file is currently uploading.**
   Accept new drops (queue them after the current uploads)? Reject
   them (drop-zone shows `data-drag-disabled`)? **Recommendation:
   accept by default**, with a `kjAcceptWhileUploading` input
   (default `true`) for consumers who want a serial pipeline.

9. **Cancel semantics.** `cancel()` on an in-flight upload must
   *abort the request* (so we don't waste server bandwidth) and
   set `status: 'cancelled'`. The `Observable<KjUploadEvent>` from
   the consumer's handler must respect unsubscribe — `HttpClient` does
   (it aborts the XHR); `fetch`-based handlers need an
   `AbortController` plumbed through. Document the contract: "the
   handler observable must abort the request on unsubscribe". A
   helper `kjFileUploadHttpClient(http)` factory ships with the
   wrapper that does this correctly for `HttpClient`.

10. **Retry semantics.** `retry()` re-invokes the handler with the
    same `KjUploadableFile` (preserving `id`), resetting `status`
    to `pending` → `uploading`. The handler should be idempotent
    server-side (or content-hash addressed). Document.

11. **Validation message vs. form-validator error.** `kjMaxSize`
    fails files at *selection* (filtered out, surfaced via
    `kjReject`), but Angular forms might *also* run a `maxSize`
    `Validator`. Pick one source of truth — recommend
    **directive-side validation** (so the consumer doesn't have to
    re-implement it as a `Validator`), with the rejected files
    surfaced via `kjReject` for hint / toast rendering. The form
    value never includes rejected files.

12. **Submitting via `<form>` with a `multipart/form-data` encoding.**
    The native `<form>` POST will work for `KjFileInput` (selected
    files are part of the form). For `KjFileUpload` *without* a
    handler, the file list is the form value (`File[]`); the consumer
    builds `FormData` manually in `onSubmit`. Document.

13. **Drag-drop primitive scope creep.** Sortable lists, kanban
    boards, and image-rearrangement want a fuller `KjDragDrop`. Do
    *not* let `KjFileUpload` block on it — extract `drop-zone` only
    when a second consumer appears. See [Decision: drag-and-drop
    primitive](#decision-drag-and-drop-primitive).

14. **SSR.** Drop-zone listeners (`dragenter` etc.) only attach in
    the browser — guard via `isPlatformBrowser` or attach in
    `afterNextRender`. `KjLiveRegion` is already SSR-safe. The
    hidden `<input>` renders fine on the server (no value to write
    back). `URL.createObjectURL` is browser-only — gallery preview
    rendering must guard.

15. **`KjLiveRegion` plurality and rate-limiting.** Drag-dropping
    50 files at once should announce *"50 files added"*, not 50
    individual *"file added"* messages. Coalesce per-microtask into
    a single announcement. Same for `kjAllComplete` — the
    aggregate announcement supersedes per-file completion
    announcements when more than ~3 files complete in quick
    succession. Document the coalescing window (recommended: 250 ms).

16. **Form `setDisabledState` and the drop-zone.** When the bound
    form sets the control disabled, the *drop-zone* must update —
    not just the hidden input. The host context's `disabled()`
    signal feeds both. Test: bind a `[formControl]` with `.disable()`
    called externally; the drop-zone reflects `aria-disabled="true"`,
    Enter / Space no-ops, drop is rejected.

17. **Field-side composite control registration (for advanced).** Per
    `field.md` open question #2, the registered control is the
    drop-zone host (so the field's `<label for>` association uses
    `aria-labelledby` against the drop-zone, not against the hidden
    `<input>`). Confirm `KjFieldLabel`'s auto-detection of the
    composite shape — likely needs `kjFieldLabelMode="aria-labelledby"`
    set explicitly on the label, or the registration call passes a
    `controlType: 'composite'` flag the field reads. Document under
    Field's open question #2 follow-up.

18. **`KjFormControl` value type for files.** `KjFormControl` types
    `value` as `unknown`. Existing consumers use `string`. For file
    inputs, value is `File | File[] | null`. Either widen the
    primitive's generic or document the cast. **Recommendation:**
    make `KjFormControl` generic-on-value (`KjFormControl<T = unknown>`)
    in a follow-up, defaulting `T` to `unknown`; per-control
    directives narrow (`KjInput` uses `string`, `KjFileInput` uses
    `File | File[] | null`, etc.). Defer the breaking change; for
    now, cast in the directive and document.

19. **Input `type="file"` loses native styling completely under
    `accept`.** Some browsers (Safari) render the picker button text
    as "Choose File" / "Choose Files" with no override. The wrapper
    component bypasses this by hiding the input and rendering a
    `KjButton`-styled `<label>`. The directive-only path (consumer
    uses `<input type="file" kjFileInput>` directly) inherits the
    browser's awkward button. Document; recommend the wrapper for
    user-facing UI.

20. **Touch-device drag-drop.** Mobile Safari / Chrome on iOS do
    **not** fire HTML5 drag events for files dragged from elsewhere.
    The drop-zone is desktop-only as a drag target; on mobile, the
    click-to-browse path is the only path (which is fine — WCAG
    2.5.7 AAA requires the alternative). Document.
