import {
  afterRenderEffect,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  Signal,
  untracked,
} from '@angular/core';
import { tabbableElements } from '../a11y/focus-trap';
import {
  KJ_ROVING_ORIENTATION_DEFAULT,
  KJ_ROVING_TABINDEX,
  KjRovingTabindex,
  KjRovingTabindexItem,
} from '../a11y/roving-tabindex';
import { KjDisabled } from '../primitives/interaction/disabled';
import { KjFocusRing } from '../primitives/interaction/focus-ring';
import {
  KJ_TABS,
  KjTabsActivationMode,
  KjTabRef,
  KjTabsContext,
  KjTabsOrientation,
} from './tabs.context';
import { KjId } from '../primitives/overlay/id';
import { KjVariant } from '../presets/variant';
import { bindPresets } from '../presets/bind-presets';
import { KJ_TABS_CONFIG } from './config';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Root tabs container. Owns the active value, orientation, activation mode,
 * and the registration list of child tabs/panels. Provides `KJ_TABS` to its
 * descendants for ARIA wiring and selection coordination.
 *
 * @example
 * ```html
 * <div kjTabs [(kjValue)]="active" kjOrientation="horizontal" kjActivationMode="automatic">
 *   <div kjTabList>
 *     <button kjTab kjTabValue="overview">Overview</button>
 *     <button kjTab kjTabValue="billing">Billing</button>
 *   </div>
 *   <div kjTabPanel kjPanelValue="overview">…</div>
 *   <div kjTabPanel kjPanelValue="billing">…</div>
 * </div>
 * ```
 * @doc-category Core/Navigation
 * @doc
 * @doc-name tabs
 * @doc-description Unstyled tabs root with active-value, orientation, and activation mode for tab and panel children.
 * @doc-is-main
 */
@Directive({
  selector: '[kjTabs]',
  standalone: true,
  // The preset wiring lives here, not in the styled `<kj-tabs>` wrapper, so a
  // headless `<div kjTabs>` reflects `data-variant` and `provideKjTabs(…)`
  // reaches it — before this, both only worked through the styled package.
  //
  // `KjVariant`'s input is deliberately NOT re-exposed here. `<kj-tabs>`
  // publishes it under the components-package spelling (`variant`), and
  // Angular rejects one host-directive input exposed under two public names
  // (TS-99 / NG0312). Headless consumers choose a variant with
  // `provideKjTabs({ defaults: { variant: … } })` at whatever injector scope
  // they want, or by adding `KjVariant` to the element themselves.
  hostDirectives: [KjVariant],
  providers: [
    { provide: KJ_TABS, useExisting: KjTabs },
    ...bindPresets(KJ_TABS_CONFIG),
  ],
  host: {
    '[attr.data-orientation]': 'kjOrientation()',
  },
})
export class KjTabs implements KjTabsContext {
  /** Two-way bound active tab value. String-keyed; `''` means "no tab active yet". */
  readonly kjValue = model<string>('');

  /** Tabs orientation. Drives `aria-orientation` on the tablist and the arrow-key axis. */
  readonly kjOrientation = input<KjTabsOrientation>('horizontal');

  /**
   * Activation mode per WAI-ARIA APG.
   * - `'automatic'` (default): focus moves and the focused tab is activated immediately.
   * - `'manual'`: focus moves only; Enter or Space activates the focused tab.
   */
  readonly kjActivationMode = input<KjTabsActivationMode>('automatic');

  /** Read-only view of the active tab value. */
  readonly value: Signal<string> = this.kjValue.asReadonly();

  /** Read-only view of the orientation. */
  readonly orientation: Signal<KjTabsOrientation> = this.kjOrientation;

  /** Read-only view of the activation mode. */
  readonly activationMode: Signal<KjTabsActivationMode> = this.kjActivationMode;

  /** Deterministic id root for this tab set — see the note on `KjId`. */
  private readonly idSeed = inject(KjId).mint('tabs');

  /** @internal Map of value → registered tab; keeps document order via insertion. */
  private readonly _tabs = signal<readonly KjTabRef[]>([]);

  /** Public read-only registration list, in document order. */
  readonly tabs = this._tabs.asReadonly();

  /** Currently resolved active tab (may be undefined when value matches no tab). */
  readonly activeTab = computed<KjTabRef | undefined>(() =>
    this._tabs().find((t) => t.kjTabValue() === this.kjValue()),
  );

  constructor() {
    // Default-value reconciliation: when kjValue is unset (`''`) and at least one
    // non-disabled tab is registered, activate the first non-disabled tab.
    effect(() => {
      const list = this._tabs();
      const current = this.kjValue();
      if (current === '' && list.length > 0) {
        const first = untracked(() => list.find((t) => !t.kjTabDisabled()) ?? list[0]);
        if (first) {
          // Defer to avoid writing during a parent change-detection pass.
          queueMicrotask(() => {
            if (this.kjValue() === '') this.kjValue.set(first.kjTabValue());
          });
        }
      }
    });
  }

