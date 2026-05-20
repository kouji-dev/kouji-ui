import { Component, ViewChild } from '@angular/core';
import { KjFileUploadComponent } from '../file-upload';

/**
 * Simulated upload demo. A consumer-side `runFakeUpload` uses
 * `setInterval` to drive each new row from `pending → uploading → done`,
 * pushing progress through `KjFileUpload.setFileStatus`. The
 * `KjProgressBar` inside each row reads `progress` from the per-row context
 * and renders the determinate fill.
 *
 * In a real app, swap `runFakeUpload` for an `HttpClient.request(...)`
 * pipeline that maps `HttpEventType.UploadProgress / Response / Error`
 * onto the same `setFileStatus` calls.
 */
@Component({
  selector: 'kj-file-upload-with-progress-example',
  standalone: true,
  imports: [KjFileUploadComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-file-upload
      #picker
      [kjMaxSize]="10_000_000"
      kjDropzoneHint="Up to 10 MB per file — uploads start automatically"
      (kjSelect)="onSelect()"
    />
  `,
})
export class KjFileUploadWithProgressExample {
  @ViewChild('picker', { static: true }) picker!: KjFileUploadComponent;

  onSelect(): void {
    // Drive any pending row(s) through a simulated upload.
    for (const f of this.picker.upload.files()) {
      if (f.status === 'pending') this.runFakeUpload(f.id);
    }
  }

  private runFakeUpload(id: string): void {
    let progress = 0;
    this.picker.upload.setFileStatus(id, 'uploading', 0);
    const tick = setInterval(() => {
      progress += 12;
      if (progress >= 100) {
        this.picker.upload.setFileStatus(id, 'done', 100);
        clearInterval(tick);
      } else {
        this.picker.upload.setFileStatus(id, 'uploading', progress);
      }
    }, 220);
  }
}
