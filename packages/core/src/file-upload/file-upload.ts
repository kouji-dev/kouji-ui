import {
  Directive,
  ElementRef,
  EventEmitter,
  Output,
  Signal,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  KJ_FILE_UPLOAD,
  KJ_FILE_UPLOAD_ITEM,
  KjFileUploadAggregateStatus,
  KjFileUploadContext,
  KjFileUploadItemContext,
} from './file-upload.context';
import {
  KJ_FILE_UPLOAD_DEFAULT_MESSAGES,
  KjFileRejection,
  KjFileStatus,
  KjFileUploadValidationMessages,
  KjUploadableFile,
} from './file-upload.types';

let kjFileUploadIdCounter = 0;
function nextFileId(): string {
  const cryptoLike = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoLike?.randomUUID) return `kjf-${cryptoLike.randomUUID().slice(0, 8)}`;
  return `kjf-${(++kjFileUploadIdCounter).toString(36)}`;
}

/**
 * Validates a single `File` against the configured `accept` / `maxSize`
 * constraints. Returns the rejection reason, or `null` if the file passes.
 *
 * `accept` matching follows the WHATWG file picker rules: a comma-separated
 * list of MIME types (`image/*`, `application/pdf`) or extensions
 * (`.pdf`, `.heic`). When `file.type` is empty (browsers don't report a MIME
 * type for some extensions, e.g. `.heic`), we fall back to extension
 * matching against `file.name`.
 *
 * @internal
 */
export function kjFileMatchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const tokens = accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (!tokens.length) return true;
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  for (const tok of tokens) {
    if (tok.startsWith('.')) {
      if (name.endsWith(tok)) return true;
    } else if (tok.endsWith('/*')) {
      const prefix = tok.slice(0, -1); // keep the trailing slash
      if (type.startsWith(prefix)) return true;
    } else if (type && tok === type) {
      return true;
    }
  }
  return false;
}

/**
 * Root file-upload directive. Owns the file list, drag state, and selection
 * validation (`accept` / `maxSize` / `maxFiles`). Provides `KJ_FILE_UPLOAD`
 * for child directives (trigger, drop-zone, list, item).
 *
 * The transport is the consumer's job — `KjFileUpload` ships the *state
 * machine* and emits structured events. Examples call `setFileStatus` from
 * a simulated upload to drive `KjProgressBar` per row.
 *
 * The directive owns a visually-hidden `aria-live="polite"` span (mounted
 * as a child of the host on first render) that announces file additions,
 * removals, completions, and errors to screen readers (WCAG 4.1.3). The
 * announcement node is intentionally NOT the host element itself — clearing
 * `host.textContent` to retrigger SR readout would also wipe out the
 * projected drop-zone / list children, so we keep the live region as a
 * dedicated sibling.
 *
 * @example
 * ```html
 * <div kjFileUpload kjAccept="image/*" [kjMaxSize]="5_000_000">
 *   <button kjFileUploadTrigger>Choose files</button>
 *   <div kjFileUploadDropzone>Drop files here</div>
 *   <ul kjFileUploadList>
 *     @for (f of upload.files(); track f.id) {
 *       <li kjFileUploadItem [kjFile]="f">{{ f.file.name }}</li>
 *     }
 *   </ul>
 * </div>
 * ```
 * @doc-category Core/Data input
 * @doc
 * @doc-name file-upload
 * @doc-description Manages file selection, drag state, and validation while you control the upload transport.
 * @doc-is-main
 */
@Directive({
  selector: '[kjFileUpload]',
  standalone: true,
  exportAs: 'kjFileUpload',
  providers: [{ provide: KJ_FILE_UPLOAD, useExisting: KjFileUpload }],
  host: {
    '[attr.data-disabled]': 'kjDisabled() ? "" : null',
    '[attr.data-drag-active]': 'dragActive() ? "" : null',
    '[attr.data-status]': 'aggregateStatus()',
  },
})
export class KjFileUpload implements KjFileUploadContext {
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private liveRegionEl: HTMLElement | null = null;

  /** MIME / extension list for the file picker and drop validation. */
  readonly kjAccept = input<string | undefined>(undefined);

  /** Whether multiple files may be selected. Defaults to `true` (advanced flavour). */
  readonly kjMultiple = input(true, { transform: booleanAttribute });

