import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjFileUploadComponent } from './file-upload';

/**
 * Common upload shapes: a single-file picker with hint text and an
 * image-only multi-file picker with previews. Copy-paste starting point for
 * upload screens.
 */
@Component({
  selector: 'kj-file-upload-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjFileUploadComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-lg); }
    h4 { margin: 0; font: 600 var(--kj-text-sm)/1.4 var(--kj-font-sans); color: var(--kj-fg-muted); }
  `],
  template: `
    <section>
      <h4>Single resume</h4>
      <kj-file-upload
        [kjMultiple]="false"
        kjAccept=".pdf,.doc,.docx"
        [kjMaxSize]="2_000_000"
        kjDropzoneLabel="Drop your resume here, or click to browse"
        kjDropzoneHint="PDF or Word, up to 2 MB"
        kjTriggerLabel="Choose resume"
      />
    </section>

    <section>
      <h4>Photo gallery</h4>
      <kj-file-upload
        kjAccept="image/*"
        [kjMaxSize]="5_000_000"
        [kjMaxFiles]="6"
        [kjShowPreview]="true"
        kjDropzoneLabel="Drop images here, or click to browse"
        kjDropzoneHint="PNG / JPG up to 5 MB each — max 6 files"
        kjTriggerLabel="Add photos"
      />
    </section>
  `,
})
export class KjFileUploadUsageExample {}
