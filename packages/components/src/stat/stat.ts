import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  input,
} from '@angular/core';
import type { KjExtensible } from '@kouji-ui/core';
import { KjSkeletonComponent } from '../skeleton/skeleton';

/** Which way a `<kj-stat>` change moved. `none` draws no glyph. */
export type KjStatDirection = 'up' | 'down' | 'none';
/** Colour of a `<kj-stat>` change. Open: any other string is reflected as `data-tone`. */
export type KjStatTone = KjExtensible<'neutral' | 'info' | 'success' | 'warning' | 'error'>;

/**
 * A single metric: a label, a value, and an optional change against a
 * previous period. Renders a description list (`<dl>`), so the label is the
 * term and the value and change are its descriptions.
 *
 * The change carries a ▲ / ▼ glyph, so its direction reads without colour;
 * `tone` only colours it (a rise can be bad news). Give `changeLabel` a full
 * sentence ("up 12% on last week") to replace the glyph and short text for
 * screen readers.
 *
 * @doc-example Default
 *   A row of stats, each tone and direction.
 *   @doc-file stat.example.ts
 * @doc-example Loading and empty
 *   `loading` shows a skeleton and sets `aria-busy`; a missing value shows
 *   a dash, or `emptyText`.
 *   @doc-file stat.states.example.ts
 *
 * @doc-aria
 *   dl / dt / dd  — Label is the term, value and change its descriptions
 *   aria-busy     — `true` while `loading`
 *   aria-hidden   — On the glyph, and on the short change text when `changeLabel` is set
 *
 * @doc-a11y
 *   The glyph makes direction visible without colour (WCAG 1.4.1). For
 *   screen readers write the direction into `change` ("+12%") or pass
 *   `changeLabel`.
 *
 * @doc-css-var
 *   --kj-stat-value-size — Font size of the value. Sizes override.
 *   --kj-stat-label-size — Font size of the label. Sizes override.
 *   --kj-stat-tone-fg    — Colour of the change. Tones override.
 *
 * @doc-related badge,skeleton,card
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name stat
 * @doc-description A metric with label, value and a directional change, with tones, sizes, loading and empty states.
 * @doc-is-main
 */
@Component({
  selector: 'kj-stat',
  standalone: true,
  imports: [KjSkeletonComponent],
  template: `
    <dl
      class="kj-stat"
      [class]="kjClass()"
      [attr.data-tone]="tone()"
      [attr.data-size]="size()"
      [attr.aria-busy]="loading() || null"
    >
      <dt class="kj-stat__label">{{ label() }}</dt>
      <dd class="kj-stat__value">
        @if (loading()) {
          <kj-skeleton kjSkeletonShape="text" kjWidth="4em" />
        } @else if (empty()) {
          <span class="kj-stat__empty">{{ emptyText() }}</span>
        } @else {
          {{ value() }}
        }
      </dd>
      @if (change() && !loading() && !empty()) {
        <dd class="kj-stat__change" [attr.data-direction]="direction()">
          @if (direction() !== 'none') {
            <span class="kj-stat__glyph" aria-hidden="true">{{
              direction() === 'up' ? '▲' : '▼'
            }}</span>
          }
          <span [attr.aria-hidden]="changeLabel() ? 'true' : null">{{ change() }}</span>
          @if (changeLabel()) {
            <span class="kj-stat__sr">{{ changeLabel() }}</span>
          }
        </dd>
      }
    </dl>
  `,
  styleUrl: './stat.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjStat {
  /** Class names added to the inner `.kj-stat` (the host is `display: contents`). */
  readonly kjClass = input<string>('');
  /** What is measured. */
  readonly label = input.required<string>();
  /** The metric, already formatted. `null`, `undefined` or `''` shows the empty state. */
  readonly value = input<string | number | null | undefined>(undefined);
  /** Change against a previous period, already formatted ("+12%"). Empty = no change row. */
  readonly change = input<string>('');
  /** Direction of the change; draws ▲ or ▼. */
  readonly direction = input<KjStatDirection>('none');
  /** Full screen-reader text for the change; hides the glyph and short text from AT. */
  readonly changeLabel = input<string>('');
  /** Colour of the change. */
  readonly tone = input<KjStatTone>('neutral');
  /** Size preset reflected as `data-size`. */
  readonly size = input<KjExtensible<'sm' | 'md' | 'lg'>>('md');
  /** Shown when `value` is missing ("No data yet"). Defaults to a dash. */
  readonly emptyText = input<string>('—');
  /** Shows a skeleton in place of the value and sets `aria-busy`. */
  readonly loading = input(false, { transform: booleanAttribute });

  protected readonly empty = computed(() => {
    const v = this.value();
    return v === null || v === undefined || v === '';
  });
}