  /** Maximum bytes per file. Files over the cap are rejected at selection. */
  readonly kjMaxSize = input<number | undefined>(undefined);

  /** Maximum total file count across the list. Excess files are rejected. */
  readonly kjMaxFiles = input<number | undefined>(undefined);

  /** Disables the upload — drop-zone is `aria-disabled`, the trigger is inert. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** Per-rejection-reason override messages. */
  readonly kjValidationMessages = input<Partial<KjFileUploadValidationMessages>>({});

  /** Emits the survivors after validation each time the user adds files. */
  @Output() readonly kjSelect = new EventEmitter<File[]>();

  /** Emits the rejection list whenever validation filters files out. */
  @Output() readonly kjReject = new EventEmitter<KjFileRejection[]>();

  /** Emits the `KjUploadableFile` for each row the user removes. */
  @Output() readonly kjRemove = new EventEmitter<KjUploadableFile>();

  private readonly _files = signal<readonly KjUploadableFile[]>([]);
  /** Current file list (in selection order). */
  readonly files: Signal<readonly KjUploadableFile[]> = this._files.asReadonly();

  private readonly _dragActive = signal(false);
  /** True while at least one drag operation is currently over the drop-zone host. */
  readonly dragActive: Signal<boolean> = this._dragActive.asReadonly();

  /** Read-only mirror of the disabled flag for context consumers. */
  readonly disabled: Signal<boolean> = this.kjDisabled;
  readonly multiple: Signal<boolean> = this.kjMultiple;
  readonly accept: Signal<string | undefined> = this.kjAccept;
  readonly maxSize: Signal<number | undefined> = this.kjMaxSize;
  readonly maxFiles: Signal<number | undefined> = this.kjMaxFiles;

  /** Aggregate status across the file list. */
  readonly aggregateStatus = computed<KjFileUploadAggregateStatus>(() => {
    const list = this._files();
    if (!list.length) return 'idle';
    let hasUploading = false;
    let hasPending = false;
    let hasError = false;
    let allDone = true;
    for (const f of list) {
      if (f.status === 'uploading') hasUploading = true;
      if (f.status === 'pending' || f.status === 'preparing') hasPending = true;
      if (f.status === 'error') hasError = true;
      if (f.status !== 'done') allDone = false;
    }
    if (hasUploading) return 'uploading';
    if (allDone) return 'complete';
    if (hasError && !hasPending) return 'partial-error';
    return 'pending';
  });

  /** @internal Drag-enter / drag-leave counter — flips `_dragActive` cleanly across nested children. */
  private dragDepth = 0;

  /** @internal Set by the trigger / drop-zone so `openPicker()` can click the right input. */
  private pickerInput: HTMLInputElement | null = null;

  /** @internal Trigger / drop-zone register their hidden file input here. */
  registerPickerInput(el: HTMLInputElement): void {
    this.pickerInput = el;
  }

  /** Opens the native file picker by clicking the registered hidden input. */
  openPicker(): void {
    if (this.kjDisabled()) return;
    this.pickerInput?.click();
  }

