import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  ViewEncapsulation,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import type { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import {
  KJ_LIST_FOCUS_MODE,
  KjListNavigator,
  type KjListFocusMode,
} from '../primitives/list';
import { KJ_TREE_SELECT } from './tree-select.context';

// Token override below pins the focus mode to `'roving'` for descendant
// `KjListItem`s. Defined at module scope so it can be referenced from
// the `providers` array literal without a class capture.
const ROVING_FOCUS_MODE = signal<KjListFocusMode>('roving');

/**
 * Tree panel container. Composes `KjOverlayPanel` for mount/position/role
 * wiring (carries `role="tree"` from the panel role provider) and
 * `KjListNavigator` for the generic Up/Down / Home/End / Enter / Space /
 * type-ahead contract. The tree-specific ArrowLeft / ArrowRight keys
 * remain handled here because they carry expand/collapse +
 * parent/first-child semantics the generic navigator doesn't cover.
 *
 * Roving DOM focus is wired here (rather than via the navigator's own
 * `kjFocusMode="roving"` mode) because Angular's `hostDirectives.inputs`
 * surface can only rename inputs — it can't push a static default into a
 * composed input signal. Instead this component (1) overrides the
 * `KJ_LIST_FOCUS_MODE` provider so child `KjListItem`s flip their
 * `tabindex` correctly, and (2) drives the active-item DOM focus via a
 * local effect on `KjListNavigator.activeId()`. The navigator itself
 * continues to run its keyboard / type-ahead state machine unchanged.
 *
 * @doc-category Core/Inputs
 */
@Component({
  selector: 'kj-tree-select-content',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
    KjListNavigator,
  ],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'tree' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo() },
    // Pin items' focus model to `'roving'` (per WAI-ARIA APG tree). This
    // overrides the provider the navigator registers (which mirrors the
    // navigator's own `kjFocusMode` signal). The navigator's internal
    // seed / focus effects are skipped — both are driven here instead.
    { provide: KJ_LIST_FOCUS_MODE, useValue: ROVING_FOCUS_MODE },
  ],
  host: {
    '[attr.aria-multiselectable]':
      'ctx?.selectionMode() === "multiple" ? "true" : null',
    '(keydown)': 'onKeydown($event)',
    '(document:keydown.escape)': 'controller?.close("esc")',
    '(document:click)': 'onDocClick($event)',
    '(click)': '$event.stopPropagation()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjTreeSelectContent {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly _injector = inject(Injector);
  private _panelCache: KjOverlayPanel | null | undefined = undefined;
  private get _panel(): KjOverlayPanel | null {
    if (this._panelCache === undefined) {
      this._panelCache = this._injector.get(KjOverlayPanel, null);
    }
    return this._panelCache;
  }
  /** @internal */
  get controller(): KjOverlayController | null {
    return this._panel?.controller ?? null;
  }
  /** @internal */
  readonly ctx = inject(KJ_TREE_SELECT, { optional: true });
  // The composed `KjListNavigator` owns the generic Up/Down/Home/End/
  // Enter/Space/type-ahead contract. We read its `activeItem()` below to
  // anchor ArrowLeft / ArrowRight off the currently focused tree node
  // and to follow the active id with DOM focus (roving model).
  private readonly nav = inject(KjListNavigator);

  readonly kjSide = input<KjSide>('bottom');
  readonly kjAlign = input<KjAlign>('start');
  readonly kjOffset = input<number, unknown>(4, {
    transform: v => Number(v) || 4,
  });

  constructor() {
    const pos = inject(KJ_OVERLAY_POSITION_STRATEGY) as ReturnType<typeof anchoredTo>;
    pos.configure({ side: this.kjSide, align: this.kjAlign, offset: this.kjOffset, matchTriggerWidth: 'min' });

    // Roving focus follow: mirror the navigator's `activeId` to DOM
    // focus. Equivalent to `KjListNavigator`'s internal focus effect,
    // re-implemented here because the navigator's effect is gated on
    // `kjFocusMode() === 'roving'` and we can't statically push that
    // value into a hostDirective input signal.
    effect(() => {
      const item = this.nav.activeItem();
      if (!item) return;
      const host = item._host();
      if (host && document.activeElement !== host) host.focus();
    });
  }

  /** @internal */
  onDocClick(event: MouseEvent): void {
    const ctrl = this.controller;
    if (!ctrl?.isOpen()) return;
    const target = event.target as Node | null;
    if (!target) return;
    if (this.el.nativeElement.contains(target)) return;
    const trigger = ctrl.triggerEl();
    if (trigger && trigger.contains(target)) return;
    ctrl.close('outside');
  }

  /**
   * Tree-specific ArrowLeft / ArrowRight handling. Up/Down/Home/End/
   * Enter/Space/type-ahead all flow through the composed
   * `KjListNavigator` — they aren't reimplemented here.
   *
   * - ArrowRight on a collapsed branch → expand (toggle).
   * - ArrowRight on an expanded branch → move active to first child.
   * - ArrowLeft on an expanded branch → collapse (toggle).
   * - ArrowLeft elsewhere → move active to the parent (prior item with
   *   `aria-level` less than current).
   *
   * @internal
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const active = this.nav.activeItem();
    if (!active) return;
    const node = active._host();
    const items = this._domNodes();
    const idx = items.indexOf(node);
    if (idx === -1) return;
    const hasChildren = node.getAttribute('data-has-children') === 'true';
    const expanded = node.getAttribute('data-expanded') === 'true';

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (hasChildren && !expanded) {
        const toggle = node.querySelector('[kjTreeSelectToggle]') as HTMLElement | null;
        toggle?.click();
      } else if (hasChildren && expanded) {
        const next = items[idx + 1];
        if (next) this.nav.setActive(next.id);
      }
      return;
    }

    // ArrowLeft
    event.preventDefault();
    if (hasChildren && expanded) {
      const toggle = node.querySelector('[kjTreeSelectToggle]') as HTMLElement | null;
      toggle?.click();
      return;
    }
    const currentLevel = parseInt(node.getAttribute('aria-level') ?? '1', 10);
    for (let i = idx - 1; i >= 0; i--) {
      const lvl = parseInt(items[i]?.getAttribute('aria-level') ?? '1', 10);
      if (lvl < currentLevel) {
        this.nav.setActive(items[i].id);
        break;
      }
    }
  }

  /** DOM-order list of tree nodes scoped to this panel. */
  private _domNodes(): HTMLElement[] {
    return Array.from(
      this.el.nativeElement.querySelectorAll('[kjTreeSelectNode]'),
    ) as HTMLElement[];
  }
}

