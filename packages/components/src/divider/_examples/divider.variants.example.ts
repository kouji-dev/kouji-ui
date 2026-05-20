import { Component } from '@angular/core';
import { KjDividerComponent } from '../divider';

/**
 * Line-style variants — `solid` / `dashed` / `dotted` — stacked
 * vertically with short content between each pair so the stroke of
 * each variant reads against real surrounding text.
 */
@Component({
  selector: 'kj-divider-variants-example',
  standalone: true,
  imports: [KjDividerComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); }
  `],
  template: `
    <p>Solid — the default rule style.</p>
    <kj-divider kjVariant="solid" />
    <p>Dashed — repeats short strokes.</p>
    <kj-divider kjVariant="dashed" />
    <p>Dotted — repeats round dots.</p>
    <kj-divider kjVariant="dotted" />
    <p>Trailing content for the last variant.</p>
  `,
})
export class KjDividerVariantsExample {}
