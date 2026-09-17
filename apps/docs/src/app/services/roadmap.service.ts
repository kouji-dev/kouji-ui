import { Injectable, inject, signal } from '@angular/core';
import { RoadmapDataProvider } from './roadmap-data.provider';
import type { RoadmapItem } from '../pages/roadmap/roadmap-data';

/**
 * Provides access to roadmap items.
 *
 * Data flow:
 * - Server/prerender: `RoadmapDataProvider` → `ServerRoadmapDataProvider` →
 *   `getRoadmap()` (Node fs reads `.md` files) → result stored in TransferState
 *   for browser hydration.
 * - Browser (prerendered/SSR): `RoadmapDataProvider` → `BrowserRoadmapDataProvider`
 *   reads from TransferState — zero HTTP call.
 *
 * There is **no HTTP fallback**. The build is `outputMode: "static"` and the
 * deploy is static, so no `/api/roadmap` route exists in any environment — the
 * old fallback could only ever produce a 404. Seeding happens instead through
 * the eager `provideAppInitializer(() => inject(RoadmapService))` in
 * `app.config.ts`, which runs during the prerender of *every* route and so
 * writes the items into TransferState even for pages that never show the board.
 */
@Injectable({ providedIn: 'root' })
export class RoadmapService {
  private readonly provider = inject(RoadmapDataProvider);

  readonly items = signal<readonly RoadmapItem[]>([]);

  constructor() {
    const seeded = this.provider.getItems();
    if (seeded && seeded.length > 0) {
      this.items.set(seeded);
    }
  }
}
