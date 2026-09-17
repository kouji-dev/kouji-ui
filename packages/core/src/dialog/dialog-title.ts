import {
  DestroyRef,
  Directive,
  ElementRef,
  InjectionToken,
  type Signal,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { KjId } from '../primitives/overlay/id';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import { KJ_OVERLAY_ARIA_LABEL, KJ_OVERLAY_ARIA_LABELLED_BY } from '../primitives/overlay/builder';
import { kjDevMode, kjDevWarn } from '../primitives/diagnostics/dev-mode';

/**
 * A panel that can be named by a title element rendered inside it. Provided
 * by `kj-dialog`, `kj-drawer` and `kj-sheet`; a title directive registers
 * its id here and the panel binds it as `aria-labelledby`.
 */
export interface KjOverlayTitleHost {
  /**
   * Adopts `id` as the panel's `aria-labelledby` target.
   * @param id - The title element's id.
   * @returns A callback that releases the title (called on destroy).
   */
  registerTitle(id: string): () => void;
}

/** Injection token for {@link KjOverlayTitleHost}. */
export const KJ_OVERLAY_TITLE_HOST = new InjectionToken<KjOverlayTitleHost>('KJ_OVERLAY_TITLE_HOST');

/**
 * Resolves the id of a title element — the one it already carries, else a
 * minted `kj-<prefix>-N` — and registers it with the enclosing
 * {@link KjOverlayTitleHost} for the directive's lifetime. Call from a title
 * directive's field initialiser.
 * @param prefix - Id prefix for a minted id, e.g. `dialog-title`.
 * @returns The id the host element must render.
 */
export function registerOverlayTitle(prefix: string): string {
  const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const id = el.getAttribute('id') || inject(KjId).mint(prefix);
  const host = inject(KJ_OVERLAY_TITLE_HOST, { optional: true });
  if (host) inject(DestroyRef).onDestroy(host.registerTitle(id));
  return id;
}

/**
 * Marks the heading that names a `<kj-dialog>`. Mints a stable id (or keeps
 * the element's own) and registers it with the dialog, which binds it as
 * `aria-labelledby` — so the dialog is announced by its title, per the
 * WAI-ARIA dialog pattern. Apply to whatever heading level the page's
 * outline needs; the directive never overrides `role`.
 *
 * @example
 * ```html
 * <kj-dialog>
 *   <h2 kjDialogTitle>Save changes?</h2>
 *   …
 * </kj-dialog>
 * ```
 * @doc-category Core/Overlay
 * @doc
 * @doc-name dialog
 */
@Directive({
  selector: '[kjDialogTitle]',
  standalone: true,
  host: {
    class: 'kj-dialog-title',
    '[attr.id]': 'id',
  },
})
export class KjDialogTitle {
  /** Id the dialog references from `aria-labelledby`. */
  readonly id = registerOverlayTitle('dialog-title');
}

/** Reactive accessible-name bindings for a panel body — see {@link overlayAccessibleName}. */
export interface KjOverlayAccessibleName {
  /** Value for `aria-labelledby`: explicit input, builder option, static attribute, else the registered title. */
  readonly ariaLabelledBy: Signal<string | null>;
  /** Value for `aria-label`: only when nothing labels the panel by reference. */
  readonly ariaLabel: Signal<string | null>;
  /** Adopts a title element's id; returns the release callback. */
  registerTitle(id: string): () => void;
}

/**
 * Builds the accessible-name bindings a panel body (`kj-dialog`,
 * `kj-drawer`, `kj-sheet`) hosts. Precedence for `aria-labelledby`: the
 * `kjAriaLabelledBy` input, the builder's `ariaLabelledBy` option, an
 * `aria-labelledby` attribute the element already carried, then the title
 * registered through {@link KJ_OVERLAY_TITLE_HOST}. `aria-label` (the
 * `kjAriaLabel` input, the builder's `ariaLabel` option, `fallbackLabel`, or a
 * static attribute) is bound only when no reference names the panel — it is
 * the name for title-less bodies. In dev mode a panel that opens with neither
 * logs a warning. Call from a component field initialiser.
 * @param inputs - The body's `kjAriaLabel` / `kjAriaLabelledBy` input signals and an optional extra label source.
 */
export function overlayAccessibleName(inputs: {
  label: Signal<string | undefined>;
  labelledBy: Signal<string | undefined>;
  fallbackLabel?: string | null;
}): KjOverlayAccessibleName {
  const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const optLabel = inject(KJ_OVERLAY_ARIA_LABEL, { optional: true });
  const optLabelledBy = inject(KJ_OVERLAY_ARIA_LABELLED_BY, { optional: true });
  const panel = inject(KjOverlayPanel, { self: true, optional: true });
  const staticLabel = el.getAttribute('aria-label');
  const staticLabelledBy = el.getAttribute('aria-labelledby');
  const titleId = signal<string | null>(null);

  const ariaLabelledBy = computed(
    () => inputs.labelledBy() ?? optLabelledBy ?? staticLabelledBy ?? titleId(),
  );
  const ariaLabel = computed(() =>
    ariaLabelledBy() ? null : (inputs.label() ?? optLabel ?? inputs.fallbackLabel ?? staticLabel ?? null),
  );

  if (kjDevMode() && panel) {
    effect(() => {
      if (panel.state() !== 'open') return;
      if (ariaLabelledBy() || ariaLabel()) return;
      kjDevWarn(
        el.localName,
        `opened without an accessible name. Add a title ` +
          `(e.g. <h2 kjDialogTitle>), pass ariaLabel / ariaLabelledBy to open(), or bind kjAriaLabel.`,
      );
    });
  }

  return {
    ariaLabelledBy,
    ariaLabel,
    registerTitle(id: string) {
      titleId.set(id);
      return () => {
        if (titleId() === id) titleId.set(null);
      };
    },
  };
}
