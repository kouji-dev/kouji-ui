import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { KjSkipLinkComponent } from '@kouji-ui/components';
import { NavbarComponent } from '../../components/navbar/navbar';

/**
 * Shared parent layout for all top-level page routes.
 *
 * Owns the global navbar and gives the routed page a single flex viewport to
 * fill. Pinned at the route level (not at `app-root`) so the navbar instance
 * never unmounts when navigating between sibling pages — that prevents the
 * brief flex re-distribution we saw when the host previously sat directly
 * under `<router-outlet />` in `app.ts`.
 */
@Component({
  selector: 'kj-main-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, KjSkipLinkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <kj-skip-link />
    <kj-navbar />
    <router-outlet />
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }
    :host > router-outlet { display: contents; }
  `,
})
export class MainLayoutComponent {}