  /**
   * Adds candidate files (from drop, programmatic add, or the picker's
   * `change` event). Validates each against `accept` / `maxSize`, then
   * applies the `kjMaxFiles` cap to the survivors. Mints ids, appends to
   * the list, fires `kjSelect` / `kjReject`, and announces.
   */
  addFiles(incoming: readonly File[] | FileList): void {
    if (this.kjDisabled()) return;
    const candidates: File[] = Array.from(incoming);
    if (!candidates.length) return;

    const accept = this.kjAccept();
    const maxSize = this.kjMaxSize();
    const maxFiles = this.kjMaxFiles();
    const messages = this.resolvedMessages();

    const survivors: File[] = [];
    const rejections: KjFileRejection[] = [];

    for (const file of candidates) {
      if (accept && !kjFileMatchesAccept(file, accept)) {
        rejections.push({ file, reason: 'type' });
        continue;
      }
      if (maxSize !== undefined && file.size > maxSize) {
        rejections.push({ file, reason: 'size' });
        continue;
      }
      survivors.push(file);
    }

    // In single mode, the most recent pick replaces any existing file. Cap
    // the survivors to 1 (rejecting any overflow with reason 'count'), then
    // clear the existing list so the survivor takes its place.
    if (!this.kjMultiple()) {
      if (survivors.length > 1) {
        const overflow = survivors.splice(1);
        for (const f of overflow) rejections.push({ file: f, reason: 'count' });
      }
      if (survivors.length) this._files.set([]);
    } else if (maxFiles !== undefined) {
      // Multi mode: the explicit `kjMaxFiles` cap applies to current + new.
      const current = this._files().length;
      if (current + survivors.length > maxFiles) {
        const allowed = Math.max(0, maxFiles - current);
        const overflow = survivors.splice(allowed);
        for (const f of overflow) rejections.push({ file: f, reason: 'count' });
      }
    }

    if (survivors.length) {
      const next: KjUploadableFile[] = survivors.map((f) => ({
        id: nextFileId(),
        file: f,
        status: 'pending' as const,
        progress: null,
      }));
      this._files.update((list) => [...list, ...next]);
      this.kjSelect.emit(survivors);
      this.announce(
        survivors.length === 1
          ? `${survivors[0].name} added`
          : `${survivors.length} files added`,
      );
    }

    if (rejections.length) {
      this.kjReject.emit(rejections);
      const reason = rejections[0].reason;
      const msg = messages[reason];
      this.announce(
        rejections.length === 1
          ? `${rejections[0].file.name} rejected: ${msg}`
          : `${rejections.length} files rejected: ${msg}`,
      );
    }
  }

  /** Remove a file by id. Cancels in-flight uploads, emits `kjRemove`. */
  remove(id: string): void {
    const target = this._files().find((f) => f.id === id);
    if (!target) return;
    this._files.update((list) => list.filter((f) => f.id !== id));
    this.kjRemove.emit(target);
    this.announce(`${target.file.name} removed`);
  }

  /** Clear the entire file list. */
  clear(): void {
    if (!this._files().length) return;
    this._files.set([]);
    this.announce('File list cleared');
  }

  /** Reset a row to `pending` so the consumer (or simulator) can re-run it. */
  retry(id: string): void {
    this.patchFile(id, { status: 'pending', progress: null, error: undefined });
  }

  /** Cancel an in-flight upload — sets `status: 'cancelled'`, clears progress. */
  cancel(id: string): void {
    this.patchFile(id, { status: 'cancelled', progress: null });
  }

  /**
   * Update a row's status / progress / error. Examples drive this from a
   * simulated upload; consumers wiring `HttpClient` call it from their
   * progress / success / error subscriptions.
   */
  setFileStatus(id: string, status: KjFileStatus, progress?: number | null, error?: string): void {
    this.patchFile(id, {
      status,
      progress: progress === undefined ? null : progress,
      error,
    });
    if (status === 'done') {
      const f = this._files().find((x) => x.id === id);
      if (f) this.announce(`${f.file.name} uploaded`);
    } else if (status === 'error') {
      const f = this._files().find((x) => x.id === id);
      if (f) this.announce(`${f.file.name} failed: ${error ?? 'upload error'}`);
    }
  }

  // ─── Drag state plumbing (called by KjFileUploadDropzone) ───

  /** @internal */
  onDragEnter(event: Event): void {
    if (this.kjDisabled()) return;
    if (!this.eventCarriesFiles(event)) return;
    event.preventDefault();
    this.dragDepth++;
    this._dragActive.set(true);
  }

  /** @internal */
  onDragOver(event: Event): void {
    if (this.kjDisabled()) return;
    if (!this.eventCarriesFiles(event)) return;
    event.preventDefault();
  }

