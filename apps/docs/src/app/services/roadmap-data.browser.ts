import { Injectable, TransferState, inject } from '@angular/core';
import { RoadmapDataProvider, ROADMAP_TS_KEY } from './roadmap-data.provider';
import type { RoadmapItem } from '../pages/roadmap/roadmap-data';

/**
 * Browser-side roadmap provider.
 * Reads from TransferState embedded during prerender — zero HTTP call. Returns
 * null when TransferState is empty, in which case the board renders empty:
 * there is no runtime server and therefore no `/api/roadmap` to fall back to.
 */
@Injectable()
export class BrowserRoadmapDataProvider extends RoadmapDataProvider {
  private readonly transferState = inject(TransferState);

  getItems(): readonly RoadmapItem[] | null {
    return this.transferState.get(ROADMAP_TS_KEY, null);
  }
}
