import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Docs-internal "track card" — the modern editorial card used on:
 * - /docs (one per track: ecosystem overview)
 * - /docs/<trackId> (one per item: track listing)
 *
 * Header row: small mono `eyebrow` (left) + numeric `count` chip (right).
 * Body: `title` (display font), optional `description` line.
 * Footer: optional CTA (`cta` text + arrow).
 *
 * Click target = the whole card. The component is rendered as an `<a>`
 * with the supplied `routerLink`.
 *
 * @example
 * ```html
 * <kj-docs-track-card
 *   eyebrow="@kouji-ui/core"
 *   title="Headless primitives"
 *   description="Behavior-only directives. BYO CSS."
 *   [count]="20"
 *   cta="Browse all"
 *   [link]="['/docs', 'headless']"
 * />
 * ```
 */
@Component({
  selector: 'kj-docs-track-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './track-card.html',
  styleUrl: './track-card.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsTrackCardComponent {
  /** Small mono caption above the title — e.g. package coordinate or category. */
  readonly eyebrow = input<string>('');
  /** Card title — rendered in the display font. */
  readonly title = input.required<string>();
  /** Optional one-line description. */
  readonly description = input<string>('');
  /** Optional numeric count chip rendered in the header row's right slot. */
  readonly count = input<number | null>(null);
  /** Optional CTA text in the footer. Hidden if empty. */
  readonly cta = input<string>('');
  /** Router link the card navigates to on click. */
  readonly link = input.required<string | unknown[]>();
}