  /** @internal Called by `KjTab` on construction to register itself in document order. */
  register(tab: KjTabRef): void {
    this._tabs.update((list) => (list.includes(tab) ? list : [...list, tab]));
  }

  /** @internal Called by `KjTab` on destroy. */
  unregister(tab: KjTabRef): void {
    this._tabs.update((list) => list.filter((t) => t !== tab));
  }

  /** Returns whether the tab/panel pair for `value` is the active one. */
  isActive(value: string): boolean {
    return this.kjValue() === value;
  }

  /** Stable id for the tab element associated with `value`. */
  tabId(value: string): string {
    return `kj-tab-${value}-${this.idSeed}`;
  }

  /** Stable id for the panel element associated with `value`. */
  panelId(value: string): string {
    return `kj-panel-${value}-${this.idSeed}`;
  }

  /** Activates the tab/panel pair for `value`. No-op if the matching tab is disabled. */
  select(value: string): void {
    const target = this._tabs().find((t) => t.kjTabValue() === value);
    if (target?.kjTabDisabled()) return;
    if (this.kjValue() !== value) this.kjValue.set(value);
  }

  /** Imperative: advance to the next non-disabled tab. Clamps at the end. */
  next(): void {
    const list = this._tabs();
    const idx = list.findIndex((t) => t.kjTabValue() === this.kjValue());
    for (let i = idx + 1; i < list.length; i++) {
      if (!list[i].kjTabDisabled()) {
        this.select(list[i].kjTabValue());
        return;
      }
    }
  }

  /** Imperative: advance to the previous non-disabled tab. Clamps at the start. */
  previous(): void {
    const list = this._tabs();
    const idx = list.findIndex((t) => t.kjTabValue() === this.kjValue());
    for (let i = idx - 1; i >= 0; i--) {
      if (!list[i].kjTabDisabled()) {
        this.select(list[i].kjTabValue());
        return;
      }
    }
  }
}

/**
 * Tab list container. Hosts `role="tablist"` + `aria-orientation` and composes
 * `KjRovingTabindex` to manage the single-tab-stop arrow-key navigation.
 *
 * The roving primitive's axis is pinned to the parent `KJ_TABS` orientation
 * through `KJ_ROVING_ORIENTATION_DEFAULT`, so off-axis arrow keys are ignored
 * by the primitive itself (the WAI-ARIA APG contract for tab strips) and the
 * tab stop follows the selected tab.
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name tabs
 */
@Directive({
  selector: '[kjTabList]',
  standalone: true,
  hostDirectives: [KjRovingTabindex],
  providers: [
    { provide: KJ_ROVING_ORIENTATION_DEFAULT, useFactory: () => injectParent(KJ_TABS, { child: 'KjTabList', parent: '[kjTabs]' }).orientation },
  ],
  host: {
    '[attr.role]': '"tablist"',
    '[attr.aria-orientation]': 'tabs.orientation()',
    '[attr.data-orientation]': 'tabs.orientation()',
  },
})
export class KjTabList {
  /** @internal */
  readonly tabs = injectParent(KJ_TABS, { child: 'KjTabList', parent: '[kjTabs]' });
}

/**
 * Tab trigger. Hosts `role="tab"` + the ARIA wiring (`aria-selected`,
 * `aria-controls`, `id`) and composes `KjRovingTabindexItem`, `KjFocusRing`
 * and `KjDisabled`. Click activates the tab; Enter/Space activate (always
 * honoured, required in manual mode); Delete fires `kjClose` when
 * `kjClosable` is true.
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name tabs
 */
@Directive({
  selector: '[kjTab]',
  standalone: true,
  hostDirectives: [
    KjRovingTabindexItem,
    KjFocusRing,
    // arch F-16: `KjDisabled` was composed but exposed no input, so its
    // `aria-disabled` / `data-disabled` bindings always wrote `null` while a
    // second, untransformed `kjTabDisabled` input wrote the real value onto
    // the same two attributes. Exposing the primitive's input under the
    // published name leaves exactly one owner — and gives the bare-attribute
    // form the `booleanAttribute` transform it was missing (arch F-2).
    { directive: KjDisabled, inputs: ['kjDisabled: kjTabDisabled'] },
  ],
  host: {
    '[attr.role]': '"tab"',
    '[attr.id]': 'tabs.tabId(kjTabValue())',
    '[attr.aria-controls]': 'tabs.panelId(kjTabValue())',
    '[attr.aria-selected]': 'isActive() ? "true" : "false"',
    '[attr.data-state]': 'isActive() ? "active" : "inactive"',
    '(click)': 'onClick()',
    '(keydown)': 'onKeydown($event)',
    '(focus)': 'onFocus()',
  },
})
export class KjTab implements KjTabRef {
  /** @internal */
  readonly tabs = injectParent(KJ_TABS, { child: 'KjTab', parent: '[kjTabs]' });
  /** @internal Native host element. */
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly roving = inject(KJ_ROVING_TABINDEX, { optional: true });

