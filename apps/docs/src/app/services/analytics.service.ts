import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { DefaultTitleStrategy, RouterStateSnapshot } from '@angular/router';

type GtagFn = (...args: unknown[]) => void;

/**
 * GA4 event helper for the docs app.
 *
 * Every method no-ops on the server (SSR/prerender) and when gtag is absent
 * (blocked / offline), so the app never depends on analytics being loaded.
 * index.html configures gtag with `send_page_view: false`; page_views are
 * emitted per successful navigation by {@link AnalyticsTitleStrategy}.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  track(name: string, params: Record<string, unknown> = {}): void {
    if (!this.isBrowser) return;
    const win = this.document.defaultView as (Window & { gtag?: GtagFn }) | null;
    if (typeof win?.gtag === 'function') win.gtag('event', name, params);
  }

  /** page_view with the docs slug/section as custom dimensions when present. */
  pageView(snapshot: RouterStateSnapshot): void {
    if (!this.isBrowser) return;
    let route = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const slug = route.params['slug'];
    // /docs/headless/:slug | /docs/components/:slug → 'headless' | 'components'
    const section = snapshot.url.split('/')[2]?.split('?')[0];
    this.track('page_view', {
      page_location: this.document.defaultView?.location.href,
      page_title: this.document.title,
      ...(slug ? { doc_slug: slug, doc_section: section } : {}),
    });
  }

  /** Debounced search-term reporting — fires once typing settles, not per keystroke. */
  trackSearch(term: string): void {
    if (!this.isBrowser) return;
    clearTimeout(this.searchTimer);
    const t = term.trim().toLowerCase();
    if (t.length < 2) return;
    this.searchTimer = setTimeout(() => this.track('search', { search_term: t }), 800);
  }

  /** Delegated outbound-click reporting. Call once from an app initializer. */
  initOutboundClicks(): void {
    if (!this.isBrowser) return;
    this.document.addEventListener(
      'click',
      e => {
        const a = (e.target as Element | null)?.closest?.('a[href^="http"]') as HTMLAnchorElement | null;
        const win = this.document.defaultView;
        if (a && win && a.host && a.host !== win.location.host) {
          this.track('click', { outbound: true, link_url: a.href, link_domain: a.host });
        }
      },
      { capture: true },
    );
  }
}

/**
 * Emits a GA4 page_view once per successful navigation (including the first).
 *
 * A plain NavigationEnd subscriber would read a stale `document.title` because
 * the router applies the route title AFTER emitting NavigationEnd — hooking the
 * title strategy instead guarantees the title is already set.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsTitleStrategy extends DefaultTitleStrategy {
  private readonly analytics = inject(AnalyticsService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    super.updateTitle(snapshot);
    this.analytics.pageView(snapshot);
  }
}
