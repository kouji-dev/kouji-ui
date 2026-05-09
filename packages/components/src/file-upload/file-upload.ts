import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  input,
} from '@angular/core';
import {
  KjFileUpload,
  KjFileUploadDropzone,
  KjFileUploadItem,
  KjFileUploadList,
  KjFileUploadTrigger,
  KjFileRejection,
  KjUploadableFile,
  KjProgressBar,
  KjProgressBarFill,
} from '@kouji-ui/core';

/**
 * Styled wrapper for the headless `KjFileUpload` directive family. Renders
 * the canonical drop-zone + trigger + per-file list shape so consumers don't
 * have to wire the five directives by hand.
 *
 * The component owns the *visible* shape (drop-zone instructional text,
 * file-row layout with thumbnail / name / size / progress / remove). The
 * directives still own the state machine, validation, drag-and-drop, ARIA,
 * and live-region announcements.
 *
 * Per-file progress integrates with `KjProgressBar` (composed via the inner
 * `<div kjProgressBar>`) for `role="progressbar"` semantics. When the
 * consumer wires a real upload (HTTP, signed-URL POST, etc.), they call
 * `setFileStatus(id, status, progress)` on the directive ref to drive the
 * row through `pending → uploading → done`.
 *
 * @example
 * ```html
 * <kj-file-upload kjAccept="image/*" [kjMaxSize]="5_000_000" />
 * ```
 *
 * @doc-example Default (single)
 *   @doc-file file-upload.example.ts
 * @doc-example Multiple
 *   @doc-file file-upload.multiple.example.ts
 * @doc-example Drop-zone
 *   @doc-file file-upload.dropzone.example.ts
 * @doc-example Simulated upload progress
 *   @doc-file file-upload.with-progress.example.ts
 * @doc-example Image preview
 *   @doc-file file-upload.image-preview.example.ts
 * @doc-category Library/Data input
 */
