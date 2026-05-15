import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';

/**
 * Themed surface container — card, panel, feature box.
 * Presentation-only: no headless directive in core, no behavior.
 *
 * Compose with `<kj-card-header>`, `<kj-card-content>`, `<kj-card-footer>`,
 * `<kj-card-cover>` sub-components for structured layouts.
 *
 * Variants:
 * - `default` — base surface (background `--kj-bg-surface`)
 * - `outline` — transparent background, neutral border
 * - `subtle`  — slightly elevated surface (background `--kj-bg-field`), no border
 *
 * @example
 * ```html
 * <kj-card>Default card</kj-card>
 * <kj-card variant="outline">Outlined</kj-card>
 * ```
 * @doc-example Default
 *   The default playground — a single card with title and body text.
 *   @doc-file card.example.ts
 * @doc-example Usage
 *   The common shape — header / content / footer with action buttons. Use this
 *   as the copy-paste starting point.
 *   @doc-file card.usage.example.ts
 * @doc-example Full
 *   Full composition — cover, header, content, and footer actions.
 *   @doc-file card.full.example.ts
 * @doc-example Cover
 *   `<kj-card-cover>` for full-bleed media at the top of the card.
 *   @doc-file card.cover.example.ts
 *
 * @doc-aria
 *   data-variant  — Mirrors the resolved variant for theme/scope hooks
 *   data-shadow   — Optional `"lift"` attribute pulls in --kj-button-shadow for brutalist offsets
 *
 * @doc-touch
 *   Cards are surfaces, not tap targets. When the entire card is interactive
 *   (clickable tile) wrap the content in a `<button>` or `<a>` and ensure the
 *   target spans ≥ 44×44.
 *
 * @doc-a11y
 *   Renders a plain `<div>` surface — no implicit role. Use `<kj-card-title>`
 *   (which mounts an `<h3>`) so the card's heading lands in the document
 *   outline. For clickable cards, wrap interactive content in a real link or
 *   button so keyboard activation works without extra wiring.
 *
 * @doc-related list,empty-state,skeleton
 *
 * @doc-css-var
 *   --kj-card-bg            — Background fill. Variant rules set this; override to brand-paint a one-off.
 *   --kj-card-fg            — Foreground (body text) color. Defaults to --kj-fg-default.
 *   --kj-card-border-color  — Border color. Outline variant sets this; subtle/default keep transparent.
 *   --kj-card-border-width  — Border thickness. Inherits --kj-border.
 *   --kj-card-radius        — Corner radius. Inherits --kj-radius-box.
 *   --kj-card-padding-x     — Horizontal padding for header/content/footer bands.
 *   --kj-card-padding-y     — Vertical padding for header/content/footer bands.
 *   --kj-card-shadow        — Box shadow. `data-shadow="lift"` borrows --kj-button-shadow for brutalist offsets.
 *   --kj-card-cover-height  — Height of the cover slot. Sizes (sm/md/lg) override.
 *   --kj-card-cover-fit     — object-fit for media in the cover slot. `cover` (default) or `contain`.
 *
 * @doc-category Library/Data display
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
