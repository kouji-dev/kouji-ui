import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjFileUploadComponent } from './file-upload';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Drives the dropzone visibility,
 * its label text, the multi-file toggle, and a max-files cap. The
 * `kjShowPreview` toggle covers the image-thumbnail variant.
 */
const showDropzone = signal(true);
const dropzoneLabel = signal('Drop files here');
const multiple = signal(true);
const maxFiles = signal<1 | 3 | 5 | 10>(5);
const showPreview = signal(false);
const disabled = signal(false);

@Component({
  selector: 'kj-file-upload-playground',
  standalone: true,
  imports: [KjFileUploadComponent],
  styles: [`
    :host { display: block; max-width: 480px; }
    .kj-file-upload__dropzone { min-height: 10rem; }
  `],
  template: `
    <kj-file-upload
      kjAccept="image/*,.pdf"
      [kjShowDropzone]="showDropzone()"
      [kjDropzoneLabel]="dropzoneLabel()"
      kjDropzoneHint="Images or PDFs — drag from your file manager or use the button below"
      [kjMultiple]="multiple()"
      [kjMaxFiles]="maxFiles()"
      [kjShowPreview]="showPreview()"
      [kjDisabled]="disabled()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjFileUploadPlaygroundDemo {
  protected readonly showDropzone = showDropzone;
  protected readonly dropzoneLabel = dropzoneLabel;
  protected readonly multiple = multiple;
  protected readonly maxFiles = maxFiles;
  protected readonly showPreview = showPreview;
  protected readonly disabled = disabled;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjFileUploadPlaygroundDemo,
  state: {
    showDropzone: showDropzone as unknown as ReturnType<typeof signal>,
    dropzoneLabel: dropzoneLabel as unknown as ReturnType<typeof signal>,
    multiple: multiple as unknown as ReturnType<typeof signal>,
    maxFiles: maxFiles as unknown as ReturnType<typeof signal>,
    showPreview: showPreview as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'toggle', name: 'showDropzone', label: 'show dropzone' },
    { kind: 'text', name: 'dropzoneLabel', label: 'dropzone label' },
    { kind: 'toggle', name: 'multiple', label: 'multiple' },
    { kind: 'chips', name: 'maxFiles', label: 'max files', options: [1, 3, 5, 10] },
    { kind: 'toggle', name: 'showPreview', label: 'image preview' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (values) => {
    const s = values as {
      showDropzone: boolean;
      dropzoneLabel: string;
      multiple: boolean;
      maxFiles: number;
      showPreview: boolean;
      disabled: boolean;
    };
    const attrs: string[] = ['kjAccept="image/*,.pdf"'];
    if (!s.showDropzone) attrs.push('[kjShowDropzone]="false"');
    if (s.dropzoneLabel) attrs.push(`kjDropzoneLabel="${s.dropzoneLabel}"`);
    if (!s.multiple) attrs.push('[kjMultiple]="false"');
    attrs.push(`[kjMaxFiles]="${s.maxFiles}"`);
    if (s.showPreview) attrs.push('[kjShowPreview]="true"');
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    return `<kj-file-upload\n  ${attrs.join('\n  ')}\n/>`;
  },
};