@Component({
  selector: 'kj-file-upload',
  standalone: true,
  imports: [
    KjFileUpload,
    KjFileUploadTrigger,
    KjFileUploadDropzone,
    KjFileUploadList,
    KjFileUploadItem,
    KjProgressBar,
    KjProgressBarFill,
  ],
  template: `
    <div
      kjFileUpload
      #upload="kjFileUpload"
      class="kj-file-upload"
      [kjAccept]="kjAccept()"
      [kjMultiple]="kjMultiple()"
      [kjMaxSize]="kjMaxSize()"
      [kjMaxFiles]="kjMaxFiles()"
      [kjDisabled]="kjDisabled()"
      (kjSelect)="kjSelect.emit($event)"
      (kjReject)="kjReject.emit($event)"
      (kjRemove)="kjRemove.emit($event)"
    >
      @if (kjShowDropzone()) {
        <div kjFileUploadDropzone class="kj-file-upload__dropzone" [kjLabel]="kjDropzoneLabel()">
          <strong>{{ kjDropzoneLabel() }}</strong>
          @if (kjDropzoneHint()) {
            <span class="kj-file-upload__dropzone-hint">{{ kjDropzoneHint() }}</span>
          }
        </div>
      }
      <div class="kj-file-upload__toolbar">
        <button
          kjFileUploadTrigger
          type="button"
          class="kj-file-upload__trigger"
        >
          {{ kjTriggerLabel() }}
        </button>
        <ng-content select="[kj-file-upload-actions]" />
      </div>

      <ul kjFileUploadList class="kj-file-upload__list">
        @for (f of upload.files(); track f.id) {
          <li
            kjFileUploadItem
            #row="kjFileUploadItem"
            [kjFile]="f"
            class="kj-file-upload__row"
          >
            @if (kjShowPreview() && isImage(f.file)) {
              <img
                class="kj-file-upload__thumb"
                [src]="previewUrl(f)"
                [alt]="f.file.name"
              />
            }
            <div class="kj-file-upload__row-body">
              <div class="kj-file-upload__row-meta">
                <span class="kj-file-upload__row-name" [attr.aria-label]="f.file.name">
                  {{ f.file.name }}
                </span>
                <span class="kj-file-upload__row-size">{{ formatSize(f.file.size) }}</span>
              </div>
              @if (row.progress() !== null) {
                <div
                  kjProgressBar
                  [kjValue]="row.progress() ?? 0"
                  class="kj-file-upload__progress"
                  [attr.aria-label]="'Upload progress for ' + f.file.name"
                >
                  <div kjProgressBarFill class="kj-progress-bar__fill"></div>
                </div>
              }
              <span class="kj-file-upload__row-status">
                {{ statusLabel(row.status()) }}
                @if (f.error) {
                  — {{ f.error }}
                }
              </span>
            </div>
            <div class="kj-file-upload__row-actions">
              <span
                class="kj-file-upload__row-icon"
                [attr.data-status]="row.status()"
                [attr.aria-hidden]="'true'"
              ></span>
              <button
                type="button"
                class="kj-file-upload__remove"
                (click)="row.remove()"
                [attr.aria-label]="'Remove ' + f.file.name + ' from list'"
              >
                Remove
              </button>
            </div>
          </li>
        }
      </ul>
    </div>
  `,
  styleUrl: './file-upload.css',
  encapsulation: ViewEncapsulation.None,
  host: { 'style': 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjFileUploadComponent implements OnDestroy {
  /** MIME / extension list for the picker. */
  readonly kjAccept = input<string>('');

  /** Multiple files. Default `true`. */
  readonly kjMultiple = input(true, { transform: booleanAttribute });

  /** Maximum bytes per file. */
  readonly kjMaxSize = input<number>(Number.POSITIVE_INFINITY);

  /** Total file count cap. */
  readonly kjMaxFiles = input<number>(Number.POSITIVE_INFINITY);

  /** Disables the entire control. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** Whether to render the drop-zone (turn off for compact layouts). Default `true`. */
  readonly kjShowDropzone = input(true, { transform: booleanAttribute });

  /** Drop-zone accessible name + visible heading. */
  readonly kjDropzoneLabel = input<string>('Drag files here, or click to browse');

  /** Optional secondary hint inside the drop-zone (e.g. "PNG / JPG up to 5 MB"). */
  readonly kjDropzoneHint = input<string>('');

  /** Label for the toolbar trigger button. */
  readonly kjTriggerLabel = input<string>('Choose files');

  /** When `true`, image rows render an `<img>` thumbnail via `URL.createObjectURL`. */
  readonly kjShowPreview = input(false, { transform: booleanAttribute });

  @Output() readonly kjSelect = new EventEmitter<File[]>();
  @Output() readonly kjReject = new EventEmitter<KjFileRejection[]>();
  @Output() readonly kjRemove = new EventEmitter<KjUploadableFile>();

  /** Direct access to the underlying directive — consumers drive simulated uploads via this. */
  @ViewChild(KjFileUpload, { static: true }) readonly upload!: KjFileUpload;

  // ─── View helpers ───
  protected readonly isImage = (file: File): boolean => /^image\//.test(file.type);

  /** Cache so `URL.createObjectURL` isn't called repeatedly per change-detection. */
  private readonly previewCache = new Map<string, string>();

  protected previewUrl(f: KjUploadableFile): string {
    let url = this.previewCache.get(f.id);
    if (!url) {
      url = URL.createObjectURL(f.file);
      this.previewCache.set(f.id, url);
    }
    return url;
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  protected statusLabel(status: string): string {
    switch (status) {
      case 'preparing': return 'Preparing';
      case 'pending': return 'Ready';
      case 'uploading': return 'Uploading';
      case 'done': return 'Done';
      case 'error': return 'Error';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  ngOnDestroy(): void {
    for (const url of this.previewCache.values()) URL.revokeObjectURL(url);
    this.previewCache.clear();
  }

  // Expose the most-useful imperative bits for the simulated-upload examples.
  /** @internal */
  readonly files = computed(() => this.upload?.files() ?? []);
}
