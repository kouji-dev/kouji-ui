import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  signal,
  viewChild,
} from '@angular/core';
import { injectRteOverlayData } from '@kouji-ui/core';

/** Data contract the `image` feature passes to this overlay. */
export interface KjRteImageOverlayData {
  insert(src: string, alt: string): void;
  close(): void;
}

/**
 * Image editor overlay contributed by the `image` feature. Collects a URL + alt
 * text (always require alt for WCAG 1.1.1) and inserts an image node.
 */
@Component({
  selector: 'kj-rte-image-editor',
  standalone: true,
  template: `
    <form class="kj-rte__overlay-form" (submit)="onInsert($event)">
      <label class="kj-rte__overlay-label" for="kj-rte-image-src">Image URL</label>
      <input
        #input
        id="kj-rte-image-src"
        class="kj-rte__overlay-input"
        type="url"
        placeholder="https://example.com/photo.jpg"
        [value]="src()"
        (input)="src.set($any($event.target).value)"
        (keydown.escape)="data.close()"
      />
      <label class="kj-rte__overlay-label" for="kj-rte-image-alt">Alt text</label>
      <input
        id="kj-rte-image-alt"
        class="kj-rte__overlay-input"
        type="text"
        placeholder="Describe the image"
        [value]="alt()"
        (input)="alt.set($any($event.target).value)"
        (keydown.escape)="data.close()"
      />
      <div class="kj-rte__overlay-actions">
        <button type="submit" class="kj-rte__overlay-btn" [disabled]="!src().trim()">Insert</button>
        <button type="button" class="kj-rte__overlay-btn" (click)="data.close()">Cancel</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditor {
  protected readonly data = injectRteOverlayData<KjRteImageOverlayData>();
  protected readonly src = signal('');
  protected readonly alt = signal('');
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('input');

  constructor() {
    afterNextRender(() => this.input()?.nativeElement.focus());
  }

  protected onInsert(event: Event): void {
    event.preventDefault();
    const src = this.src().trim();
    if (src) this.data.insert(src, this.alt().trim());
  }
}
