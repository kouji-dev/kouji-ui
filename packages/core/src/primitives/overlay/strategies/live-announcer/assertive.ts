import type { KjLiveAnnouncerStrategy } from '../../tokens';
import { createAnnouncer } from './_announcer';

/** Announces overlay messages into the page's shared `aria-live="assertive"` region. */
export function assertive(): KjLiveAnnouncerStrategy {
  return createAnnouncer('assertive');
}
