import { Component } from '@angular/core';
import { KjFileUploadComponent } from './file-upload';

/**
 * Default usage example for KjFileUploadComponent.
 * A single-file picker with a styled drop-zone and a toolbar trigger.
 */
@Component({
  selector: 'kj-file-upload-example',
  standalone: true,
  imports: [KjFileUploadComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-file-upload
      [kjMultiple]="false"
      kjDropzoneLabel="Drop a file here, or click to browse"
      kjDropzoneHint="One file at a time"
      kjTriggerLabel="Choose a file"
    />
  `,
})
export class KjFileUploadExample {}
