import type { KjLiveAnnouncerStrategy } from '../../tokens';
import { createAnnouncer } from './_announcer';

/** Announces overlay messages into the page's shared `aria-live="polite"` region. */
export function polite(): KjLiveAnnouncerStrategy {
  return createAnnouncer('polite');
}
