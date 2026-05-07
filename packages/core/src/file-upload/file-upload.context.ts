import { InjectionToken, Signal } from '@angular/core';
import { KjFileStatus, KjUploadableFile } from './file-upload.types';

/**
 * Aggregate status across the full file list. Drives `data-status` on the
 * root host so theme CSS can style the wrapper differently while uploads are
 * in flight.
 */
export type KjFileUploadAggregateStatus =
  | 'idle'
  | 'pending'
  | 'uploading'
  | 'complete'
  | 'partial-error';

/**
 * Public context the root `KjFileUpload` exposes via DI. Child directives
 * (`KjFileUploadTrigger`, `KjFileUploadDropzone`, `KjFileUploadList`,
 * `KjFileUploadItem`) inject this token.
 */
export interface KjFileUploadContext {
  /** Files currently selected (in selection order). Removed entries are dropped. */
  readonly files: Signal<readonly KjUploadableFile[]>;
  /** Whether the root is disabled. Drop-zone, trigger, and per-row controls all gate on this. */
  readonly disabled: Signal<boolean>;
  /** True while at least one file is being dragged over the drop-zone host. */
  readonly dragActive: Signal<boolean>;
  /** Aggregate status for the whole list. */
  readonly aggregateStatus: Signal<KjFileUploadAggregateStatus>;
  /** Whether `kjMultiple` is on. */
  readonly multiple: Signal<boolean>;
  /** Configured `accept` MIME / extension list (or `undefined`). */
  readonly accept: Signal<string | undefined>;
  /** Maximum bytes per file (or `undefined` for no per-file cap). */
  readonly maxSize: Signal<number | undefined>;
  /** Maximum total file count (or `undefined`). */
  readonly maxFiles: Signal<number | undefined>;

  /** Open the native file picker. No-op when disabled. */
  openPicker(): void;
  /**
   * Add candidate files (from drop, programmatic add, or the trigger's file
   * input change event). Validates against `accept` / `maxSize` / `maxFiles`,
   * mints ids for survivors, appends to the list, and announces.
   */
  addFiles(files: readonly File[] | FileList): void;
  /** Remove a file from the list by id. Aborts an in-flight upload. */
  remove(id: string): void;
  /** Clear all files. */
  clear(): void;
  /** Re-run the upload simulation / handler for a single file. */
  retry(id: string): void;
  /** Cancel an in-flight upload (sets status to `'cancelled'`). */
  cancel(id: string): void;
  /** Update per-file progress and status (called by simulators / examples). */
  setFileStatus(id: string, status: KjFileStatus, progress?: number | null, error?: string): void;

  /** @internal Used by `KjFileUploadTrigger` to register its hidden file input. */
  registerPickerInput(el: HTMLInputElement): void;
  /** @internal Used by the trigger / drop-zone to forward `change` events. */
  onPickerChange(event: Event): void;
  /** @internal Drag-event handlers delegated from the drop-zone host bindings. */
  onDragEnter(event: Event): void;
  onDragOver(event: Event): void;
  onDragLeave(event: Event): void;
  onDrop(event: Event): void;
}

/** DI token for the root `KjFileUpload`. */
export const KJ_FILE_UPLOAD = new InjectionToken<KjFileUploadContext>('KjFileUpload');

/** Per-row context exposed by `KjFileUploadItem`. */
export interface KjFileUploadItemContext {
  /** The current `KjUploadableFile` for the row. */
  readonly file: Signal<KjUploadableFile>;
  /** `0..100` or `null`. */
  readonly progress: Signal<number | null>;
  /** Per-row status. */
  readonly status: Signal<KjFileStatus>;
  /** Re-run the upload for this row. */
  retry(): void;
  /** Cancel an in-flight upload for this row. */
  cancel(): void;
  /** Remove this row from the list. */
  remove(): void;
}

/** DI token for an individual file row. */
export const KJ_FILE_UPLOAD_ITEM = new InjectionToken<KjFileUploadItemContext>('KjFileUploadItem');