  /** @internal */
  onDragLeave(event: Event): void {
    if (this.kjDisabled()) return;
    event.preventDefault();
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) this._dragActive.set(false);
  }

  /** @internal */
  onDrop(event: Event): void {
    event.preventDefault();
    this.dragDepth = 0;
    this._dragActive.set(false);
    if (this.kjDisabled()) return;
    const files = (event as DragEvent).dataTransfer?.files;
    if (!files || files.length === 0) return;
    this.addFiles(files);
  }

  /** @internal */
  onPickerChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files) this.addFiles(target.files);
    // Reset so picking the same file twice fires another change event.
    target.value = '';
  }

  private eventCarriesFiles(event: Event): boolean {
    const types = (event as DragEvent).dataTransfer?.types;
    if (!types) return false;
    for (let i = 0; i < types.length; i++) {
      if (types[i] === 'Files') return true;
    }
    return false;
  }

  private patchFile(id: string, patch: Partial<KjUploadableFile>): void {
    this._files.update((list) =>
      list.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  }

  private resolvedMessages(): KjFileUploadValidationMessages {
    return { ...KJ_FILE_UPLOAD_DEFAULT_MESSAGES, ...this.kjValidationMessages() };
  }

  private announce(message: string): void {
    const el = this.liveRegionEl;
    if (!el) return;
    // Clear-then-set with a microtask gap so screen readers detect the change
    // even when consecutive announcements share a prefix.
    el.textContent = '';
    setTimeout(() => {
      if (this.liveRegionEl) this.liveRegionEl.textContent = message;
    }, 50);
  }

  constructor() {
    afterNextRender(() => {
      if (typeof document === 'undefined') return;
      const span = document.createElement('span');
      span.setAttribute('aria-live', 'polite');
      span.setAttribute('aria-atomic', 'true');
      span.style.cssText =
        'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
      this.hostEl.nativeElement.appendChild(span);
      this.liveRegionEl = span;
    });
  }
}

/**
 * The "browse" button — when clicked, opens the native file picker. Owns the
 * hidden `<input type="file">` so consumers don't have to render one
 * themselves. Mirrors the `KjButton` keyboard contract (Enter / Space click
 * the host element).
 *
 * Use on a `<button>` (recommended, native keyboard semantics) or any
 * focusable element. The directive does **not** force `role="button"` — wrap
 * a real `<button>` and let the browser handle it.
 *
 * @example
 * ```html
 * <button kjFileUploadTrigger>Choose files</button>
 * ```
 * @doc-category Core/Data input
 * @doc
 * @doc-name file-upload
 */
@Directive({
  selector: '[kjFileUploadTrigger]',
  standalone: true,
  host: {
    'type': 'button',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '(click)': 'onClick($event)',
  },
})
export class KjFileUploadTrigger {
  /** @internal */
  readonly ctx = inject(KJ_FILE_UPLOAD);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private hidden!: HTMLInputElement;

  constructor() {
    // Mint and own a hidden `<input type="file">` parked in the trigger's
    // host element. Visually hidden (not [hidden] attribute) so it stays in
    // the a11y tree and programmatic .click() opens the picker reliably
    // across browsers (analysis open-question #2).
    if (typeof document !== 'undefined') {
      this.hidden = document.createElement('input');
      this.hidden.type = 'file';
      this.hidden.tabIndex = -1;
      this.hidden.setAttribute('aria-hidden', 'true');
      this.hidden.style.cssText =
        'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
      this.hidden.addEventListener('change', (event) => this.ctx.onPickerChange(event));
      this.syncAttrs();
      // Mirror dynamic accept / multiple onto the hidden input.
      // computed-via-effect would also work; for a deliberately small surface
      // we re-sync on every click (cheap).
      this.el.nativeElement.appendChild(this.hidden);
      this.ctx.registerPickerInput(this.hidden);
    }
  }

  /** @internal */
  onClick(event: Event): void {
    if (this.ctx.disabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.syncAttrs();
    this.hidden?.click();
  }

  private syncAttrs(): void {
    if (!this.hidden) return;
    const accept = this.ctx.accept();
    if (accept) this.hidden.setAttribute('accept', accept);
    else this.hidden.removeAttribute('accept');
    if (this.ctx.multiple()) this.hidden.setAttribute('multiple', '');
    else this.hidden.removeAttribute('multiple');
  }
}

/**
 * Drag-and-drop surface. `role="button"`, `tabindex="0"`, Enter/Space open
 * the picker. Reflects `data-drag-active` while files are over the host so
 * theme CSS can style the highlighted state.
 *
 * The drop-zone wires drag enter / over / leave / drop into the root's
 * counter (so nested children don't churn `data-drag-active`). The host is
 * a generic `<div>`-shaped element so consumers can project arbitrary
 * content (thumbnail grid, instructional text, etc.) — analysis decision
 * #3 in `file-upload.md`.
 *
 * @example
 * ```html
 * <div kjFileUploadDropzone>
 *   Drag files here, or click to browse
 * </div>
 * ```
 * @doc-category Core/Data input
 * @doc
 * @doc-name file-upload
 */
@Directive({
  selector: '[kjFileUploadDropzone]',
  standalone: true,
  host: {
    'role': 'button',
    'tabindex': '0',
    '[attr.aria-label]': 'kjLabel()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.data-drag-active]': 'ctx.dragActive() ? "" : null',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '(dragenter)': 'ctx.onDragEnter($event)',
    '(dragover)': 'ctx.onDragOver($event)',
    '(dragleave)': 'ctx.onDragLeave($event)',
    '(drop)': 'ctx.onDrop($event)',
    '(click)': 'onClick($event)',
    '(keydown.enter)': 'onActivate($event)',
    '(keydown.space)': 'onActivate($event)',
  },
})
export class KjFileUploadDropzone {
  /** @internal */
  readonly ctx = inject(KJ_FILE_UPLOAD);

