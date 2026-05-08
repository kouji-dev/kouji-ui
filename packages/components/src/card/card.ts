import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';

/**
 * Themed surface container — card, panel, feature box.
 * Presentation-only: no headless directive in core, no behavior.
 *
 * Compose with `<kj-card-header>`, `<kj-card-content>`, `<kj-card-footer>`,
 * `<kj-card-cover>` sub-components for structured layouts.
 *
 * Variants:
 * - `default` — base surface (background `--kj-color-base-200`)
 * - `outline` — transparent background, neutral border
 * - `subtle`  — slightly elevated surface (background `--kj-color-base-300`), no border
 *
 * @example
 * ```html
 * <kj-card>Default card</kj-card>
 * <kj-card variant="outline">Outlined</kj-card>
 * ```
 * @doc-example Default
 *   @doc-file card.example.ts
 * @doc-example Full
 *   @doc-file card.full.example.ts
 * @doc-example Cover
 *   @doc-file card.cover.example.ts
 * @category Library/Data display
 * @doc
 * @doc-name card
 * @doc-description Themed surface container for grouping related content with header, footer, and cover sub-components.
 * @doc-is-main
 */
@Component({
  selector: 'kj-card',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './card.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-card',
    '[attr.data-variant]': 'variant()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCardComponent {
  readonly variant = input<'default' | 'outline' | 'subtle'>('default');
}

/**
 * Full-bleed image / video area at the top of a card.
 * `size` controls the fixed height (sm = 8rem, md = 12rem default, lg = 16rem).
 * `fit` controls `object-fit` on the inner media (`cover` default — fills and
 * crops; `contain` — letterboxes, no crop). Override the height directly with
 * the CSS custom property `--kj-card-cover-height` if the presets don't fit.
 * @doc
 * @doc-name card
 */
@Component({
  selector: 'kj-card-cover',
  standalone: true,
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-card-cover',
    '[attr.data-size]': 'size()',
    '[attr.data-fit]': 'fit()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCardCoverComponent {
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly fit = input<'cover' | 'contain'>('cover');
}

/**
 * Header band inside the card. Flexes title/subtitle on the left and an optional extra slot on the right.
 * @doc
 * @doc-name card
 */
@Component({
  selector: 'kj-card-header',
  standalone: true,
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { 'class': 'kj-card-header' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCardHeaderComponent {}

/**
 * Card heading. Renders semantically as `<h3>`.
 * @doc
 * @doc-name card
 */
@Component({
  selector: 'kj-card-title',
  standalone: true,
  template: `<h3 class="kj-card-title"><ng-content /></h3>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCardTitleComponent {}

/**
 * Card subtitle — smaller, lighter text below the title.
 * @doc
 * @doc-name card
 */
@Component({
  selector: 'kj-card-subtitle',
  standalone: true,
  template: `<p class="kj-card-subtitle"><ng-content /></p>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCardSubtitleComponent {}

/**
 * Main body slot. `padded` toggles the standard padding (default true).
 * @doc
 * @doc-name card
 */
@Component({
  selector: 'kj-card-content',
  standalone: true,
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-card-content',
    '[attr.data-padded]': "padded() ? '' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCardContentComponent {
  readonly padded = input(true);
}

/**
 * Footer actions area. `align` controls button placement.
 * @doc
 * @doc-name card
 */
@Component({
  selector: 'kj-card-footer',
  standalone: true,
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-card-footer',
    '[attr.data-align]': 'align()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCardFooterComponent {
  readonly align = input<'start' | 'center' | 'end' | 'between'>('end');
}
