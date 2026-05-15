import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { KjDialog, KjDialogService } from './dialog';
import { KjButtonComponent } from '../button/button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. The `open` toggle drives the
 * service-launched dialog; the title / message text + actions toggle are
 * baked into the body component via a small registry signal so the live
 * dialog reflects the knobs while open.
 */
const title = signal('Save changes?');
const message = signal('Your edits will be applied immediately.');
const showCancel = signal(true);

// Bridge signal — read by the body component below. Module-scope because the
// dialog body is instantiated through KjDialogService and cannot accept inputs.
const open = signal(false);

@Component({
  selector: 'app-pg-dialog-body',
  standalone: true,
  imports: [KjDialog, KjButtonComponent],
  template: `
    <kj-dialog>
      <h2 style="margin:0 0 var(--kj-space-md)">{{ title() }}</h2>
      <p>{{ message() }}</p>
      <div style="display:flex; gap: var(--kj-space-sm); justify-content: flex-end; margin-top: var(--kj-space-lg)">
        @if (showCancel()) {
          <kj-button kjVariant="ghost">Cancel</kj-button>
        }
        <kj-button kjVariant="default">Save</kj-button>
      </div>
    </kj-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class KjDialogPlaygroundBody {
  protected readonly title = title;
  protected readonly message = message;
  protected readonly showCancel = showCancel;
}

@Component({
  selector: 'kj-dialog-playground',
  standalone: true,
  imports: [KjButtonComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-lg); align-items: flex-start; min-height: 12rem; }
    .pg-static {
      width: min(24rem, 100%);
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
    .pg-static__actions { display: flex; gap: var(--kj-space-sm); justify-content: flex-end; margin-top: var(--kj-space-lg); }
  `],
  template: `
    <kj-button (click)="onOpen()">Open dialog</kj-button>
    <div class="pg-static" role="dialog" aria-label="Dialog preview">
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      <div class="pg-static__actions">
        @if (showCancel()) {
          <kj-button kjVariant="ghost">Cancel</kj-button>
        }
        <kj-button kjVariant="default">Save</kj-button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogPlaygroundDemo {
  private readonly dialog = inject(KjDialogService);

  protected readonly title = title;
  protected readonly message = message;
  protected readonly showCancel = showCancel;
  protected readonly open = open;

  constructor() {
    // React to the open knob — open the dialog when toggled true, ignore when
    // toggled back to false (the dialog manages its own close lifecycle).
    effect(() => {
      if (open()) {
        const ref = this.dialog.open(KjDialogPlaygroundBody);
        ref.afterClosed$.subscribe(() => open.set(false));
      }
    });
  }

  protected onOpen(): void {
    open.set(true);
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjDialogPlaygroundDemo,
  state: {
    title: title as unknown as ReturnType<typeof signal>,
    message: message as unknown as ReturnType<typeof signal>,
    showCancel: showCancel as unknown as ReturnType<typeof signal>,
    open: open as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'title', label: 'title' },
    { kind: 'text', name: 'message', label: 'message' },
    { kind: 'toggle', name: 'showCancel', label: 'show cancel' },
    { kind: 'toggle', name: 'open', label: 'open' },
  ],
  snippet: (values) => {
    const s = values as {
      title: string;
      message: string;
      showCancel: boolean;
      open: boolean;
    };
    const lines: string[] = [];
    lines.push(`<kj-button (click)="open()">Open dialog</kj-button>`);
    lines.push('');
    lines.push('// dialog body component');
    lines.push('<kj-dialog>');
    lines.push(`  <h2>${s.title}</h2>`);
    lines.push(`  <p>${s.message}</p>`);
    if (s.showCancel) lines.push('  <kj-button kjVariant="ghost">Cancel</kj-button>');
    lines.push('  <kj-button kjVariant="default">Save</kj-button>');
    lines.push('</kj-dialog>');
    return lines.join('\n');
  },
};
