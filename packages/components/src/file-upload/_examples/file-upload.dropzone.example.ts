import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjFileUploadComponent } from '../file-upload';

/**
 * Drop-zone-focused configuration. Larger drop area, custom label and hint
 * to highlight drag-and-drop as the primary path. Click-to-browse remains
 * available for keyboard / single-pointer users (WCAG 2.5.7).
 */
@Component({
  selector: 'kj-file-upload-dropzone-example',
  standalone: true,
  imports: [KjFileUploadComponent],
  styles: [
    `
      :host {
        display: block;
      }
      .kj-file-upload__dropzone {
        min-height: 14rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-file-upload
      kjAccept=".pdf,.txt,.md"
      kjDropzoneLabel="Drop documents here"
      kjDropzoneHint="PDF, TXT, or Markdown — drag from your file manager or use the button below"
    />
  `,
})
export class KjFileUploadDropzoneExample {}
