import { DestroyRef, Directive, ElementRef, inject, model, computed, effect, signal, untracked } from '@angular/core';
import { KJ_TRIGGER_CONTROL } from './trigger-control';
import { KjOverlayController } from './controller';
import { KJ_OVERLAY_PANEL_ROLE, KJ_OVERLAY_TRIGGER_EVENT_STRATEGY } from './tokens';
import type { KjOverlayPanel } from './panel';

/**
 * Marks an element as the overlay trigger — owns `aria-haspopup`,
 * `aria-expanded`, `aria-controls`, the trigger-event strategy, and the
 * two-way `kjOpen` model that mirrors the controller's open state. When the
 * panel role is `tooltip` the trigger is instead described by the panel
 * (`aria-describedby`, kept while closed so the description is available the
 * moment the trigger receives focus), merged with any `aria-describedby` the
 * element already carried — and, per the WAI-ARIA tooltip pattern, carries
 * neither `aria-expanded` nor `aria-controls` (a tooltip is not a disclosure).
 *
 * @doc-category Core/Overlay
 * @doc
 * @doc-name overlay-trigger
 * @doc-is-main
 * @doc-description Marks an element as the trigger that opens and closes an overlay panel.
 */
@Directive({
  selector: '[kjOverlayTrigger]',
  exportAs: 'kjOverlayTrigger',
  // NOTE: do NOT provide KjOverlayController here. Consumer trigger directives
  // (e.g. KjSelectTrigger, KjTreeSelectTrigger) provide it on their host
  // element so the SAME instance is visible to both KjOverlayTrigger and any
  // sibling KjOverlayPanel via [kjFor]. For "controller-on-root" patterns
  // (e.g. KjColorPicker), the root directive provides it and ALL descendants
  // share one instance.
  // Each binding yields null when a wrapper nominated its own control via
  // KJ_TRIGGER_CONTROL — the effect below writes the same values there
  // instead, so state never splits from the role and name. With no provider
  // (every consumer but `<kj-button>` today) these are unchanged.
  host: {
    '[attr.aria-haspopup]':  'hasControl() ? null : (ariaHasPopup() ?? null)',
    '[attr.aria-expanded]':  'hasControl() || isTooltip ? null : isOpen()',
    '[attr.aria-controls]':  'hasControl() || isTooltip ? null : (panelId() ?? null)',
    '[attr.aria-describedby]': 'hasControl() ? null : ariaDescribedBy()',
    '[attr.data-state]':     'hasControl() ? null : state()',
  },
})
export class KjOverlayTrigger {
  private readonly host       = inject(ElementRef<HTMLElement>);
  private readonly control    = inject(KJ_TRIGGER_CONTROL, { optional: true });
  /** The nominated control, or null when this trigger owns its own host. */
  readonly controlEl = computed(() => this.control?.controlElement() ?? null);
  /** Whether ARIA belongs on a nominated control rather than this host. */
  readonly hasControl = computed(() => this.controlEl() !== null);
  /** The element that actually carries the trigger's ARIA and events. */
  readonly triggerEl = computed(() => this.controlEl() ?? this.host.nativeElement);
  private readonly panelRole  = inject(KJ_OVERLAY_PANEL_ROLE, { optional: true });
  /** Tooltip triggers are described by their panel and carry no expanded/controls state. */
  readonly isTooltip = this.panelRole === 'tooltip';
  /** `aria-describedby` the element carried before this directive bound it; preserved. */
  private readonly staticDescribedBy = this.host.nativeElement.getAttribute('aria-describedby');
  /**
   * The overlay controller for this trigger's scope. Exposed publicly so
   * sibling `KjOverlayPanel` directives wired via `[kjFor]` can read it
   * from their element injector (which would otherwise not see this
   * directive's providers).
   */
  readonly controller = inject(KjOverlayController);
  private readonly triggerStrategy = inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY);

  /**
   * Two-way open state of the bound panel. Default `false`. `model()` takes no
   * `transform`, so bind it (`[(kjOpen)]="open"`) rather than using a bare
   * attribute.
   */
  readonly kjOpen = model<boolean>(false);
  readonly state   = this.controller.state;
  readonly isOpen  = this.controller.isOpen;
  /**
   * Id of the attached panel, for `aria-controls`. Read from the panel
   * directive at attach time — the element's `id` attribute is a host
   * binding that renders only after this computed would first run.
   */
  private readonly _panelId = signal<string | null>(null);
  readonly panelId = computed(() => this._panelId() ?? this.controller.panelEl()?.id ?? null);
  readonly ariaHasPopup = computed(() => this.triggerStrategy.ariaHasPopup);
  /** Tooltip panels describe their trigger (WAI-ARIA tooltip pattern); other roles leave the attribute alone. */
  readonly ariaDescribedBy = computed(() => {
    const ids = [this.staticDescribedBy, this.isTooltip ? this.panelId() : null].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  });

  attachPanel(panel: KjOverlayPanel): void {
    this._panelId.set(panel.panelId);
    this.controller.bindPanel(panel.host.nativeElement);
  }

  constructor() {
    // Bind SYNCHRONOUSLY, as before: `triggerStrategy.attach()` runs on the next
    // line and the focus/hover strategies read the bound element to install
    // their listeners, so deferring this to an effect left them listening to
    // nothing.
    this.controller.bindTrigger(this.host.nativeElement);
    // Then re-bind if a wrapper nominates a control — it comes from a viewChild
    // and so resolves after construction. Only ever narrows from host to
    // control; a trigger with no provider keeps the binding above.
    effect(() => {
      const el = this.controlEl();
      if (el) this.controller.bindTrigger(el);
    });

    // Mirror onto the nominated control what the host bindings above stop
    // writing. Plain DOM rather than host bindings: the element belongs to
    // another component's view, which this directive cannot bind into.
    effect(() => {
      const el = this.controlEl();
      if (!el) return;
      const set = (name: string, value: string | null) =>
        value === null ? el.removeAttribute(name) : el.setAttribute(name, value);
      set('aria-haspopup', this.ariaHasPopup() ?? null);
      set('aria-expanded', this.isTooltip ? null : String(this.isOpen()));
      set('aria-controls', this.isTooltip ? null : this.panelId());
      set('aria-describedby', this.ariaDescribedBy());
      set('data-state', this.state());
    });
    // The trigger strategy lives on the trigger element. Attach + bind here so
    // its DOM listeners wire up regardless of whether a panel ever attaches
    // (e.g. tooltip with no [kjFor]).
    this.triggerStrategy.attach(this.controller.context);
    this.triggerStrategy.bindToggle(() => this.controller.toggle());
    // The strategy is attached here, not through the controller's bundle
    // (a `[kjFor]` panel attaches its own trigger slot, if any), so its
    // listeners — a hotkey's document `keydown`, a hover's timers — come
    // off with this host, not with the panel.
    inject(DestroyRef).onDestroy(() => this.triggerStrategy.detach());
    // Sync model → controller (user toggled kjOpen via two-way binding)
    effect(() => {
      const wantOpen = this.kjOpen();
      const isOpen = untracked(() => this.controller.isOpen());
      if (wantOpen && !isOpen) this.controller.open();
      if (!wantOpen && isOpen) this.controller.close('programmatic');
    });
    // Sync controller → model (controller state changed via trigger event / outside-click / esc)
    effect(() => {
      const isOpen = this.controller.isOpen();
      const wantOpen = untracked(() => this.kjOpen());
      if (isOpen !== wantOpen) this.kjOpen.set(isOpen);
    });
  }
}
