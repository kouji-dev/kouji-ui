import { Directive, ElementRef, inject, input, computed, effect } from '@angular/core';
import { KjId } from './id';
import { KjOverlayController } from './controller';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_BACKDROP_STRATEGY,
  KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
  KJ_OVERLAY_SCROLL_LOCK_STRATEGY,
  KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY,
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from './tokens';
/**
 * Trigger-like contract accepted by `KjOverlayPanel.kjFor`. Any directive
 * that exposes an `attachPanel(panel)` method satisfies this — including
 * `KjOverlayTrigger` itself and consumer trigger directives that compose it
 * via `hostDirectives`.
 */
export interface KjOverlayTriggerLike {
  attachPanel(panel: KjOverlayPanel): void;
}

@Directive({
  selector: '[kjOverlayPanel]',
  exportAs: 'kjOverlayPanel',
  host: {
    '[id]':                  'panelId',
    '[attr.role]':           'role()',
    '[attr.aria-modal]':     'isModal() ? "true" : null',
    '[attr.data-state]':     'state()',
    '[attr.hidden]':         'state() === "closed" ? "" : null',
  },
})
export class KjOverlayPanel {
  readonly host    = inject(ElementRef<HTMLElement>);
  private readonly idSvc      = inject(KjId);
  private readonly controller = inject(KjOverlayController);
  readonly panelId  = this.idSvc.mint('panel');

  private readonly mount         = inject(KJ_OVERLAY_MOUNT_STRATEGY);
  private readonly position      = inject(KJ_OVERLAY_POSITION_STRATEGY);
  private readonly backdrop      = inject(KJ_OVERLAY_BACKDROP_STRATEGY,    { optional: true });
  private readonly focusTrap     = inject(KJ_OVERLAY_FOCUS_TRAP_STRATEGY,  { optional: true });
  private readonly scrollLock    = inject(KJ_OVERLAY_SCROLL_LOCK_STRATEGY, { optional: true });
  private readonly liveAnnouncer = inject(KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY, { optional: true });
  private readonly trigger       = inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY);
  private readonly role_         = inject(KJ_OVERLAY_PANEL_ROLE);

  readonly kjFor = input<KjOverlayTriggerLike | null>(null);
  readonly role    = computed(() => this.role_);
  readonly isModal = computed(() => !!this.backdrop?.inertSiblings);
  readonly state   = computed(() => this.controller.state());

  constructor() {
    this.controller.bindPanel(this.host.nativeElement);
    this.controller.attachStrategies({
      mount: this.mount,
      position: this.position,
      backdrop: this.backdrop ?? null,
      focusTrap: this.focusTrap ?? null,
      scrollLock: this.scrollLock ?? null,
      liveAnnouncer: this.liveAnnouncer ?? null,
      trigger: this.trigger,
    });
    effect(() => {
      const t = this.kjFor();
      if (t) t.attachPanel(this);
    });
  }
}
