import {
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  signal,
  Signal,
  untracked,
} from '@angular/core';
import { KjRovingTabindex, KjRovingTabindexItemDirective } from '../a11y/roving-tabindex';
import { KjDisabled } from '../primitives/interaction/disabled';
import { KjFocusRing } from '../primitives/interaction/focus-ring';
import {
  KJ_TABS,
  KjTabsActivationMode,
  KjTabsContext,
  KjTabsOrientation,
} from './tabs.context';

let kjTabsSeedCounter = 0;
function nextSeed(): string {
  // Try crypto.randomUUID where available (browser, jsdom 22+, node 19+).
  // Fall back to a counter so SSR / older environments still produce a stable string.
  const cryptoLike = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoLike?.randomUUID) return cryptoLike.randomUUID().slice(0, 8);
  return `kj${(++kjTabsSeedCounter).toString(36)}`;
}

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
  providers: [{ provide: KJ_TABS, useExisting: KjTabs }],
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

  private readonly idSeed = nextSeed();

  /** @internal Map of value → registered tab; keeps document order via insertion. */
  private readonly _tabs = signal<readonly KjTab[]>([]);

  /** Public read-only registration list, in document order. */
  readonly tabs = this._tabs.asReadonly();

  /** Currently resolved active tab (may be undefined when value matches no tab). */
  readonly activeTab = computed<KjTab | undefined>(() =>
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

  /** @internal Called by `KjTab.ngOnInit` to register itself in document order. */
  register(tab: KjTab): void {
    this._tabs.update((list) => (list.includes(tab) ? list : [...list, tab]));
  }

  /** @internal Called by `KjTab` on destroy. */
  unregister(tab: KjTab): void {
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
 * Orientation is read from the parent `KJ_TABS` context and forwarded to the
 * roving primitive through its `kjRovingOrientation` input via a host binding
 * on the exposed input.
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name tabs
 */
@Directive({
  selector: '[kjTabList]',
  standalone: true,
  hostDirectives: [KjRovingTabindex],
  host: {
    '[attr.role]': '"tablist"',
    '[attr.aria-orientation]': 'tabs.orientation()',
    '[attr.data-orientation]': 'tabs.orientation()',
  },
})
export class KjTabList implements OnInit, OnDestroy {
  /** @internal */
  readonly tabs = inject(KJ_TABS);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly keydownFilter = (event: KeyboardEvent): void => {
    const orientation = this.tabs.orientation();
    if (orientation === 'horizontal') {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        // Off-axis: prevent the composed KjRovingTabindex from acting.
        event.stopImmediatePropagation();
      }
    } else if (orientation === 'vertical') {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.stopImmediatePropagation();
      }
    }
  };

  ngOnInit(): void {
    // Capture phase + `addEventListener` directly on the host: this listener
    // fires before the composed KjRovingTabindex's `(keydown)` host binding,
    // so we can swallow off-axis arrow keys per the parent KjTabs orientation
    // (the WAI-ARIA APG contract for tab strips).
    this.el.nativeElement.addEventListener('keydown', this.keydownFilter, true);
  }

  ngOnDestroy(): void {
    this.el.nativeElement.removeEventListener('keydown', this.keydownFilter, true);
  }
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
  hostDirectives: [KjRovingTabindexItemDirective, KjFocusRing, KjDisabled],
  host: {
    '[attr.role]': '"tab"',
    '[attr.id]': 'tabs.tabId(kjTabValue())',
    '[attr.aria-controls]': 'tabs.panelId(kjTabValue())',
    '[attr.aria-selected]': 'isActive() ? "true" : "false"',
    '[attr.aria-disabled]': 'kjTabDisabled() ? "true" : null',
    '[attr.data-state]': 'isActive() ? "active" : "inactive"',
    '[attr.data-disabled]': 'kjTabDisabled() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeydown($event)',
    '(focus)': 'onFocus()',
  },
})
export class KjTab implements OnInit, OnDestroy {
  /** @internal */
  readonly tabs = inject(KJ_TABS) as KjTabs;
  /** @internal Native host element. */
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Required string key wiring this tab to its corresponding panel. */
  readonly kjTabValue = input.required<string>();

  /** When true, the tab cannot be activated but remains in the focus ring. */
  readonly kjTabDisabled = input<boolean>(false);

  /** When true, Delete on the focused tab fires `kjClose`. */
  readonly kjClosable = input<boolean>(false);

  /** Fires when the user closes this tab (Delete key). Emits the tab's value. */
  readonly kjClose = output<string>();

  /** Whether this tab is the currently active one. */
  readonly isActive = computed(() => this.tabs.isActive(this.kjTabValue()));

  ngOnInit(): void {
    this.tabs.register(this);
  }

  ngOnDestroy(): void {
    this.tabs.unregister(this);
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
    '[attr.data-state]': 'isActive() ? "active" : "inactive"',
  },
})
export class KjTabPanel {
  /** @internal */
  readonly tabs = inject(KJ_TABS);

  /** Required string key wiring this panel to its corresponding tab. */
  readonly kjPanelValue = input.required<string>();

  /** Whether this panel is the active one. */
  readonly isActive = computed(() => this.tabs.isActive(this.kjPanelValue()));

  private readonly _mounted = signal(false);

  /**
   * `true` after this panel has been activated at least once. Consumers wrap
   * the panel's projected content in `@if (panel.mounted())` to mount the
   * content lazily on first activation and keep it mounted thereafter.
   */
  readonly mounted = this._mounted.asReadonly();

  constructor() {
    effect(() => {
      if (this.isActive() && !this._mounted()) this._mounted.set(true);
    });
  }
}
