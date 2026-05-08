import {
  DestroyRef,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  PLATFORM_ID,
  type Signal,
  TemplateRef,
  ViewContainerRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjPopoverController } from './popover.controller';
import {
  KJ_POPOVER,
  type KjAutoFocusEvent,
  type KjPopoverAlign,
  type KjPopoverCloseEvent,
  type KjPopoverCloseReason,
  type KjPopoverContext,
  type KjPopoverSide,
  type KjPopoverTriggerEvent,
} from './popover.context';

/**
 * The button that toggles the popover.
 *
 * Two ergonomic shapes — both backed by the same {@link KjPopoverController}:
 *
 * 1. **Compound** — child of a `[kjPopover]` wrapper that owns the state:
 *    ```html
 *    <div kjPopover>
 *      <button kjPopoverTrigger>Open</button>
 *      <ng-template kjPopoverContent>…</ng-template>
 *    </div>
 *    ```
 * 2. **Trigger-for** — flat shape; the trigger itself provides the
 *    `KJ_POPOVER` context for its projected template:
 *    ```html
 *    <button [kjPopoverTriggerFor]="profile">Profile</button>
 *    <ng-template #profile>
 *      <ng-template kjPopoverContent>…</ng-template>
 *    </ng-template>
 *    ```
 *
 * Sets `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`. Captures
 * the trigger element for focus restoration on close. Click / Enter / Space
 * toggles open. When the host is not a native `<button>` the directive
 * listens explicitly for Enter / Space (WCAG 2.1.1 *Keyboard*).
 *
 * @category Core/Overlays
 * @doc
 * @doc-name popover
 */
@Directive({
  selector: '[kjPopoverTrigger], [kjPopoverTriggerFor]',
  standalone: true,
  exportAs: 'kjPopoverTrigger',
  providers: [
    KjPopoverController,
    // The trigger itself implements `KjPopoverContext`; expose it under
    // KJ_POPOVER. In compound shape this is shadowed for the content
    // directive (which is a sibling — sees the parent's KJ_POPOVER first
    // via the element-injector tree). In trigger-for shape the projected
    // template's `vcr.injector` is rooted at the trigger and descendants
    // see this provider.
    { provide: KJ_POPOVER, useExisting: KjPopoverTrigger },
  ],
  host: {
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'ctx.open()',
    '[attr.aria-controls]': 'ctx.popoverId',
    '[attr.aria-disabled]': 'kjPopoverDisabled() ? "true" : null',
    '[attr.data-disabled]': 'kjPopoverDisabled() ? "" : null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '(click)': 'onClick($event)',
    '(keydown.enter)': 'onActivationKey($event)',
    '(keydown.space)': 'onActivationKey($event)',
    '(mouseenter)': 'onPointerEnter()',
    '(mouseleave)': 'onPointerLeave()',
  },
})
export class KjPopoverTrigger implements KjPopoverContext {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  /** @internal The controller in this trigger's own injector. */
  readonly controllerInternal = inject(KjPopoverController);

  /** Parent state container (compound shape). */
  private readonly parent: KjPopoverContext | null = inject<KjPopoverContext | null>(
    KJ_POPOVER,
    { optional: true, skipSelf: true },
  );

  /** Parent controller (compound shape). */
  private readonly parentController: KjPopoverController | null = inject(
    KjPopoverController,
    { optional: true, skipSelf: true },
  );

  /** Active controller — parent in compound, own in trigger-for. */
  private readonly activeController: KjPopoverController =
    this.parentController ?? this.controllerInternal;

  /** Active context — parent in compound, this trigger in trigger-for. */
  readonly ctx: KjPopoverContext;

  /**
   * The template that supplies the popover content. Required for trigger-for
   * shape; ignored in compound shape (where the content is a sibling).
   */
  readonly kjPopoverTriggerFor = input<TemplateRef<unknown> | null>(null);

  /** Suppresses opening entirely. Reflects `data-disabled`. */
  readonly kjPopoverDisabled = input<boolean>(false);

