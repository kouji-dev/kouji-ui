import { Component } from '@angular/core';
import { KjFileUploadComponent } from './file-upload';

/**
 * Image-only picker with thumbnail previews. `kjShowPreview` enables the
 * inline `<img>` in each image row; the wrapper handles
 * `URL.createObjectURL` lifecycle (revoking on destroy).
 */
@Component({
  selector: 'kj-file-upload-image-preview-example',
  standalone: true,
  imports: [KjFileUploadComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-file-upload
      kjAccept="image/*"
      [kjMaxFiles]="6"
      [kjShowPreview]="true"
      kjDropzoneLabel="Drop images here"
      kjDropzoneHint="PNG, JPG, GIF, WebP — up to 6 images"
    />
  `,
})
export class KjFileUploadImagePreviewExample {}
