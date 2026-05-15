import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjListComponent, KjListItemComponent } from './list';

/**
 * Common list shapes — a divided+hoverable settings list and a sidebar-nav
 * landmark with an active row. Copy-paste starting point.
 */
@Component({
  selector: 'kj-list-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjListComponent, KjListItemComponent],
  styles: [`
    :host { display: grid; gap: var(--kj-space-lg); grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    h4 { margin: 0 0 var(--kj-space-sm); font: 600 var(--kj-text-sm)/1.4 var(--kj-font-sans); color: var(--kj-fg-muted); }
    a { color: inherit; text-decoration: none; }
  `],
  template: `
    <section>
      <h4>Settings</h4>
      <kj-list ariaLabel="Account settings" [divided]="true" [hoverable]="true">
        <kj-list-item>Profile</kj-list-item>
        <kj-list-item>Notifications</kj-list-item>
        <kj-list-item>Billing</kj-list-item>
        <kj-list-item>Security</kj-list-item>
      </kj-list>
    </section>

    <section>
      <h4>Sidebar nav</h4>
      <kj-list as="nav" [arrowNavigation]="true" ariaLabel="Primary navigation">
        <kj-list-item [active]="true">
          <a href="/home" aria-current="page">Home</a>
        </kj-list-item>
        <kj-list-item>
          <a href="/projects">Projects</a>
        </kj-list-item>
        <kj-list-item>
          <a href="/settings">Settings</a>
        </kj-list-item>
      </kj-list>
    </section>
  `,
})
export class KjListUsageExample {}
