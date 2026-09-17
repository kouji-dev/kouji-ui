import { DOCUMENT } from '@angular/common';
import {
  DestroyRef,
  Injectable,
  InjectionToken,
  Injector,
  inject,
} from '@angular/core';
import { kjDevMode, kjDevWarn } from '../diagnostics/dev-mode';

/**
 * Attribute on `<html>` counting the {@link KjId} instances alive in one
 * document. Only read to warn about a second, un-namespaced Angular root —
 * never to derive an id, so it can never change what a single app renders.
 */
const KJ_ID_ROOTS_ATTR = 'data-kj-id-roots';

/**
 * Suffix appended to every id {@link KjId} mints, so two Angular roots sharing
 * one document cannot generate the same id.
 *
 * Empty by default, which keeps ids byte-identical to what a single
 * application has always rendered. Provide it — normally with the same value
 * as Angular's `APP_ID` — in each application that shares a page with another:
 *
 * ```ts
 * providers: [{ provide: KJ_ID_NAMESPACE, useValue: 'checkout' }]
 * // → kj-field-1-checkout, kj-panel-1-checkout, …
 * ```
 *
 * `APP_ID` is deliberately *not* read automatically: `@angular/platform-browser/testing`
 * sets it to `'a'`, so every spec in every downstream app would silently render
 * different ids than production.
 */
export const KJ_ID_NAMESPACE = new InjectionToken<string>('KJ_ID_NAMESPACE', {
  providedIn: 'root',
  factory: () => '',
});

/**
 * Stable id minter. Every generated DOM id in the library goes through it:
 * overlay panels, form fields, list items, calendars, chat turns, and every
 * `aria-controls` / `aria-describedby` / `for=` IDREF built on top of them.
 *
 * **Per injector, per prefix, deterministic.** Counters restart with the root
 * injector, which is what makes server and client agree: a server render mints
 * `kj-field-1`, the hydrating client mints `kj-field-1`. A module-level
 * `let counter = 0` cannot do that — in a long-lived SSR process (or one
 * prerender process walking a whole route table) it keeps climbing across
 * renders, so the served markup carries ids the client never produces.
 * `crypto.randomUUID()` is worse still: server and client differ every time.
 *
 * Each prefix has its own sequence, so adding a call site in one feature never
 * renumbers another's ids.
 *
 * Two applications on one page keep their ids apart through
 * {@link KJ_ID_NAMESPACE}; dev mode warns when a second root starts minting
 * without one. Replacing the whole service
 * (`{ provide: KjId, useClass: MyId }`) still works — it is one class with one
 * public method.
 *
 * @doc-category Core/Overlay
 * @doc
 * @doc-name id
 * @doc-description Mints deterministic, per-injector DOM ids that survive SSR hydration.
 */
@Injectable({ providedIn: 'root' })
export class KjId {
  private readonly _document = inject(DOCUMENT, { optional: true });
  private readonly _destroyRef = inject(DestroyRef, { optional: true });
  private readonly _counters = new Map<string, number>();

  /** Suffix appended to every minted id; `''` unless {@link KJ_ID_NAMESPACE} is provided. */
  readonly namespace = inject(KJ_ID_NAMESPACE, { optional: true }) ?? '';

  constructor() {
    this.trackRoot();
  }

  /**
   * Mints the next id for `prefix`: `kj-<prefix>-<n>`, plus `-<namespace>`
   * when one is provided. An empty prefix mints `kj-<n>`.
   */
  mint(prefix = ''): string {
    const seq = (this._counters.get(prefix) ?? 0) + 1;
    this._counters.set(prefix, seq);
    const base = prefix ? `kj-${prefix}-${seq}` : `kj-${seq}`;
    return this.namespace ? `${base}-${this.namespace}` : base;
  }

  /**
   * Dev-only: refcounts live minters on `<html>` so a second Angular root that
   * left {@link KJ_ID_NAMESPACE} unset is told why its ids collide, instead of
   * silently pointing one app's `for=` at the other app's input. The count is
   * decremented when the injector is destroyed, so it tracks what is actually
   * live rather than what has ever existed.
   */
  private trackRoot(): void {
    const html = this._document?.documentElement;
    if (!html || !kjDevMode()) return;
    const live = readRootCount(html) + 1;
    html.setAttribute(KJ_ID_ROOTS_ATTR, String(live));
    if (live > 1 && !this.namespace) {
      kjDevWarn(
        'KjId',
        'A second Angular root is minting ids in this document without a ' +
          'KJ_ID_NAMESPACE, so generated ids — and the for= / aria-describedby / ' +
          'aria-controls references built on them — can collide across the two apps. ' +
          'Provide KJ_ID_NAMESPACE (normally your APP_ID) in each application. Two ' +
          '*copies* of @kouji-ui/core on one page remain unsupported; see ' +
          'rules/architecture.md.',
      );
    }
    this._destroyRef?.onDestroy(() => {
      const next = readRootCount(html) - 1;
      if (next > 0) html.setAttribute(KJ_ID_ROOTS_ATTR, String(next));
      else html.removeAttribute(KJ_ID_ROOTS_ATTR);
    });
  }
}

function readRootCount(html: HTMLElement): number {
  const raw = Number(html.getAttribute(KJ_ID_ROOTS_ATTR));
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

let _detached: KjId | null = null;

/**
 * The injector's {@link KjId} when called inside an injection context, and a
 * single detached minter otherwise.
 *
 * Prefer `inject(KjId)` directly. This exists for classes and exported helpers
 * that must also work when constructed by hand (`new KjChatStore()`) or called
 * from outside DI — it keeps them minting without any module-level counter.
 * The detached minter has no namespace, so it is the right answer only where
 * there was no injector to scope the ids to in the first place.
 */
export function resolveKjId(): KjId {
  try {
    // `inject()` throws NG0203 outside an injection context. Angular 22 has no
    // public `isInInjectionContext()`, and `assertInInjectionContext` throws
    // the same way, so probing by catching is the only non-private option.
    return inject(KjId);
  } catch {
    return (_detached ??= Injector.create({
      providers: [{ provide: KjId, useClass: KjId }],
    }).get(KjId));
  }
}

/** Mints one id through {@link resolveKjId}. */
export function mintKjId(prefix = ''): string {
  return resolveKjId().mint(prefix);
}
