import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type KjLivePoliteness = 'polite' | 'assertive';

const SR_ONLY_STYLE = `
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/**
 * Global ARIA live regions, one polite + one assertive.
 * Lazily appended to document.body. SSR-safe (no-op on server).
 */
@Injectable({ providedIn: 'root' })
export class KjLiveAnnouncerService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly regions: Partial<Record<KjLivePoliteness, HTMLElement>> = {};

  announce(message: string, politeness: KjLivePoliteness = 'polite'): void {
    if (!this.isBrowser) return;
    const region = this.ensureRegion(politeness);
    region.textContent = '';
    // Re-set on next frame so AT picks up the change even if same string.
    requestAnimationFrame(() => { region.textContent = message; });
  }

  private ensureRegion(politeness: KjLivePoliteness): HTMLElement {
    let region = this.regions[politeness];
    if (region) return region;
    region = document.createElement('div');
    region.setAttribute('data-kj-live-region', politeness);
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.style.cssText = SR_ONLY_STYLE;
    document.body.appendChild(region);
    this.regions[politeness] = region;
    return region;
  }
}
