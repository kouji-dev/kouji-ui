import {
  DestroyRef, Directive, ElementRef, TemplateRef,
  afterNextRender, computed, inject, input, signal,
} from '@angular/core';
import { KjToastService, KjToastTemplateContext, KjToastVariant } from './toast.service';
import { KJ_TOAST_STRATEGY } from './toast.strategy';
import { KjToastPositionX, KjToastPositionY } from './toast.types';

export type { KjToastVariant, KjToastContext, KjToastOptions } from './toast.service';
export type { KjToastPositionX, KjToastPositionY } from './toast.types';

/**
 * Marks an element as a single toast item. Sets `role`, `aria-atomic`, `data-variant`,
 * `data-front`, and exposes positional state as CSS custom properties so client CSS
 * can drive stacking, scaling, or spread-out animations.
 *
 * **CSS variables exposed (when `[kjToastId]` is bound):**
 * - `--kj-toast-index` — 1-based position from the front (newest = 1)
 * - `--kj-toast-before` — number of toasts behind this one
 * - `--kj-toast-after`  — number of toasts in front of this one
 * - `--kj-toast-height` — measured pixel height (kept in sync via ResizeObserver)
 *
 * @doc
 *  @doc-example Basic
 *    @doc-theme default
 *      @doc-file toast.example.ts
 *    @doc-theme retro
 *      @doc-file toast.retro.example.ts
 *    @doc-theme finance
 *      @doc-file toast.finance.example.ts
 *
 * @example
 * ```html
 * <ng-template #defaultTpl let-ctx>
 *   <div kjToast [kjToastVariant]="ctx.variant" [kjToastId]="ctx.id">
 *     <span>{{ ctx.message }}</span>
 *     <button (click)="ctx.dismiss()" aria-label="Dismiss">×</button>
 *   </div>
 * </ng-template>
 * ```
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjToast]',
  standalone: true,
  host: {
    '[attr.role]': 'role()',
    '[attr.aria-atomic]': '"true"',
    '[attr.data-variant]': 'kjToastVariant()',
    '[attr.data-front]': 'isFront()',
    '[style.--kj-toast-index]': 'index()',
    '[style.--kj-toast-before]': 'before()',
    '[style.--kj-toast-after]': 'after()',
    '[style.--kj-toast-height]': 'heightPx()',
  },
})
export class KjToast {
  /** Visual / semantic variant. Defaults to `'default'`. */
  kjToastVariant = input<KjToastVariant>('default');

  /**
   * The toast id this element renders. Bind from the template context (`ctx.id`)
   * so the directive can compute its position in the live queue and expose
   * `--kj-toast-index`, `--kj-toast-before`, `--kj-toast-after`, and `data-front`.
   * Optional — without it, the toast still renders with role/variant only.
   */
  kjToastId = input<string | null>(null);

  private readonly svc = inject(KjToastService);
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly _height = signal<number>(0);

  readonly role = computed(() =>
    this.kjToastVariant() === 'destructive' ? 'alert' : 'status',
  );

  /** 1-based position from the front (1 = newest). `null` when no id is bound. */
  readonly index = computed<number | null>(() => {
    const id = this.kjToastId();
    if (!id) return null;
    const list = this.svc.toasts();
    const i = list.findIndex(t => t.id === id);
    return i >= 0 ? list.length - i : null;
  });

  /** Toasts older than this one (behind in the stack). */
  readonly before = computed<number | null>(() => {
    const idx = this.index();
    return idx == null ? null : idx - 1;
  });

  /** Toasts newer than this one (in front of it). */
  readonly after = computed<number | null>(() => {
    const idx = this.index();
    if (idx == null) return null;
    return this.svc.toasts().length - idx;
  });

  /** True when this is the front-most (newest) toast. */
  readonly isFront = computed(() => this.index() === 1);

  /** Measured height as a pixel string (`"42px"`). Empty when unmeasured. */
  readonly heightPx = computed(() => {
    const h = this._height();
    return h > 0 ? `${h}px` : '';
  });

  constructor() {
    afterNextRender(() => {
      const node = this.el.nativeElement;
      const measure = () => this._height.set(Math.round(node.getBoundingClientRect().height));
      measure();
      // Use border-box geometry via getBoundingClientRect — contentRect strips padding.
      const ro = new ResizeObserver(measure);
      ro.observe(node);
      this.destroyRef.onDestroy(() => ro.disconnect());
    });
  }
}

