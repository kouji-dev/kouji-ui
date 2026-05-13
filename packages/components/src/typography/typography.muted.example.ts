import { Component } from '@angular/core';
import { KjMuted } from '@kouji-ui/core';

/**
 * Muted text example using the `kjMuted` directive.
 *
 * Reflects `data-tone="muted"` on the host so theme CSS keys off it; the
 * directive owns no styling itself. Use for secondary metadata that should
 * read at a lower visual weight while still meeting AAA contrast.
 */
@Component({
  selector: 'kj-typography-muted-example',
  standalone: true,
  imports: [KjMuted],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`],
  template: `
    <p>
      Last updated <span kjMuted>3 minutes ago</span> by
      <span kjMuted>Jamie Cole</span>.
    </p>
  `,
})
export class KjTypographyMutedExample {}
