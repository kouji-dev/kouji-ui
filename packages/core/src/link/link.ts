import {
  Directive,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { KjFocusRing, KjDisabled } from '../primitives';
import { KjVariant, KjSize, bindPresets } from '../presets';
import { KJ_LINK_CONFIG } from './config';

/** CSS class applied to the visually-hidden "(opens in new tab)" suffix span. */
const KJ_LINK_EXTERNAL_SUFFIX_CLASS = 'kj-link-external-suffix';

/** AT suffix copy. English-only for v1; i18n is a v1.1 concern (see analysis §15). */
const KJ_LINK_EXTERNAL_SUFFIX_TEXT = '(opens in new tab)';

/** Inline style string equivalent to `KjVisuallyHidden` — applied to the AT suffix span. */
const KJ_LINK_VISUALLY_HIDDEN_STYLE =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0';

/**
 * Enhances a native `<a>` (or any element used as a link) with kouji-ui
 * presets, focus-ring and disabled-link plumbing, and external-link
 * `rel` + AT suffix discipline.
 *
 * Composes `KjVariant`, `KjSize`, `KjFocusRing`, and `KjDisabled` via
 * `hostDirectives`. Variants and sizes are configurable via
 * `provideKjLink(…)`.
 *
 * Owns three behaviours that a CSS-only solution cannot deliver:
 *
 * 1. **External-link plumbing.** When `kjExternal` is `true` (or `undefined`
 *    and the host carries `target="_blank"`), the directive ensures `rel`
 *    contains both `noopener` and `noreferrer` (additive — preserves any
 *    consumer-supplied `rel` tokens like `nofollow`, `me`, `bookmark`) and
 *    appends a visually-hidden `(opens in new tab)` `<span>` to the host's
 *    accessible name. The suffix is suppressed when the consumer has set
 *    their own `aria-label` (the consumer is presumed to have authored the
 *    complete accessible name).
 *
 * 2. **Disabled-link bundle.** When `kjDisabled` is `true`, the directive
 *    sets `aria-disabled="true"`, `tabindex="-1"`, and capture-phase
 *    intercepts both `click` and `keydown.enter` to call `preventDefault()`
 *    and `stopImmediatePropagation()`. Capture phase ensures the suppression
 *    runs before any consumer-bound `(click)` handler and before Angular
 *    Router's bubble-phase click handler — so `<a kjLink routerLink="/foo"
 *    [kjDisabled]="true">` does not navigate either.
 *
 * 3. **Underline-mode reflection.** `kjUnderline: 'always' | 'hover' |
 *    'none'` reflects to `[attr.data-underline]` for the components-package
 *    CSS to key off. The `kj-prose a` selector overrides only when the
 *    directive's input is left at its default — explicit consumer values
 *    win over the prose container's defaults.
 *
 * @example
 * ```html
 * <a kjLink href="/about">Inline link</a>
 * <a kjLink href="https://example.com" target="_blank">External</a>
 * <a kjLink [kjDisabled]="!ready()" routerLink="/billing">Manage billing</a>
 * ```
 *
 * @category Core/Navigation
 */
@Directive({
  selector: 'a[kjLink], [kjLink]',
  standalone: true,
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
    KjFocusRing,
    { directive: KjDisabled, inputs: ['kjDisabled'] },
  ],
  providers: [...bindPresets(KJ_LINK_CONFIG)],
  host: {
    '[attr.data-underline]': 'kjUnderline()',
    '[attr.data-external]': 'isExternal() ? "true" : null',
    '[attr.tabindex]': 'kjDisabled() ? "-1" : null',
    '[attr.rel]': 'relAttr()',
  },
})
export class KjLink {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Disables the link. Forwarded to `KjDisabled` (which reflects
   * `aria-disabled` and `data-disabled`); the directive additionally sets
   * `tabindex="-1"` and intercepts `click` + `keydown.enter` in the capture
   * phase.
   */
  readonly kjDisabled = input(false);

  /**
   * Underline policy. `'always'` for in-content links (WCAG 1.4.1 — colour
   * is not the only means); `'hover'` for standalone links sitting in a
   * group of links that already signals "this is a link" via layout;
   * `'none'` for the rare cases where the consumer wants to suppress the
   * underline entirely (e.g. icon-text links inside breadcrumb separators).
   * Reflects `[attr.data-underline]`.
   */
  readonly kjUnderline = input<'always' | 'hover' | 'none'>('hover');

