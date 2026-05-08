import {
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  isDevMode,
} from '@angular/core';
import { KjSize, type KjSizePreset } from '../presets';

/**
 * Default size preset used by Kbd consumers (`xs / sm / md / lg`, default `md`).
 *
 * Re-exported so core-package consumers applying `[kjKbd]` directly to their
 * own `<kbd>` elements can opt into the same size scale the eventual styled
 * wrapper will provide, via:
 *
 * ```ts
 * providers: [{ provide: KJ_SIZE_PRESET, useValue: KJ_KBD_SIZE_PRESET }]
 * ```
 *
 * Avoids the silent-drift case where a consumer picks `'huge'` and the
 * directive's dev-mode validator passes (because the consumer's preset didn't
 * list it) but the CSS doesn't recognise the value. See
 * `docs/component-analyses/data-display/kbd.md` (Open question 13).
 */
export const KJ_KBD_SIZE_PRESET: KjSizePreset = {
  values: ['xs', 'sm', 'md', 'lg'],
  default: 'md',
};

/**
 * Marks an element as a kouji keyboard-key visual (`<kbd>`). The directive is
 * a pure visual primitive: it composes `KjSize` (the only configurable axis)
 * and otherwise relies on the native `<kbd>` element's a11y semantics.
 *
 * The host element is consumer-supplied. The recommended host is `<kbd>`
 * (native semantic — implicit `role="generic"` per HTML AAM, but commonly
 * announced with a "key" prefix in verbose AT modes); applying `[kjKbd]` to
 * any other element is dev-mode warned but not enforced (consumers wanting a
 * `<span>` host for inline-baseline reasons get an escape hatch).
 *
 * **No variant.** Kbd is tonally neutral — there is no "destructive kbd" or
 * "primary kbd". A future design language wanting e.g. a "deprecated shortcut"
 * tone can fold in via a CSS-only `[data-deprecated="true"]` attribute without
 * API churn.
 *
 * **No keyboard contract.** Kbd is non-focusable, non-clickable. Consumers
 * wanting a clickable shortcut chip wrap a `<button kjButton>` around the
 * `<kbd kjKbd>` and the button owns the click / focus / a11y story. Embedding
 * a focusable descendant inside `[kjKbd]` is dev-mode warned because most AT
 * will re-parent or strip the interactive child out of the kbd's accessible
 * name.
 *
 * **No `aria-label` injection.** When the visible text is a unicode glyph
 * (`⌘`, `⌥`, `↵`) the consumer sets `aria-label` directly on the host —
 * exactly the same idiom as setting `aria-label` on any HTML element. The
 * directive does not declare a duplicate input for it. (The eventual
 * `<kj-kbd>` wrapper exposes a template-driven `kjKbdAriaLabel` input that
 * forwards to `[attr.aria-label]`; that is the wrapper's call, not the
 * directive's.)
 *
 * @example
 * ```html
 * <kbd kjKbd>Enter</kbd>
 * <kbd kjKbd kjSize="xs">⌘</kbd>
 * <kbd kjKbd aria-label="Command">⌘</kbd>
 * ```
 * @category Core/Data display
 * @doc
 * @doc-name kbd
 * @doc-description Marks an element as a keyboard-key visual, composing `KjSize` for the only configurable axis and relying on the native `<kbd>` element's semantics — non-interactive and styling-free by design.
 * @doc-is-main
 */
@Directive({
  selector: '[kjKbd]',
  standalone: true,
  hostDirectives: [{ directive: KjSize, inputs: ['kjSize'] }],
})
export class KjKbd {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    if (isDevMode()) {
      afterNextRender(() => {
        const host = this.el.nativeElement;

        if (host.tagName?.toLowerCase() !== 'kbd') {
          console.warn(
            `[kj] kjKbd applied to <${host.tagName?.toLowerCase()}>. ` +
              `Recommended host element is <kbd> for native semantics ` +
              `(WCAG 1.3.1 / 4.1.2). Apply only to non-kbd elements when ` +
              `you have a specific styling reason.`,
          );
        }

        if (hasFocusableDescendant(host)) {
          console.warn(
            `[kj] kjKbd contains a focusable descendant. Kbd is a ` +
              `non-interactive visual primitive; most AT will re-parent or ` +
              `strip interactive children out of the kbd's accessible name. ` +
              `Wrap the <kbd kjKbd> inside a <button kjButton> instead of ` +
              `nesting an interactive element inside it.`,
          );
        }
      });
    }
  }
}

/**
 * Selector matching elements that are focusable by default. Intentionally
 * narrow: this is a dev-mode advisory, not an a11y enforcement gate, so we
 * accept the small risk of missing exotic focusable descendants
 * (`contenteditable`, embedded `<object>` with focusable controls, etc.) in
 * favour of a fast first-pass check.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'audio[controls]',
  'video[controls]',
  '[tabindex]',
  '[contenteditable=""]',
  '[contenteditable="true"]',
].join(',');

function hasFocusableDescendant(host: HTMLElement): boolean {
  return host.querySelector(FOCUSABLE_SELECTOR) !== null;
}