  /** Override side. */
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly kjPopoverSideOverride = input<KjPopoverSide | null>(null, { alias: 'kjPopoverSide' });

  /** Override align. */
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly kjPopoverAlignOverride = input<KjPopoverAlign | null>(null, { alias: 'kjPopoverAlign' });

  /** Override offset. */
  readonly kjPopoverOffset = input<number | null>(null);

  /** Override trigger event. */
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly kjTriggerEventOverride = input<KjPopoverTriggerEvent | null>(null, { alias: 'kjTriggerEvent' });

  /** Resolved trigger event — own override → parent → default. */
  readonly kjTriggerEvent: Signal<KjPopoverTriggerEvent> = computed(
    () =>
      this.kjTriggerEventOverride()
      ?? this.parent?.kjTriggerEvent()
      ?? this.controllerInternal.defaults.triggerEvent,
  );

  /** Two-way bindable open state. */
  readonly kjOpen = model<boolean>(false);

  /** Convenience event paired with the `kjOpen` model. */
  readonly kjOpenChange = output<boolean>();

  /** Cancellable close cycle. */
  readonly kjCloseRequested = output<KjPopoverCloseEvent>();

  /** Cancellable open auto-focus event. */
  readonly kjOpenAutoFocus = output<KjAutoFocusEvent>();

  /** Cancellable close auto-focus event. */
  readonly kjCloseAutoFocus = output<KjAutoFocusEvent>();

  // ── KjPopoverContext fields (sourced from active controller) ────────

  readonly open: Signal<boolean>;
  readonly popoverId: string;
  readonly titleId: Signal<string | null>;
  readonly modal: Signal<boolean>;
  readonly triggerElement: Signal<HTMLElement | null>;

  /** Resolved side — own override → parent → default. */
  readonly kjPopoverSide: Signal<KjPopoverSide> = computed(
    () =>
      this.kjPopoverSideOverride()
      ?? this.parent?.kjPopoverSide()
      ?? this.controllerInternal.defaults.side,
  );

  /** Resolved align. */
  readonly kjPopoverAlign: Signal<KjPopoverAlign> = computed(
    () =>
      this.kjPopoverAlignOverride()
      ?? this.parent?.kjPopoverAlign()
      ?? this.controllerInternal.defaults.align,
  );