  /** Required string key wiring this tab to its corresponding panel. */
  readonly kjTabValue = input.required<string>();

  /**
   * When true, the tab cannot be activated and arrow keys skip it. Defaults to
   * `false`. Bound as `kjTabDisabled`; owned by the composed {@link KjDisabled},
   * which reflects `aria-disabled` and `data-disabled`.
   */
  readonly kjTabDisabled = inject(KjDisabled).disabled;

  /** When true, Delete on the focused tab fires `kjClose`. Defaults to `false`. */
  readonly kjClosable = input(false, { transform: booleanAttribute });

  /** Fires when the user closes this tab (Delete key). Emits the tab's value. */
  readonly kjClose = output<string>();

  /** Whether this tab is the currently active one. */
  readonly isActive = computed(() => this.tabs.isActive(this.kjTabValue()));

  constructor() {
    this.tabs.register(this);
    inject(DestroyRef).onDestroy(() => this.tabs.unregister(this));
    // APG tabs: the tablist's single tab stop is the selected tab.
    effect(() => {
      if (this.isActive()) this.roving?.setActive(this.el.nativeElement);
    });
  }

  /** @internal Click handler. */
  onClick(): void {
    if (this.kjTabDisabled()) return;
    this.tabs.select(this.kjTabValue());
  }

  /** @internal Focus handler — activates immediately in `automatic` mode. */
  onFocus(): void {
    if (this.kjTabDisabled()) return;
    if (this.tabs.activationMode() === 'automatic') {
      this.tabs.select(this.kjTabValue());
    }
  }

  /** @internal Keydown — Enter/Space activate (always honoured); Delete closes when closable. */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      if (this.kjTabDisabled()) return;
      event.preventDefault();
      this.tabs.select(this.kjTabValue());
      return;
    }
    if (event.key === 'Delete' && this.kjClosable()) {
      event.preventDefault();
      this.kjClose.emit(this.kjTabValue());
      return;
    }
  }
}

/**
 * Tab panel. Hosts `role="tabpanel"` + `aria-labelledby` + `id` + `hidden`.
 * Tracks first-activation history via `mounted`: it flips `true` on first
 * activation and stays `true` thereafter, so consumers can gate the
 * projected content with `@if (panel.mounted())` to implement the
 * lazy-then-persistent mount posture from the analysis.
 *
 * Per the APG, the active panel gets `tabindex="0"` when it contains no
 * tabbable element, so Tab from the tab strip lands on the panel content
 * instead of skipping it; a panel with its own controls stays out of the
 * tab sequence. The check runs after each render in which the panel is
 * active.
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name tabs
 */
@Directive({
  selector: '[kjTabPanel]',
  standalone: true,
  exportAs: 'kjTabPanel',
  host: {
    '[attr.role]': '"tabpanel"',
    '[attr.id]': 'tabs.panelId(kjPanelValue())',
    '[attr.aria-labelledby]': 'tabs.tabId(kjPanelValue())',
    '[attr.hidden]': 'isActive() ? null : ""',
    '[attr.tabindex]': 'isActive() && !hasTabbableContent() ? "0" : null',
    '[attr.data-state]': 'isActive() ? "active" : "inactive"',
  },
})
export class KjTabPanel {
  /** @internal */
  readonly tabs = injectParent(KJ_TABS, { child: 'KjTabPanel', parent: '[kjTabs]' });
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Required string key wiring this panel to its corresponding tab. */
  readonly kjPanelValue = input.required<string>();

  /** Whether this panel is the active one. */
  readonly isActive = computed(() => this.tabs.isActive(this.kjPanelValue()));

  private readonly _mounted = signal(false);
  private readonly _hasTabbableContent = signal(false);

  /**
   * `true` after this panel has been activated at least once. Consumers wrap
   * the panel's projected content in `@if (panel.mounted())` to mount the
   * content lazily on first activation and keep it mounted thereafter.
   */
  readonly mounted = this._mounted.asReadonly();

  /** Whether the panel currently contains a tabbable element (measured after render). */
  readonly hasTabbableContent = this._hasTabbableContent.asReadonly();

  constructor() {
    effect(() => {
      if (this.isActive() && !this._mounted()) this._mounted.set(true);
    });
    afterRenderEffect(() => {
      if (!this.isActive()) return;
      this._hasTabbableContent.set(tabbableElements(this.el.nativeElement).length > 0);
    });
  }
}
