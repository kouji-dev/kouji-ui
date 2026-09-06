import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjButtonGroupComponent } from '../button-group';
import { KjButtonComponent } from '../../button/button';

/**
 * `kjVariant="segmented"` moves the border and rounded corners onto the
 * group, leaving the children borderless and quiet until pressed. Only the
 * on-segment is filled, so the selected state reads from fill rather than
 * colour alone.
 *
 * Typography comes from the ordinary `--kj-button-*` knobs set on the group
 * host — every knob is read as `var(name, default)`, so an ancestor value
 * reaches the inner button. The on-state fill needs its own
 * `--kj-segmented-bg-on` / `-fg-on` hooks instead, because variant rules
 * DECLARE knobs on the element and would otherwise win.
 */
@Component({
  selector: 'kj-button-group-segmented-example',
  standalone: true,
  imports: [KjButtonGroupComponent, KjButtonComponent],
  styles: [
    `
      :host {
        display: block;
      }

      .modes {
        --kj-button-font: var(--kj-font-mono);
        --kj-button-font-size: 11px;
        --kj-button-letter-spacing: 0.08em;
        --kj-button-text-transform: uppercase;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button-group class="modes" kjVariant="segmented" kjSize="sm" kjAriaLabel="Playground mode">
      <kj-button [kjPressed]="mode() === 'chat'" (click)="mode.set('chat')">Chat</kj-button>
      <kj-button [kjPressed]="mode() === 'images'" (click)="mode.set('images')">Images</kj-button>
      <kj-button [kjDisabled]="true" kjAriaLabel="Video — coming later">Video</kj-button>
    </kj-button-group>
  `,
})
export class KjButtonGroupSegmentedExample {
  readonly mode = signal<'chat' | 'images'>('chat');
}
