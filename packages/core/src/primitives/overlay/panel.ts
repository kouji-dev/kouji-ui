import {
  Directive,
  ElementRef,
  Injector,
  PLATFORM_ID,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjId } from './id';
import { KjOverlayController } from './controller';
import { KjBackdrop } from './backdrop';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_BACKDROP_STRATEGY,
  KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
  KJ_OVERLAY_SCROLL_LOCK_STRATEGY,
  KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY,
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
  type KjBackdropStrategy,
  type KjFocusTrapStrategy,
  type KjLiveAnnouncerStrategy,
  type KjMountStrategy,
  type KjPositionStrategy,
  type KjScrollLockStrategy,
  type KjTriggerEventStrategy,
} from './tokens';
import type { KjPanelRole } from './types';

/**
 * Trigger-like contract accepted by `KjOverlayPanel.kjFor`. Any directive
 * that exposes an `attachPanel(panel)` method and a `controller` reference
 * satisfies this — including `KjOverlayTrigger` itself and consumer trigger
 * directives that compose it via `hostDirectives`.
 */
export interface KjOverlayTriggerLike {
  readonly controller: KjOverlayController;
  attachPanel(panel: KjOverlayPanel): void;
}

/** The strategy tokens as resolved from one injector scope. */
interface ResolvedTokens {
  mount: KjMountStrategy | null;
  position: KjPositionStrategy | null;
  backdrop: KjBackdropStrategy | null;
  focusTrap: KjFocusTrapStrategy | null;
  scrollLock: KjScrollLockStrategy | null;
  liveAnnouncer: KjLiveAnnouncerStrategy | null;
  trigger: KjTriggerEventStrategy | null;
  role: KjPanelRole | null;
}

function resolveTokens(self: boolean): ResolvedTokens {
  const opts = { optional: true as const, self };
  return {
    mount:         inject(KJ_OVERLAY_MOUNT_STRATEGY, opts),
    position:      inject(KJ_OVERLAY_POSITION_STRATEGY, opts),
    backdrop:      inject(KJ_OVERLAY_BACKDROP_STRATEGY, opts),
    focusTrap:     inject(KJ_OVERLAY_FOCUS_TRAP_STRATEGY, opts),
    scrollLock:    inject(KJ_OVERLAY_SCROLL_LOCK_STRATEGY, opts),
    liveAnnouncer: inject(KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY, opts),
    trigger:       inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, opts),
    role:          inject(KJ_OVERLAY_PANEL_ROLE, opts),
  };
}

/**
 * Marks an element as the overlay's panel — wires it to the controller,
 * resolves the panel role/aria-modal, and binds DOM state attributes
 * (`data-state`, `data-side`, `data-align`, `hidden`, `id`) for transition
 * and arrow styling.
 *
 * **Strategy scope.** The strategies and the role come from the injector
 * chain. A panel bound through `[kjFor]` to a controller that is *not* the
 * one its host chain provides (the usual shape: the trigger is a sibling)
 * belongs to a different overlay than any ancestor, so it reads the tokens
 * from its own element only — a popover inside a service-launched dialog
 * must not inherit the dialog's scroll lock, scrim or `alertdialog` role.
 * A panel whose controller is on its host chain (a builder-launched body,
 * or the root pattern where one directive provides controller and
 * strategies for the whole subtree) reads them from that chain as before.
 *
 * A portalled panel whose scope provides a backdrop strategy also gets a
 * real `<kj-backdrop>` scrim (created next to the panel, moved into the
 * portal wrapper before it while open), so `solidBackdrop()` on a declarative
 * overlay renders, inerts and dismisses exactly like on a service-launched
 * one.
 *
 * @doc-category Core/Overlay
 * @doc
 * @doc-name overlay-panel
 * @doc-is-main
 * @doc-description Marks an element as the overlay panel and binds its state, role, and accessibility attributes.
 */
@Directive({
  selector: '[kjOverlayPanel]',
  exportAs: 'kjOverlayPanel',
  host: {
    '[id]':                  'panelId',
    '[attr.role]':           'role()',
    '[attr.aria-modal]':     'isModal() ? "true" : null',
    '[attr.data-state]':     'state()',
    '[attr.data-side]':      'placement()?.side ?? null',
    '[attr.data-align]':     'placement()?.align ?? null',
    '[attr.hidden]':         'state() === "closed" ? "" : null',
  },
})
export class KjOverlayPanel {
  readonly host = inject(ElementRef<HTMLElement>);
  private readonly idSvc = inject(KjId);
  private readonly vcr = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  /**
   * Per-overlay controller injected from the element-injector chain.
   * Service-launched overlays expose this through the wrapper component;
   * declarative consumers without `[kjFor]` provide it on the trigger
   * directive (host-level `providers: [KjOverlayController]`).
   */
  private readonly hostController = inject(KjOverlayController, { optional: true });
  /**
   * Resolved controller — `kjFor()?.controller` wins over the host one.
   * Signal-backed so the `state`/`isModal` computeds re-evaluate when the
   * effect below swaps in the kjFor controller.
   */
  private readonly _controller = signal<KjOverlayController | null>(this.hostController);
  get controller(): KjOverlayController | null { return this._controller(); }
  readonly panelId = this.idSvc.mint('panel');

