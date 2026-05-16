import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
 * - Browser fallback (dev / non-prerendered): HTTP `GET /api/roadmap`.
 */
@Injectable({ providedIn: 'root' })
export class RoadmapService {
  private readonly http = inject(HttpClient);
  private readonly provider = inject(RoadmapDataProvider);

  readonly items = signal<readonly RoadmapItem[]>([]);

  constructor() {
    const seeded = this.provider.getItems();
    if (seeded && seeded.length > 0) {
      this.items.set(seeded);
    } else {
      // Dev / non-SSR fallback. The API route lives in `apps/docs/src/server.ts`.
      this.http
        .get<readonly RoadmapItem[]>('/api/roadmap')
        .subscribe(list => this.items.set(list));
    }
  }
}
