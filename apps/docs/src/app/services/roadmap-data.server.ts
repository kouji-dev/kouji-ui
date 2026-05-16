import { Injectable, TransferState, inject } from '@angular/core';
import { RoadmapDataProvider, ROADMAP_TS_KEY } from './roadmap-data.provider';
import { getRoadmap } from '../../lib/roadmap-loader';
import type { RoadmapItem } from '../pages/roadmap/roadmap-data';

/**
 * Server-side roadmap provider.
 * Reads `.md` files via Node fs (in `getRoadmap()`), then stores the parsed
 * result in TransferState so the browser can hydrate without an HTTP call.
 */
@Injectable()
export class ServerRoadmapDataProvider extends RoadmapDataProvider {
  private readonly transferState = inject(TransferState);

  getItems(): readonly RoadmapItem[] {
    const items = getRoadmap();
    this.transferState.set(ROADMAP_TS_KEY, items);
    return items;
  }
}
