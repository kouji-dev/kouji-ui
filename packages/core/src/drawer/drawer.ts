import {
  ApplicationRef,
  DestroyRef,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  HostListener,
  Injector,
  PLATFORM_ID,
  TemplateRef,
  type Signal,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjOverlayService } from '../primitives/overlay/overlay';
import {
  KJ_DRAWER,
  type KjDrawerAutoFocusEvent,
  type KjDrawerCloseEvent,
  type KjDrawerCloseReason,
  type KjDrawerContext,
  type KjDrawerSide,
  createDrawerAutoFocusEvent,
  createDrawerCloseEvent,
  nextDrawerDescriptionId,
  nextDrawerId,
  nextDrawerTitleId,
} from './drawer.context';

/** Focusable selector — mirrors the one used by `KjFocusTrap`. */
const DRAWER_FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * Trigger that opens a drawer. Place on any button or interactive element.
 * Takes a `TemplateRef` input that defines the drawer overlay structure.
 *
 * The template should contain `[kjDrawerContent]` (the panel). Optionally
 * project `[kjDrawerTitle]`, `[kjDrawerDescription]` and `[kjDrawerClose]`
 * inside. Export `kjDrawerContent` (`#d="kjDrawerContent"`) to call
 * `d.close(result?)`.
 *
 * Composes the shared `KjOverlayService.register()` for stack ordering and
 * outside-click / Escape coordination, body scroll-lock via
 * `KjOverlayService.lockBodyScroll`, focus capture / restore, and a
 * cancellable close cycle. Modal mode also wires the inline focus-trap on
 * the panel.
 *
 * @example
 * ```html
 * <button kjButton [kjDrawerTrigger]="myDrawer">Open</button>
 * <ng-template #myDrawer>
 *   <div kjDrawerContent #d="kjDrawerContent">
 *     <h2 kjDrawerTitle>Settings</h2>
 *     <p kjDrawerDescription>Tweak the knobs.</p>
 *     <button kjDrawerClose>Close</button>
 *   </div>
 * </ng-template>
 * ```
 *
 * @category Core/Overlays
 * @doc
 * @doc-name drawer
 */
@Directive({
  selector: '[kjDrawerTrigger]',
  standalone: true,
  exportAs: 'kjDrawerTrigger',
  providers: [{ provide: KJ_DRAWER, useExisting: KjDrawerTrigger }],
  host: {
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'open().toString()',
    '[attr.aria-controls]': 'drawerId',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '(click)': 'openDrawer()',
  },
})
export class KjDrawerTrigger implements KjDrawerContext {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly overlay = inject(KjOverlayService);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Stable id used for ARIA wiring. */
  readonly drawerId = nextDrawerId();

  /** The template projected into `document.body` when the drawer opens. */
  readonly kjDrawerTrigger = input.required<TemplateRef<unknown>>();

  /**
   * Side of the viewport the drawer slides in from. Default `'right'`.
   * Reflected as `data-kj-side` on the panel host.
   */
  readonly kjSide = input<KjDrawerSide>('right');

  /**
   * Whether the drawer is modal. When `true` (default) the drawer enables
   * focus-trap, body scroll-lock, Escape-to-close, and backdrop-click-to-close.
   * When `false` the drawer renders without a backdrop and leaves focus alone.
   */
  readonly kjModal = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Whether Escape closes the drawer. Modal-only. */
  readonly kjCloseOnEscape = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Whether outside (backdrop) click closes the drawer. Modal-only. */
  readonly kjCloseOnBackdrop = input<boolean, unknown>(true, { transform: booleanAttribute });

  /**
   * Auto-focus behaviour when the drawer opens. `false` to skip; string =
   * CSS selector resolved inside the panel.
   */
  readonly kjAutoFocus = input<boolean | string>(true);

  /** Restore focus to the trigger on close. */
  readonly kjRestoreFocus = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Lock `<body>` scroll while open. Modal-only. */
  readonly kjScrollLock = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Emits the value passed to `close(result)`. */
  readonly kjDrawerClosed = output<unknown>();

