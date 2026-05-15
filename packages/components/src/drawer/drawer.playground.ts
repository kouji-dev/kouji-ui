import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { KjDrawer, KjDrawerService } from './drawer';
import { KjButtonComponent } from '../button/button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. The `open` toggle drives the
 * service-launched drawer; the title / message text are picked up by the
 * drawer body component through module-scope bridges so the live panel
 * reflects the knob values.
 */
const title = signal('Drawer');
const message = signal('Slide-in side panel — close with Escape or the backdrop.');
const open = signal(false);

@Component({
  selector: 'app-pg-drawer-body',
  standalone: true,
  imports: [KjDrawer],
  template: `
    <kj-drawer>
      <h2 style="margin:0 0 var(--kj-space-md)">{{ title() }}</h2>
      <p>{{ message() }}</p>
    </kj-drawer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class KjDrawerPlaygroundBody {
  protected readonly title = title;
  protected readonly message = message;
}

@Component({
  selector: 'kj-drawer-playground',
  standalone: true,
  imports: [KjButtonComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-lg); align-items: flex-start; min-height: 12rem; }
    .pg-static {
      width: 18rem;
      min-height: 12rem;
      background: var(--kj-bg-elevated);
      color: var(--kj-fg-default);
      border: var(--kj-border) solid var(--kj-border-default);
      border-radius: var(--kj-radius-box);
      padding: var(--kj-space-xl);
      box-shadow: var(--kj-shadow-lg);
      font: 0.9375rem / 1.5 var(--kj-font-sans);
    }
    .pg-static h3 { margin: 0 0 var(--kj-space-md); font-size: 1.125rem; }
    .pg-static p { margin: 0; color: var(--kj-fg-muted); }
  `],
  template: `
    <kj-button (click)="onOpen()">Open drawer</kj-button>
    <div class="pg-static" role="dialog" aria-label="Drawer preview">
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDrawerPlaygroundDemo {
  private readonly drawer = inject(KjDrawerService);

  protected readonly title = title;
  protected readonly message = message;
  protected readonly open = open;

  constructor() {
    effect(() => {
      if (open()) {
        const ref = this.drawer.open(KjDrawerPlaygroundBody);
        ref.afterClosed$.subscribe(() => open.set(false));
      }
    });
  }

  protected onOpen(): void {
    open.set(true);
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjDrawerPlaygroundDemo,
  state: {
    title: title as unknown as ReturnType<typeof signal>,
    message: message as unknown as ReturnType<typeof signal>,
    open: open as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'title', label: 'title' },
    { kind: 'text', name: 'message', label: 'message' },
    { kind: 'toggle', name: 'open', label: 'open' },
  ],
  snippet: (values) => {
    const s = values as { title: string; message: string; open: boolean };
    const lines: string[] = [];
    lines.push(`<kj-button (click)="open()">Open drawer</kj-button>`);
    lines.push('');
    lines.push('// drawer body component');
    lines.push('<kj-drawer>');
    lines.push(`  <h2>${s.title}</h2>`);
    lines.push(`  <p>${s.message}</p>`);
    lines.push('</kj-drawer>');
    return lines.join('\n');
  },
};