  /** Accessible name for the drop-zone. */
  readonly kjLabel = input<string>('Drag files here, or click to browse');

  /** @internal */
  onClick(event: Event): void {
    if (this.ctx.disabled()) {
      event.preventDefault();
      return;
    }
    this.ctx.openPicker();
  }

  /** @internal */
  onActivate(event: Event): void {
    event.preventDefault();
    if (this.ctx.disabled()) return;
    this.ctx.openPicker();
  }
}

/**
 * File list container. Sets `role="list"` (idempotent on a `<ul>`, required
 * on a `<div>`) so the per-row `role="listitem"` semantics chain correctly
 * for screen readers (WCAG 1.3.1).
 *
 * The directive is structural-light — the consumer iterates `ctx.files()`
 * with `@for` and renders rows via `[kjFileUploadItem]` — so list-shape
 * (table / definition list / virtualised) stays the consumer's call.
 *
 * @example
 * ```html
 * <ul kjFileUploadList>
 *   @for (f of upload.files(); track f.id) {
 *     <li kjFileUploadItem [kjFile]="f">{{ f.file.name }}</li>
 *   }
 * </ul>
 * ```
 * @doc-category Core/Data input
 * @doc
 * @doc-name file-upload
 */
@Directive({
  selector: '[kjFileUploadList]',
  standalone: true,
  host: {
    'role': 'list',
  },
})
export class KjFileUploadList {
  /** @internal */
  readonly ctx = inject(KJ_FILE_UPLOAD);
}

/**
 * Per-file row directive. Provides `KJ_FILE_UPLOAD_ITEM` so per-row buttons
 * (retry / cancel / remove) and a per-row `KjProgressBar` can read
 * `file()` / `progress()` / `status()` from context.
 *
 * Reflects `data-status` so theme CSS can flip the row's tint (red border
 * for `error`, dimmed for `done`, etc.).
 *
 * @example
 * ```html
 * <li kjFileUploadItem [kjFile]="f">
 *   <span>{{ f.file.name }}</span>
 *   <button (click)="item.remove()">Remove</button>
 * </li>
 * ```
 * @doc-category Core/Data input
 * @doc
 * @doc-name file-upload
 */
@Directive({
  selector: '[kjFileUploadItem]',
  standalone: true,
  exportAs: 'kjFileUploadItem',
  providers: [{ provide: KJ_FILE_UPLOAD_ITEM, useExisting: KjFileUploadItem }],
  host: {
    'role': 'listitem',
    '[attr.data-status]': 'status()',
  },
})
export class KjFileUploadItem implements KjFileUploadItemContext {
  /** @internal */
  readonly ctx = inject(KJ_FILE_UPLOAD);

  /** The `KjUploadableFile` for this row. Required. */
  readonly kjFile = input.required<KjUploadableFile>();

  /** Read-only mirror for context consumers. */
  readonly file: Signal<KjUploadableFile> = this.kjFile;

  readonly status: Signal<KjFileStatus> = computed(() => this.kjFile().status);
  readonly progress: Signal<number | null> = computed(() => this.kjFile().progress);

  retry(): void {
    this.ctx.retry(this.kjFile().id);
  }

  cancel(): void {
    this.ctx.cancel(this.kjFile().id);
  }

  remove(): void {
    this.ctx.remove(this.kjFile().id);
  }
}