/** Per-toast renderable: the resolved template + the bound context to render with. */
export interface KjToastRenderable<TData = unknown> {
  readonly id: string;
  readonly template: TemplateRef<KjToastTemplateContext<TData>> | null;
  readonly context: KjToastTemplateContext<TData>;
}

/**
 * Container for active toasts. Reads the queue from `KjToastService`, applies
 * a visibility cap (`kjToastMaxVisible`), and exposes layout state both as
 * inputs-driven CSS variables and `data-position-x` / `data-position-y`
 * attributes so client CSS can drive position, gap, stacking strategy, and
 * z-index.
 *
 * **CSS variables exposed on the host:**
 * - `--kj-toast-gap` — gap between stacked toasts
 * - `--kj-toast-z-index` — base z-index for toasts
 * - `--kj-toasts-count` — number of currently-rendered toasts
 * - `--kj-toast-front-height` — measured height of the front-most toast
 *
 * **Data attributes:**
 * - `data-position-x="start|center|end"`
 * - `data-position-y="top|bottom"`
 * - `data-expanded="true|false"`
 *
 * @example
 * ```html
 * <ol kjToastViewport
 *     [kjToastDefaultTemplate]="defaultTpl"
 *     [kjToastMaxVisible]="3"
 *     [kjToastGap]="8"
 *     kjToastPositionX="end"
 *     kjToastPositionY="bottom"
 *     #vp="kjToastViewport"
 *     aria-label="Notifications">
 *   @for (r of vp.renderable(); track r.id) {
 *     <li><ng-container *ngTemplateOutlet="r.template; context: { $implicit: r.context }" /></li>
 *   }
 * </ol>
 * ```
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjToastViewport]',
  standalone: true,
  exportAs: 'kjToastViewport',
  host: {
    'role': 'region',
    '[attr.aria-live]': '"polite"',
    '[attr.aria-atomic]': '"false"',
    '[attr.aria-relevant]': '"additions removals"',
    '[attr.data-position-x]': 'kjToastPositionX()',
    '[attr.data-position-y]': 'kjToastPositionY()',
    '[attr.data-expanded]': 'expanded()',
    '[style.--kj-toast-gap]': 'gapPx()',
    '[style.--kj-toast-z-index]': 'kjToastBaseZIndex()',
    '[style.--kj-toasts-count]': 'renderable().length',
    '[style.--kj-toast-front-height]': 'frontHeightPx()',
    '(mouseenter)': 'onHover(true)',
    '(mouseleave)': 'onHover(false)',
    '(focusin)':    'onHover(true)',
    '(focusout)':   'onHover(false)',
  },
})
export class KjToastViewport {
  private readonly svc = inject(KjToastService);
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly strategy = inject(KJ_TOAST_STRATEGY);

  /** Default template used for string-based toasts. Per-call templates override this. */
  readonly kjToastDefaultTemplate = input<TemplateRef<KjToastTemplateContext> | null>(null);

  /** Cap on simultaneously-rendered toasts. Excess stays queued and surfaces as space frees. Defaults from the active `KjToastStrategy`. */
  readonly kjToastMaxVisible = input<number>(this.strategy.maxVisible);

  /** Pixel gap between stacked toasts — exposed as `--kj-toast-gap`. Defaults from the active `KjToastStrategy`. */
  readonly kjToastGap = input<number>(this.strategy.gap);

  /** Base `z-index` exposed as `--kj-toast-z-index`. Defaults from the active `KjToastStrategy`. */
  readonly kjToastBaseZIndex = input<number>(this.strategy.baseZIndex);

  /** Horizontal anchor — written as `data-position-x` for client CSS. Defaults from the active `KjToastStrategy`. */
  readonly kjToastPositionX = input<KjToastPositionX>(this.strategy.positionX);

  /** Vertical anchor — written as `data-position-y` for client CSS. Defaults from the active `KjToastStrategy`. */
  readonly kjToastPositionY = input<KjToastPositionY>(this.strategy.positionY);

  /**
   * Manual override for the spread-out state. When unset (`undefined`) and the active
   * strategy has `expandOnHover: true`, the viewport flips automatically on hover/focus.
   * Set explicitly to force one state or to drive expansion from custom logic.
   */
  readonly kjToastExpand = input<boolean | undefined>(undefined);

  private readonly _hovered = signal(false);

  /** Resolved expand state — explicit input wins; otherwise falls back to hover when the strategy enables it. */
  readonly expanded = computed(() => {
    const override = this.kjToastExpand();
    if (override !== undefined) return override;
    return this.strategy.expandOnHover && this._hovered();
  });

  protected onHover(state: boolean): void {
    if (this.strategy.expandOnHover) this._hovered.set(state);
  }

  /** Live list of queued toasts (uncapped). */
  readonly toasts = this.svc.toasts;

  /** Renderables — capped by `kjToastMaxVisible`, paired with a template + bound context. */
  readonly renderable = computed<KjToastRenderable[]>(() => {
    const fallback = this.kjToastDefaultTemplate();
    const cap = this.kjToastMaxVisible();
    const list = this.toasts();
    // Newest are at the END of the service array; the front of the stack is the
    // last item. When capping, drop the OLDEST first.
    const visible = Number.isFinite(cap) && list.length > cap
      ? list.slice(list.length - cap)
      : list;
    return visible.map(t => ({
      id: t.id,
      template: t.template ?? fallback,
      context: this.svc.contextFor(t),
    }));
  });

  private readonly _frontHeight = signal<number>(0);

  /** `--kj-toast-gap` value (`"8px"`). */
  readonly gapPx = computed(() => `${this.kjToastGap()}px`);

  /** `--kj-toast-front-height` value (`"42px"`) — the measured height of the front toast. */
  readonly frontHeightPx = computed(() => {
    const h = this._frontHeight();
    return h > 0 ? `${h}px` : '';
  });

  constructor() {
    afterNextRender(() => {
      const root = this.el.nativeElement as HTMLElement;
      const measure = () => {
        const front = root.querySelector('[kjToast][data-front="true"]') as HTMLElement | null;
        if (!front) { this._frontHeight.set(0); return; }
        this._frontHeight.set(Math.round(front.getBoundingClientRect().height));
      };
      measure();
      const ro = new ResizeObserver(measure);
      // Observe the viewport — children added/resized trigger remeasure.
      ro.observe(root);
      // MutationObserver picks up new children (data-front="true" added on a new toast).
      const mo = new MutationObserver(measure);
      mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-front'] });
      this.destroyRef.onDestroy(() => { ro.disconnect(); mo.disconnect(); });
    });
  }
}

/**
 * Optional dismiss button. Use `(click)="ctx.dismiss()"` directly in the template
 * for new code — this directive is for cases where the dismiss target id is
 * known outside the template context.
 *
 * @example
 * ```html
 * <button [kjToastClose]="toast.id" aria-label="Dismiss">×</button>
 * ```
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjToastClose]',
  standalone: true,
  host: {
    '(click)': 'dismiss()',
  },
})
export class KjToastClose {
  private readonly svc = inject(KjToastService);
  /** The id of the toast to dismiss on click. */
  kjToastClose = input.required<string>();

  dismiss(): void {
    this.svc.dismiss(this.kjToastClose());
  }
}