  constructor() {
    this.ctx = this.parent ?? (this as KjPopoverContext);

    // Source the context fields from the active controller. `popoverId` is
    // a string assigned at controller construction.
    this.open = this.activeController.open;
    this.popoverId = this.activeController.popoverId;
    this.titleId = this.activeController.titleId;
    this.modal = this.activeController.modal;
    this.triggerElement = this.activeController.triggerElement;

    if (!this.parent) {
      // Trigger-for shape: this trigger owns the state. Wire outputs.
      this.controllerInternal.configure({
        emitOpenChange: (v) => {
          if (this.kjOpen() !== v) this.kjOpen.set(v);
          this.kjOpenChange.emit(v);
        },
        emitCloseRequested: (ev) => this.kjCloseRequested.emit(ev),
        emitOpenAutoFocus: (ev) => this.kjOpenAutoFocus.emit(ev),
        emitCloseAutoFocus: (ev) => this.kjCloseAutoFocus.emit(ev),
      });

      let lastModelOpen = this.kjOpen();
      effect(() => {
        const wanted = this.kjOpen();
        if (wanted === lastModelOpen) return;
        lastModelOpen = wanted;
        this.controllerInternal.syncFromModel(wanted);
      });

      // Stamp the projected template into our view container so the inner
      // [kjPopoverContent] structural directive instantiates and can react
      // to the controller's open() signal.
      let templateView: EmbeddedViewRef<unknown> | null = null;
      effect(() => {
        const tpl = this.kjPopoverTriggerFor();
        if (!tpl) {
          if (templateView) {
            try { templateView.destroy(); } catch { /* ignore */ }
            templateView = null;
          }
          return;
        }
        if (!templateView) {
          // Pass the trigger's injector so descendants of the projected
          // template (notably `[kjPopoverContent]`) inject KJ_POPOVER from
          // *this* trigger rather than from the template's declaration
          // injector (which would be the host component, with no popover
          // context provided).
          templateView = tpl.createEmbeddedView(null as never, this.vcr.injector);
          this.vcr.insert(templateView);
        }
      });
      this.destroyRef.onDestroy(() => {
        if (templateView) {
          try { templateView.destroy(); } catch { /* ignore */ }
        }
      });
    } else {
      // Compound shape: kjOpen on the trigger mirrors the parent's state.
      let lastParentOpen = this.parent.open();
      effect(() => {
        const v = this.parent!.open();
        if (v !== lastParentOpen) {
          lastParentOpen = v;
          if (this.kjOpen() !== v) this.kjOpen.set(v);
        }
      });
      let lastModelOpen = this.kjOpen();
      effect(() => {
        const wanted = this.kjOpen();
        if (wanted === lastModelOpen) return;
        lastModelOpen = wanted;
        if (this.parent!.open() !== wanted) {
          if (wanted) this.parent!.show();
          else this.parent!.hide('programmatic');
        }
      });
    }

    // Capture trigger element on the active controller.
    if (isPlatformBrowser(this.platformId)) {
      const host = this.el.nativeElement;
      // Best-effort initial capture (host element). Refined by afterNextRender
      // when content projection has settled, since wrappers using
      // `display: contents` have no firstElementChild at constructor time.
      this.activeController.captureTrigger(host);
      this.activeController.captureTriggerFocus(host);
      afterNextRender(() => {
        let anchor: HTMLElement = host;
        if (getComputedStyle(host).display === 'contents') {
          let cur: Element | null = host.firstElementChild;
          while (cur) {
            if (getComputedStyle(cur as HTMLElement).display !== 'contents') {
              anchor = cur as HTMLElement;
              break;
            }
            cur = cur.firstElementChild ?? cur.nextElementSibling;
          }
        }
        this.activeController.captureTrigger(anchor);
        this.activeController.captureTriggerFocus(anchor);
      });
    }
  }

  // ── KjPopoverContext mutations (delegated to active controller) ────

  show(): void {
    this.activeController.show();
  }

  hide(reason: KjPopoverCloseReason): void {
    this.activeController.hide(reason);
  }

  toggle(): void {
    this.activeController.toggle();
  }

  registerTitleId(id: string): void {
    this.activeController.registerTitleId(id);
  }

  unregisterTitleId(id: string): void {
    this.activeController.unregisterTitleId(id);
  }

  captureTriggerFocus(el: HTMLElement): void {
    this.activeController.captureTriggerFocus(el);
  }

  restoreTriggerFocus(): void {
    this.activeController.restoreTriggerFocus();
  }

  // ── Host event handlers ─────────────────────────────────────────────

  protected onClick(event: MouseEvent): void {
    if (this.kjPopoverDisabled()) return;
    if (this.effectiveTriggerEvent() === 'manual') return;
    if (this.effectiveTriggerEvent() === 'hover') return;
    event.stopPropagation();
    this.ctx.toggle();
  }

  protected onActivationKey(event: Event): void {
    if (this.kjPopoverDisabled()) return;
    if (this.effectiveTriggerEvent() === 'manual') return;
    const tag = (event.currentTarget as HTMLElement | null)?.tagName.toLowerCase();
    if (tag === 'button') return;
    event.preventDefault();
    event.stopPropagation();
    this.ctx.toggle();
  }

  protected onPointerEnter(): void {
    if (this.kjPopoverDisabled()) return;
    if (this.effectiveTriggerEvent() !== 'hover') return;
    if (!this.ctx.open()) this.ctx.show();
  }

  protected onPointerLeave(): void {
    if (this.kjPopoverDisabled()) return;
    if (this.effectiveTriggerEvent() !== 'hover') return;
    if (this.ctx.open()) this.ctx.hide('programmatic');
  }

  private effectiveTriggerEvent(): KjPopoverTriggerEvent {
    return this.ctx.kjTriggerEvent();
  }
}
