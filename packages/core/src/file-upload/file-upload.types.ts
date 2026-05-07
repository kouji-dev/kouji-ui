/**
 * Per-file lifecycle status. Set by the directive as files move through the
 * state machine; read by templates and per-row controls (retry / cancel /
 * remove gate on this).
 */
export type KjFileStatus =
  | 'preparing'
  | 'pending'
  | 'uploading'
  | 'done'
  | 'error'
  | 'cancelled';

/**
 * The kouji envelope around a native `File`. `KjFileUpload` mints `id` (a
 * stable string) on selection so consumers can `track` per-row by identity.
 *
 * `progress` is `null` when the file hasn't started yet *or* the upload is
 * indeterminate; once the consumer reports `progress` events the directive
 * fills in `0..100`.
 */
export interface KjUploadableFile {
  /** Stable id, minted by `KjFileUpload`. Survives retry. */
  readonly id: string;
  /** The native `File`. */
  readonly file: File;
  /** Current per-file status. */
  readonly status: KjFileStatus;
  /** `0..100` once the upload reports progress; `null` otherwise. */
  readonly progress: number | null;
  /** Human-readable error message (set when `status === 'error'`). */
  readonly error?: string;
}

/**
 * Reason a candidate file was rejected at selection time. Drives both the
 * built-in validation messages and the structured `kjReject` output the
 * consumer can map to a hint / toast.
 */
export type KjFileRejectReason = 'size' | 'type' | 'count';

/** A file that was filtered out at selection. */
export interface KjFileRejection {
  readonly file: File;
  readonly reason: KjFileRejectReason;
}

/** Built-in validation messages (English, locale-neutral). Override per-instance via `kjValidationMessages`. */
export interface KjFileUploadValidationMessages {
  size: string;
  type: string;
  count: string;
}

export const KJ_FILE_UPLOAD_DEFAULT_MESSAGES: KjFileUploadValidationMessages = {
  size: 'File too large',
  type: 'File type not allowed',
  count: 'Too many files',
};
