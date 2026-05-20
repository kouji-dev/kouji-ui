import { Component } from '@angular/core';
import { KjFileUploadComponent } from '../file-upload';

/**
 * Multiple-file picker. The default flavour (matches `KjFileUpload`'s
 * `kjMultiple` default) — drop / browse to add files; the row list grows
 * with each interaction.
 */
@Component({
  selector: 'kj-file-upload-multiple-example',
  standalone: true,
  imports: [KjFileUploadComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-file-upload
      [kjMaxFiles]="5"
      kjDropzoneHint="Up to 5 files"
    />
  `,
})
export class KjFileUploadMultipleExample {}
