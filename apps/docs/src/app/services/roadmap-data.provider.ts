import { makeStateKey } from '@angular/core';
import type { RoadmapItem } from '../pages/roadmap/roadmap-data';

/** Abstract contract — platform-specific implementations via DI. */
export abstract class RoadmapDataProvider {
  /** Synchronous list, or null when not yet available (browser before HTTP load). */
  abstract getItems(): readonly RoadmapItem[] | null;
}

/** TransferState key shared between server and browser providers. */
export const ROADMAP_TS_KEY = makeStateKey<readonly RoadmapItem[]>('roadmap-items');
