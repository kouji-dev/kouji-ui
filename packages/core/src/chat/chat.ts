import {
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  KJ_CHAT,
  KJ_CHAT_LOG,
  type KjChatContext,
  type KjChatRole,
  type KjChatSide,
} from './chat.context';

/**
 * Element → directive map used by `KjChat` to walk previous siblings without
 * relying on Angular dev-mode internals. Each row registers itself on its host
 * element on construction and unregisters on destroy.
 */
const CHAT_ROW_REGISTRY = new WeakMap<Element, KjChat>();

/**
 * A single chat row. Owns the logical side, the per-row role, and the
 * group-by-sender computation; reflects header / footer ids registered by
 * its children for `aria-labelledby` / `aria-describedby` wiring.
 *
 * **Grouping uses DOM traversal, not a registry**, deliberately: the registry
 * pattern races on the bottom-up `ngOnInit` order (children before parent),
 * which means the first row could ask for its previous sibling before the
 * previous row has registered. DOM traversal via `previousElementSibling` is
 * deterministic and works at first render.
 *
 * Standalone rows (no `KjChatLog` parent) skip auto-grouping entirely;
 * consumers set `kjChatGrouped` explicitly when they want grouped chrome.
 *
 * @example
 * ```html
 * <div kjChat kjSide="start" kjChatAuthor="alice">
 *   <span kjChatAvatar>…</span>
 *   <header kjChatHeader>Alice 12:46</header>
 *   <p kjChatBubble>Hey!</p>
 *   <footer kjChatFooter kjState="read">Read 12:46</footer>
 * </div>
 * ```
 * @category Core/Data display
 */
@Directive({
  selector: '[kjChat]',
  standalone: true,
  providers: [{ provide: KJ_CHAT, useExisting: KjChat }],
  host: {
    '[attr.role]': 'kjRole()',
    '[attr.data-side]': 'kjSide()',
    '[attr.data-grouped]': 'grouped() ? "" : null',
    '[attr.aria-labelledby]': 'headerId() ?? null',
    '[attr.aria-describedby]': 'footerId() ?? null',
  },
})
export class KjChat implements KjChatContext {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly log = inject(KJ_CHAT_LOG, { optional: true });

  /** Logical side of this row. CSS reads `data-side` and handles RTL flip. */
  readonly kjSide = input<KjChatSide>('start');

  /** Sender id — drives auto-grouping with the previous sibling row. */
  readonly kjChatAuthor = input<string | undefined>(undefined);

  /**
   * Explicit group override. When defined, wins over the auto-computed value;
   * use this when no `KjChatLog` parent is present.
   */
  readonly kjChatGrouped = input<boolean | undefined>(undefined);

  /**
   * Per-row role. Default `'article'` gives AT users a per-message landmark
   * navigable via JAWS / NVDA `M`; `'listitem'` opts in to list semantics
   * (parent log must then expose `role="list"`); `null` drops the attribute.
   */
  readonly kjRole = input<KjChatRole>('article');

  private readonly headerIds = signal<readonly string[]>([]);
  private readonly footerIds = signal<readonly string[]>([]);

  /** Composed `aria-labelledby` value. */
  readonly headerId = computed(() => {
    const ids = this.headerIds();
    return ids.length === 0 ? null : ids.join(' ');
  });

  /** Composed `aria-describedby` value. */
  readonly footerId = computed(() => {
    const ids = this.footerIds();
    return ids.length === 0 ? null : ids.join(' ');
  });

  private readonly autoGrouped = signal(false);

  /** True when this row groups with the previous one (same author). */
  readonly grouped = computed(
    () => this.kjChatGrouped() ?? this.autoGrouped(),
  );

  constructor() {
    // Registry write happens in the constructor so any sibling rendered
    // *after* us finds us during its own afterNextRender pass. (Angular
    // builds child instances bottom-up, but DOM siblings are ordered
    // top-down — by the time the second row's afterNextRender fires,
    // the first row's host element exists and is keyed in the WeakMap.)
    CHAT_ROW_REGISTRY.set(this.el.nativeElement, this);
    this.destroyRef.onDestroy(() =>
      CHAT_ROW_REGISTRY.delete(this.el.nativeElement),
    );

    // DOM-traversal grouping: run after first render (so the previous
    // sibling exists) and re-run whenever this row's author changes.
    afterNextRender(() => {
      this.recomputeAutoGrouped();
    });
    effect(
      () => {
        // Track the input — touching it inside the effect creates the dep.
        this.kjChatAuthor();
        this.recomputeAutoGrouped();
      },
      { injector: this.injector },
    );
  }

  /** @internal */
  registerHeaderId(id: string): void {
    this.headerIds.update(ids => [...ids, id]);
    this.destroyRef.onDestroy(() => this.unregisterHeaderId(id));
  }

  /** @internal */
  unregisterHeaderId(id: string): void {
    this.headerIds.update(ids => ids.filter(x => x !== id));
  }

  /** @internal */
  registerFooterId(id: string): void {
    this.footerIds.update(ids => [...ids, id]);
    this.destroyRef.onDestroy(() => this.unregisterFooterId(id));
  }

  /** @internal */
  unregisterFooterId(id: string): void {
    this.footerIds.update(ids => ids.filter(x => x !== id));
  }

  private recomputeAutoGrouped(): void {
    if (!this.log) {
      this.autoGrouped.set(false);
      return;
    }
    const me = this.kjChatAuthor();
    if (me === undefined) {
      this.autoGrouped.set(false);
      return;
    }
    const prev = this.previousChatRow();
    if (!prev) {
      this.autoGrouped.set(false);
      return;
    }
    this.autoGrouped.set(prev.kjChatAuthor() === me);
  }

  private previousChatRow(): KjChat | null {
    let sib = this.el.nativeElement.previousElementSibling as Element | null;
    while (sib) {
      const row = CHAT_ROW_REGISTRY.get(sib);
      if (row) return row;
      sib = sib.previousElementSibling;
    }
    return null;
  }
}
