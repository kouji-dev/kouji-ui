import { Injectable, TransferState, inject } from '@angular/core';
import { RoadmapDataProvider, ROADMAP_TS_KEY } from './roadmap-data.provider';
import type { RoadmapItem } from '../pages/roadmap/roadmap-data';

/**
 * Browser-side roadmap provider.
 * Reads from TransferState embedded during SSR — zero HTTP call for prerendered
 * or SSR'd pages. Returns null when TransferState is empty (dev / no-SSR), in
 * which case `RoadmapService` falls back to a `GET /api/roadmap` request.
 */
@Injectable()
export class BrowserRoadmapDataProvider extends RoadmapDataProvider {
  private readonly transferState = inject(TransferState);

  getItems(): readonly RoadmapItem[] | null {
    return this.transferState.get(ROADMAP_TS_KEY, null);
  }
}