  /** Tokens declared on this very element. */
  private readonly own = resolveTokens(true);
  /** Tokens as the injector chain resolves them. */
  private readonly inherited = resolveTokens(false);
  /** The controller the scrim was created for, so it is created once. */
  private backdropFor: KjOverlayController | null = null;

  /**
   * The trigger whose controller this panel mounts into, for a panel that is
   * not a descendant of it. Default `null` — the panel uses the
   * `KjOverlayController` from its own injector chain.
   */
  readonly kjFor   = input<KjOverlayTriggerLike | null>(null);
  /** Whether the bound controller lives outside this panel's host chain — see the class docs. */
  private readonly scoped = computed(() => {
    const t = this.kjFor();
    return !!t && t.controller !== this.hostController;
  });
  /** The tokens that apply to this panel. */
  private readonly tokens = computed(() => (this.scoped() ? this.own : this.inherited));
  readonly role    = computed<KjPanelRole>(() => this.tokens().role ?? 'dialog');
  readonly isModal = computed(() => !!this.tokens().backdrop?.inertSiblings);
  readonly state   = computed(() => this.controller?.state() ?? 'closed');
  /**
   * Resolved placement published by the position strategy — post-RTL-mirror,
   * post-flip, and physical in both directions. Reflected as `data-side` /
   * `data-align` so a stylesheet can put an arrow on the edge the panel
   * actually landed on (`.kj-popover-content[data-side="top"] .kj-popover-arrow`).
   * `null` for a strategy that does not anchor to anything (viewport-centred
   * dialogs, edge sheets), which removes both attributes.
   */
  readonly placement = computed(() => this.tokens().position?.placement?.() ?? null);

  constructor() {
    effect(() => {
      // Single resolution rule: trigger-driven (`kjFor`) wins, otherwise
      // use whatever controller we found at the host element-injector.
      const t = this.kjFor();
      const c = t?.controller ?? this.hostController;
      if (!c) return;
      const tokens = this.tokens();
      if (!tokens.mount || !tokens.position) {
        throw new Error(
          'KjOverlayPanel: no mount / position strategy. A [kjFor] panel provides ' +
          'KJ_OVERLAY_MOUNT_STRATEGY and KJ_OVERLAY_POSITION_STRATEGY on its own element; ' +
          'a panel without [kjFor] resolves them from its injector chain.',
        );
      }
      this._controller.set(c);
      c.bindPanel(this.host.nativeElement);
      c.attachStrategies({
        mount:         tokens.mount,
        position:      tokens.position,
        backdrop:      tokens.backdrop,
        focusTrap:     tokens.focusTrap,
        scrollLock:    tokens.scrollLock,
        liveAnnouncer: tokens.liveAnnouncer,
        trigger:       tokens.trigger,
      });
      this.ensureBackdrop(c, tokens);
      t?.attachPanel(this);
    });
  }

  /**
   * Creates the `<kj-backdrop>` for a portalled panel with a backdrop
   * strategy. The scrim is a view of this panel's container (destroyed with
   * it) whose element the controller moves into the portal wrapper on open.
   * An in-place panel gets none: a scrim only covers the viewport from the
   * overlay container. Builder-launched overlays create theirs in the wrapper.
   */
  private ensureBackdrop(c: KjOverlayController, tokens: ResolvedTokens): void {
    if (!this.isBrowser || !tokens.backdrop || !tokens.mount?.portalled) return;
    if (this.backdropFor === c || c.backdropEl()) return;
    this.backdropFor = c;
    const injector = Injector.create({
      providers: [
        { provide: KjOverlayController, useValue: c },
        { provide: KJ_OVERLAY_BACKDROP_STRATEGY, useValue: tokens.backdrop },
      ],
      parent: this.injector,
    });
    const ref = this.vcr.createComponent(KjBackdrop, { injector });
    // Hidden from the first paint; the host binding confirms it on the next CD.
    (ref.location.nativeElement as HTMLElement).setAttribute('hidden', '');
  }
}
