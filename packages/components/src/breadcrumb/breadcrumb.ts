import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';
import {
  KjBreadcrumb,
  KjBreadcrumbList,
  KjBreadcrumbItem,
  KjBreadcrumbCurrent,
  KjBreadcrumbSeparator,
  KjBreadcrumbEllipsis,
  KjLink,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjBreadcrumb` directive — root of the
 * breadcrumb compound. Hosts a `<nav aria-label="Breadcrumb">` (selector
 * restriction on the directive) by composing `KjBreadcrumb` via
 * `hostDirectives`. Compose with `<kj-breadcrumb-list>`,
 * `<kj-breadcrumb-item>`, `<kj-breadcrumb-link>`,
 * `<kj-breadcrumb-current>`, `<kj-breadcrumb-separator>`, and
 * `<kj-breadcrumb-ellipsis>` to build the trail.
 *
 * @example
 * ```html
 * <kj-breadcrumb>
 *   <kj-breadcrumb-list>
 *     <kj-breadcrumb-item><kj-breadcrumb-link kjHref="/">Home</kj-breadcrumb-link></kj-breadcrumb-item>
 *     <kj-breadcrumb-item><kj-breadcrumb-link kjHref="/library">Library</kj-breadcrumb-link></kj-breadcrumb-item>
 *     <kj-breadcrumb-item><kj-breadcrumb-current>Data</kj-breadcrumb-current></kj-breadcrumb-item>
 *   </kj-breadcrumb-list>
 * </kj-breadcrumb>
 * ```
 *
 * @doc-example Default
 *   The default playground — three-crumb trail with auto `/` separator.
 *   @doc-file breadcrumb.example.ts
 * @doc-example Usage
 *   The common shape — Home → section → page with a current cell. Use this as
 *   the copy-paste starting point.
 *   @doc-file breadcrumb.usage.example.ts
 * @doc-example With icons
 *   Project a Home glyph (or any icon) inside the first link for a compact trail.
 *   @doc-file breadcrumb.with-icons.example.ts
 * @doc-example Truncated
 *   `kjMaxItems` clips the middle of long trails and renders an ellipsis cell.
 *   @doc-file breadcrumb.truncated.example.ts
 * @doc-example Custom separator
 *   Swap `--kj-breadcrumb-separator-content` for `›`, `→`, or any glyph.
 *   @doc-file breadcrumb.custom-separator.example.ts
 * @doc-example Long path
 *   How a 6+ level trail collapses with the default overflow behaviour.
 *   @doc-file breadcrumb.long-path.example.ts
 *
 * @doc-keyboard
 *   Tab           — Moves focus to the next breadcrumb link
 *   Enter         — Activates the focused link (native anchor semantics)
 *
 * @doc-aria
 *   aria-label    — `"Breadcrumb"` on the nav landmark; override via `kjAriaLabel`
 *   aria-current  — `"page"` on the terminal `<kj-breadcrumb-current>` cell
 *   role          — `navigation` on the host
 *
 * @doc-touch
 *   Links inherit `<kj-link>` sizing — the `sm` default keeps the trail
 *   compact. Bump `kjSize` on the host or individual links when the trail is
 *   the primary navigation target on mobile.
 *
 * @doc-a11y
 *   Renders a `<nav aria-label="Breadcrumb">` landmark with an ordered list
 *   inside. The current page cell carries `aria-current="page"` (not a link)
 *   so AT users know they're already on it. Separators are decorative — the
 *   default CSS pseudo-element keeps them out of the accessibility tree.
 *
 * @doc-related link,navigation,tabs
 *
 * @doc-css-var
 *   --kj-breadcrumb-gap                — Gap between crumbs and separators.
 *   --kj-breadcrumb-separator-content  — Content for the auto CSS separator. Defaults to `'/'`; swap for `'›'` or any glyph.
 *   --kj-breadcrumb-overflow-pad       — Horizontal padding on the ellipsis cell.
 *   --kj-color-breadcrumb-muted        — Color for non-current crumbs and separators. Inherits --kj-fg-muted.
 *   --kj-color-breadcrumb-current      — Color for the current-page cell. Inherits --kj-fg-default.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name breadcrumb
 * @doc-description Themed breadcrumb trail with a nav landmark, configurable separator, and overflow ellipsis.
 * @doc-is-main
 */
@Component({
  selector: 'nav[kj-breadcrumb], kj-breadcrumb',
  standalone: true,
  hostDirectives: [
    {
      directive: KjBreadcrumb,
      inputs: ['kjAriaLabel', 'kjSeparator', 'kjMaxItems', 'kjOverflow'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './breadcrumb.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-breadcrumb',
    'role': 'navigation',
    '[attr.data-size]': 'kjSize()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBreadcrumbComponent {
  /** Size preset cascaded onto descendants. Default `'md'`. */
  readonly kjSize = input<string>('md');
}

/**
 * Wraps `KjBreadcrumbList`. Renders an `<ol>` host inside the breadcrumb
 * root via host-directive composition.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name breadcrumb
 */
@Component({
  selector: 'ol[kj-breadcrumb-list], kj-breadcrumb-list',
  standalone: true,
  hostDirectives: [{ directive: KjBreadcrumbList, inputs: ['kjWrap'] }],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { 'class': 'kj-breadcrumb-list' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBreadcrumbListComponent {}

/**
 * Wraps `KjBreadcrumbItem`. Renders a `<li>` host inside the list.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name breadcrumb
 */
@Component({
  selector: 'li[kj-breadcrumb-item], kj-breadcrumb-item',
  standalone: true,
  hostDirectives: [KjBreadcrumbItem],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { 'class': 'kj-breadcrumb-item' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBreadcrumbItemComponent {}

/**
 * Wraps `KjBreadcrumbLink`. Renders the per-crumb `<a kjBreadcrumbLink>`
 * with breadcrumb defaults (muted variant, small size, hover-only underline).
 *
 * Renders an inner `<a>` so the link's data attributes, ARIA semantics, and
 * external/disabled plumbing land on the actual hyperlink — mirrors the
 * `<kj-link>` "directive on inner host" pattern.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name breadcrumb
 */
@Component({
  selector: 'kj-breadcrumb-link',
  standalone: true,
  imports: [KjLink],
  template: `
    <a
      kjLink
      class="kj-breadcrumb-link kj-link"
      data-breadcrumb-link=""
      [attr.href]="kjHref() ?? null"
      [attr.target]="kjTarget() ?? null"
      [attr.aria-label]="kjAriaLabel() ?? null"
      [kjVariant]="kjVariant()"
      [kjSize]="kjSize()"
      [kjUnderline]="kjUnderline()"
      [kjExternal]="kjExternal()"
      [kjDisabled]="kjDisabled()"
    >
      <ng-content />
    </a>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBreadcrumbLinkComponent {
  /** Bound to the inner `<a [href]>`. */
  readonly kjHref = input<string | undefined>(undefined);

  /** Bound to the inner `<a [target]>`. */
  readonly kjTarget = input<'_self' | '_blank' | '_parent' | '_top' | string | undefined>(undefined);

  /** Bound to `[attr.aria-label]` on the inner `<a>`. */
  readonly kjAriaLabel = input<string | undefined>(undefined);

  /** KjLink variant. Defaults to `'muted'` (the breadcrumb default). */
  readonly kjVariant = input<string>('muted');

  /** KjLink size. Defaults to `'sm'` (the breadcrumb default). */
  readonly kjSize = input<string>('sm');

  /** Underline mode. Defaults to `'hover'`. */
  readonly kjUnderline = input<'always' | 'hover' | 'none'>('hover');

  /** External-link tri-state. Forwarded to `KjLink`. */
  readonly kjExternal = input(false);

  /** Disabled-link bundle. Forwarded to `KjLink`. */
  readonly kjDisabled = input<boolean, unknown>(false, { transform: booleanAttribute });
}

/**
 * Wraps `KjBreadcrumbCurrent`. Renders a `<span>` cell with
 * `aria-current="page"` (selector restriction on the directive) via
 * host-directive composition.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name breadcrumb
 */
@Component({
  selector: 'span[kj-breadcrumb-current], kj-breadcrumb-current',
  standalone: true,
  hostDirectives: [KjBreadcrumbCurrent],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { 'class': 'kj-breadcrumb-current' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBreadcrumbCurrentComponent {}

/**
 * Wraps `KjBreadcrumbSeparator`. Renders a `<li>` separator cell for
 * icon-based separators (where the auto CSS pseudo-element won't do).
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name breadcrumb
 */
@Component({
  selector: 'li[kj-breadcrumb-separator], kj-breadcrumb-separator',
  standalone: true,
  hostDirectives: [KjBreadcrumbSeparator],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { 'class': 'kj-breadcrumb-separator' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBreadcrumbSeparatorComponent {}

/**
 * Wraps `KjBreadcrumbEllipsis`. Renders an overflow indicator cell.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name breadcrumb
 */
@Component({
  selector: 'kj-breadcrumb-ellipsis',
  standalone: true,
  hostDirectives: [KjBreadcrumbEllipsis],
  template: `<ng-content>…</ng-content>`,
  encapsulation: ViewEncapsulation.None,
  host: { 'class': 'kj-breadcrumb-ellipsis' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBreadcrumbEllipsisComponent {}
