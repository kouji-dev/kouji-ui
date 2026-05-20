import { Component, signal } from '@angular/core';
import { KjButtonComponent } from '../button';

/**
 * A walkthrough of the most common button usages — variant, size, loading,
 * disabled, pressed (toggle), and full-width. Use this as the copy-paste
 * starting point for new screens.
 */
@Component({
  selector: 'kj-button-usage-example',
  standalone: true,
  imports: [KjButtonComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); }
    .row { display: flex; gap: var(--kj-space-sm); flex-wrap: wrap; align-items: center; }
  `],
  template: `
    <div class="row">
      <kj-button kjVariant="default" (click)="onSave()">Save changes</kj-button>
      <kj-button kjVariant="destructive">Delete</kj-button>
      <kj-button kjVariant="ghost">Cancel</kj-button>
      <kj-button kjVariant="outline">More info</kj-button>
    </div>

    <div class="row">
      <kj-button kjSize="sm">Small</kj-button>
      <kj-button kjSize="md">Medium</kj-button>
      <kj-button kjSize="lg">Large</kj-button>
    </div>

    <div class="row">
      <kj-button [kjLoading]="busy()" (click)="run()">
        {{ busy() ? 'Saving…' : 'Save' }}
      </kj-button>
      <kj-button [kjDisabled]="true">Disabled</kj-button>
      <kj-button kjVariant="outline" [(kjPressed)]="pressed">
        {{ pressed() ? 'Bold ON' : 'Bold OFF' }}
      </kj-button>
    </div>
  `,
})
export class KjButtonUsageExample {
  readonly busy = signal(false);
  readonly pressed = signal(false);

  onSave(): void {
    /* persist the form */
  }

  run(): void {
    this.busy.set(true);
    setTimeout(() => this.busy.set(false), 1200);
  }
}
