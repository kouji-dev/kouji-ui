import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  signal,
  viewChild,
} from '@angular/core';
import { injectRteOverlayData } from '@kouji-ui/core';

/** Data contract the `link` feature passes to this overlay. */
export interface KjRteLinkOverlayData {
  readonly url: string;
  apply(url: string): void;
  remove(): void;
  close(): void;
}

/**
 * Link editor overlay contributed by the `link` feature. Rendered by the RTE
 * component inside a `role="dialog"` popover; it edits/removes the link at the
 * caret. Not part of the public API — surfaced via the feature's `overlay`.
 */
@Component({
  selector: 'kj-rte-link-editor',
  standalone: true,
  template: `
    <form class="kj-rte__overlay-form" (submit)="onApply($event)">
      <label class="kj-rte__overlay-label" for="kj-rte-link-url">URL</label>
      <input
        #input
        id="kj-rte-link-url"
        class="kj-rte__overlay-input"
        type="url"
        placeholder="https://example.com"
        [value]="url()"
        (input)="url.set($any($event.target).value)"
        (keydown.escape)="data.close()"
      />
      <div class="kj-rte__overlay-actions">
        <button type="submit" class="kj-rte__overlay-btn">Apply</button>
        @if (url()) {
          <button type="button" class="kj-rte__overlay-btn" (click)="data.remove()">Remove</button>
        }
        <button type="button" class="kj-rte__overlay-btn" (click)="data.close()">Cancel</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkEditor {
  protected readonly data = injectRteOverlayData<KjRteLinkOverlayData>();
  protected readonly url = signal(this.data.url ?? '');
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('input');

  constructor() {
    afterNextRender(() => this.input()?.nativeElement.focus());
  }

  protected onApply(event: Event): void {
    event.preventDefault();
    this.data.apply(this.url().trim());
  }
}