  /**
   * External-link tri-state. `undefined` (default) auto-detects from the
   * host's `target` attribute (`target="_blank"` → external). `true` forces
   * external treatment regardless of `target` (e.g. for cross-origin URLs
   * served through the app's router that still warrant the indicator).
   * `false` forces internal treatment even when `target="_blank"` is
   * present (suppresses the icon and AT suffix).
   */
  readonly kjExternal = input<boolean | undefined>(undefined);

  /** Whether the host element currently carries `target="_blank"`. */
  protected readonly hasBlankTarget = computed(() => this.targetSignal() === '_blank');

  /** Computed external state — explicit input wins, else target-based auto-detect. */
  protected readonly isExternal = computed(() => {
    const explicit = this.kjExternal();
    if (explicit !== undefined) return explicit;
    return this.hasBlankTarget();
  });

  /**
   * `rel` attribute computation. Additive: existing tokens (`nofollow`,
   * `me`, `bookmark`, …) are preserved; the directive only adds the missing
   * `noopener` / `noreferrer` security tokens when external. When not
   * external, the directive returns `null` so the consumer's literal `rel`
   * attribute (read at construction) is preserved as-is.
   */
  protected readonly relAttr = computed(() => {
    if (!this.isExternal()) return this.initialRel || null;
    const tokens = new Set<string>();
    if (this.initialRel) {
      for (const token of this.initialRel.split(/\s+/u)) {
        if (token) tokens.add(token);
      }
    }
    tokens.add('noopener');
    tokens.add('noreferrer');
    return [...tokens].join(' ');
  });

  /**
   * Snapshot of the host's `target` attribute. Re-read after the host
   * renders — host bindings are evaluated synchronously on creation, so
   * the SSR HTML carries the right `[data-external]` / `[rel]` values
   * provided the consumer's `target` is set declaratively in the template
   * (the common case).
   */
  private readonly targetSignal = (() => {
    const initial = this.el.nativeElement.getAttribute('target');
    return computed(() => initial);
  })();

  /** Snapshot of the host's `rel` attribute at construction time. */
  private readonly initialRel: string | null = this.el.nativeElement.getAttribute('rel');

  /** Reference to the injected AT suffix span, if any. Cleaned up on toggle. */
  private suffixSpan: HTMLSpanElement | null = null;

  constructor() {
    // Capture-phase native listeners: fire BEFORE Angular's template-bound
    // bubble-phase (click) handlers and before Angular Router's bubble-phase
    // click handler on `<a routerLink>`, so `stopImmediatePropagation()`
    // actually prevents both navigation and any consumer (click) handlers.
    afterNextRender(() => {
      const node = this.el.nativeElement;

      const onClick = (event: Event) => {
        if (this.kjDisabled()) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      };

      const onKeydown = (event: KeyboardEvent) => {
        if (this.kjDisabled() && event.key === 'Enter') {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      };

      node.addEventListener('click', onClick, { capture: true });
      node.addEventListener('keydown', onKeydown, { capture: true });
    });

    // External-link AT suffix injection. Runs reactively so the suffix
    // appears / disappears as `kjExternal` (or the host's `target`) changes.
    // The effect itself is created in injection context (constructor); its
    // first run happens after the first change-detection pass, by which
    // point the host element has been attached to the DOM in browser
    // contexts. SSR contexts skip the DOM mutation by guarding on
    // `typeof document` — host bindings carry the `data-external` /
    // `rel` story for SSR.
    effect(() => {
      const external = this.isExternal();
      if (typeof document === 'undefined') return;

      const node = this.el.nativeElement;
      const consumerOwnsName = node.hasAttribute('aria-label');

      if (external && !consumerOwnsName) {
        if (!this.suffixSpan) {
          const span = document.createElement('span');
          span.className = KJ_LINK_EXTERNAL_SUFFIX_CLASS;
          span.setAttribute('style', KJ_LINK_VISUALLY_HIDDEN_STYLE);
          // Leading space so AT reads "Documentation (opens in new tab)"
          // not "Documentation(opens in new tab)".
          span.textContent = ` ${KJ_LINK_EXTERNAL_SUFFIX_TEXT}`;
          node.appendChild(span);
          this.suffixSpan = span;
        }
      } else if (this.suffixSpan) {
        this.suffixSpan.remove();
        this.suffixSpan = null;
      }
    });
  }
}