  /** Cancellable close cycle. Call `event.preventDefault()` to veto. */
  readonly kjCloseRequested = output<KjDrawerCloseEvent>();

  /** Cancellable open auto-focus event. */
  readonly kjOpenAutoFocus = output<KjDrawerAutoFocusEvent>();

  /** Cancellable close auto-focus (focus-restore) event. */
  readonly kjCloseAutoFocus = output<KjDrawerAutoFocusEvent>();

  // ── KjDrawerContext ────────────────────────────────────────────────

  private readonly _open = signal(false);
  readonly open: Signal<boolean> = this._open.asReadonly();

  private readonly _titleId = signal<string | null>(null);
  readonly titleId = this._titleId.asReadonly();

  private readonly _descriptionId = signal<string | null>(null);
  readonly descriptionId = this._descriptionId.asReadonly();

  readonly side: Signal<KjDrawerSide> = computed(() => this.kjSide());
  readonly modal: Signal<boolean> = computed(() => this.kjModal());
  readonly closeOnEscape: Signal<boolean> = computed(() => this.kjCloseOnEscape());
  readonly closeOnBackdrop: Signal<boolean> = computed(() => this.kjCloseOnBackdrop());

  registerTitleId(id: string): void { this._titleId.set(id); }
  unregisterTitleId(id: string): void {
    if (this._titleId() === id) this._titleId.set(null);
  }
  registerDescriptionId(id: string): void { this._descriptionId.set(id); }
  unregisterDescriptionId(id: string): void {
    if (this._descriptionId() === id) this._descriptionId.set(null);
  }

  private viewRef?: EmbeddedViewRef<unknown>;
  private containerEl?: HTMLElement;
  private panelEl?: HTMLElement;
  private overlayHandle?: ReturnType<KjOverlayService['register']>;
  private releaseScrollLock?: () => void;
  private focusRestoreTarget: HTMLElement | null = null;
  private lastCloseReasonHint: KjDrawerCloseReason | null = null;

  constructor() {
    effect(() => {
      const isOpen = this._open();
      if (!isPlatformBrowser(this.platformId)) return;
      if (isOpen && !this.viewRef) {
        this.mount();
      } else if (!isOpen && this.viewRef) {
        this.unmount();
      }
    });

    this.destroyRef.onDestroy(() => this.unmount());
  }

  /** Programmatically open the drawer. */
  openDrawer(): void {
    if (this._open()) return;
    if (!isPlatformBrowser(this.platformId)) return;
    if (
      this.kjRestoreFocus()
      && typeof document !== 'undefined'
      && document.activeElement instanceof HTMLElement
    ) {
      this.focusRestoreTarget = document.activeElement;
    } else {
      this.focusRestoreTarget = this.el.nativeElement;
    }
    this._open.set(true);
  }

  /**
   * Public method exposed via `KjDrawerContext`. Runs the cancellable
   * close cycle.
   */
  close(result?: unknown, reason: KjDrawerCloseReason = 'programmatic'): void {
    this.requestClose(result, reason);
  }

  private requestClose(result: unknown, reason: KjDrawerCloseReason): boolean {
    if (!this._open()) return false;
    const ev = createDrawerCloseEvent(reason, result);
    this.kjCloseRequested.emit(ev);
    if (ev.defaultPrevented) return false;
    this.commitClose(result);
    return true;
  }

  private commitClose(result: unknown): void {
    if (!this._open()) return;
    const restoreTarget = this.focusRestoreTarget;
    this.tearDownStack();
    this._open.set(false);

    if (restoreTarget && this.kjRestoreFocus()) {
      const ev = createDrawerAutoFocusEvent(restoreTarget);
      this.kjCloseAutoFocus.emit(ev);
      if (!ev.defaultPrevented) {
        try { restoreTarget.focus(); } catch { /* ignore */ }
      }
    }
    this.kjDrawerClosed.emit(result);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this._open()) return;
    if (!this.kjModal()) return;
    if (!this.kjCloseOnEscape()) return;
    this.lastCloseReasonHint = 'escape';
  }

  private mount(): void {
    const tpl = this.kjDrawerTrigger();
    this.viewRef = tpl.createEmbeddedView(undefined as never, this.injector);
    this.appRef.attachView(this.viewRef);

    this.containerEl = document.createElement('div');
    this.containerEl.setAttribute('data-kj-drawer-container', '');
    this.viewRef.rootNodes.forEach((node) => this.containerEl!.appendChild(node));
    document.body.appendChild(this.containerEl);

    const panel = this.containerEl.querySelector<HTMLElement>('[kjDrawerContent]')
      ?? this.containerEl.querySelector<HTMLElement>('[role="dialog"]')
      ?? this.containerEl.querySelector<HTMLElement>('[role="region"]')
      ?? this.containerEl;
    this.panelEl = panel;

    if (this.kjModal()) {
      this.overlayHandle = this.overlay.register(this.drawerId, {
        onClose: () => {
          const reason = this.lastCloseReasonHint ?? 'backdrop';
          this.lastCloseReasonHint = null;
          this.requestClose(undefined, reason);
        },
        closeOnEsc: this.kjCloseOnEscape(),
        closeOnOutside: this.kjCloseOnBackdrop(),
      });
      this.overlay.markContentEl(this.drawerId, panel);

      if (this.kjScrollLock()) {
        this.releaseScrollLock = this.overlay.lockBodyScroll();
      }
    }

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        if (this.panelEl) this.runOpenAutoFocus(this.panelEl, this.kjAutoFocus());
      });
    } else {
      this.runOpenAutoFocus(panel, this.kjAutoFocus());
    }
  }

  private unmount(): void {
    if (this.viewRef) {
      try {
        this.appRef.detachView(this.viewRef);
        this.viewRef.destroy();
      } catch {
        /* ignore */
      }
      this.viewRef = undefined;
    }
    this.containerEl?.remove();
    this.containerEl = undefined;
    this.panelEl = undefined;
  }

  private tearDownStack(): void {
    this.overlayHandle?.unregister();
    this.overlayHandle = undefined;
    this.releaseScrollLock?.();
    this.releaseScrollLock = undefined;
  }

  private runOpenAutoFocus(panel: HTMLElement, autoFocus: boolean | string): void {
    if (autoFocus === false) return;

    let target: HTMLElement | null = null;
    if (typeof autoFocus === 'string') {
      target = panel.querySelector<HTMLElement>(autoFocus);
    }
    target ??= panel.querySelector<HTMLElement>('[autofocus]');
    target ??= panel.querySelector<HTMLElement>(DRAWER_FOCUSABLE);
    target ??= panel;

    if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');

    const ev = createDrawerAutoFocusEvent(target);
    this.kjOpenAutoFocus.emit(ev);
    if (ev.defaultPrevented) return;
    try { target.focus(); } catch { /* ignore */ }
  }
}

/**
 * Root state container for the drawer's compound shape. Provides
 * `KJ_DRAWER` to descendant directives. Use it when the drawer trigger and
 * content live as siblings in the same template (rather than driving the
 * drawer through `[kjDrawerTrigger]` with a `TemplateRef`).
 *
 * Most consumers will use the trigger-based shape — this directive exists
 * for parity with `KjPopover` / `KjDialog` style compound trees and is the
 * place to hang a future programmatic-only state container.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name drawer
 * @doc-is-main
 */
@Directive({
  selector: '[kjDrawer]',
  standalone: true,
  exportAs: 'kjDrawer',
})
export class KjDrawer {}

/**
 * Panel container for a drawer. Place inside the template provided to
 * `[kjDrawerTrigger]`. Auto-sets `role="dialog"` / `role="region"` based on
 * modality, `aria-modal`, and wires `aria-labelledby` / `aria-describedby`
 * from any projected `[kjDrawerTitle]` / `[kjDrawerDescription]`.
 *
 * Reflects `data-kj-side` so the styled wrapper can pick the slide
 * transform per edge. Implements an inline focus-trap when modal so Tab
 * cycles within the panel — required for `aria-modal="true"` to honour
 * WCAG 2.1.2 *No Keyboard Trap*. Export as `#d="kjDrawerContent"` to call
 * `d.close(result?)`.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name drawer
 */
@Directive({
  selector: '[kjDrawerContent]',
  standalone: true,
  exportAs: 'kjDrawerContent',
  host: {
    '[attr.role]': 'ctx.modal() ? "dialog" : "region"',
    '[attr.aria-modal]': 'ctx.modal() ? "true" : null',
    '[attr.id]': 'ctx.drawerId',
    '[attr.tabindex]': '"-1"',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-kj-side]': 'ctx.side()',
    '[attr.aria-labelledby]': 'ctx.titleId()',
    '[attr.aria-describedby]': 'ctx.descriptionId()',
    '(click)': '$event.stopPropagation()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjDrawerContent {
  readonly ctx = inject(KJ_DRAWER);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Close the drawer with an optional payload. */
  close(result?: unknown): void {
    this.ctx.close(result, 'programmatic');
  }

  /** Inline focus-trap fallback — Tab cycles within the panel while open. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    if (!this.ctx.modal()) return;
    if (!this.ctx.open()) return;
    const panel = this.el.nativeElement;
    const focusable = (Array.from(
      panel.querySelectorAll<HTMLElement>(DRAWER_FOCUSABLE),
    )).filter((node) => !node.closest('[hidden]'));

    if (!focusable.length) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;

    if (event.shiftKey) {
      if (active === first || !panel.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !panel.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }
}

/**
 * Marks the drawer title. Generates a stable id and registers it with the
 * drawer context so `[kjDrawerContent]` can wire `aria-labelledby`
 * automatically.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name drawer
 */
@Directive({
  selector: '[kjDrawerTitle]',
  standalone: true,
  host: {
    '[attr.id]': 'titleId',
  },
})
export class KjDrawerTitle {
  private readonly ctx = inject(KJ_DRAWER);
  private readonly destroyRef = inject(DestroyRef);
  /** Stable id allocated at construction and registered with the context. */
  readonly titleId = nextDrawerTitleId();

  constructor() {
    this.ctx.registerTitleId(this.titleId);
    this.destroyRef.onDestroy(() => this.ctx.unregisterTitleId(this.titleId));
  }
}

/**
 * Marks the drawer description. Generates a stable id and registers it with
 * the drawer context so `[kjDrawerContent]` can wire `aria-describedby`
 * automatically.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name drawer
 */
@Directive({
  selector: '[kjDrawerDescription]',
  standalone: true,
  host: {
    '[attr.id]': 'descriptionId',
  },
})
export class KjDrawerDescription {
  private readonly ctx = inject(KJ_DRAWER);
  private readonly destroyRef = inject(DestroyRef);
  /** Stable id allocated at construction and registered with the context. */
  readonly descriptionId = nextDrawerDescriptionId();

  constructor() {
    this.ctx.registerDescriptionId(this.descriptionId);
    this.destroyRef.onDestroy(() => this.ctx.unregisterDescriptionId(this.descriptionId));
  }
}

/**
 * Closes the drawer on click with no result payload. For payloads use
 * `#d="kjDrawerContent"` then `(click)="d.close(value)"`.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name drawer
 */
@Directive({
  selector: '[kjDrawerClose]',
  standalone: true,
  host: {
    '(click)': 'onClose($event)',
  },
})
export class KjDrawerClose {
  private readonly ctx = inject(KJ_DRAWER);

  protected onClose(event: Event): void {
    event.stopPropagation();
    this.ctx.close(undefined, 'close-button');
  }
}
