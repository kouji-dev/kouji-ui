import { Component, inject, signal } from '@angular/core';
import { KjDrawer, KjDrawerService, KjDrawerRef } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import { KjInputComponent } from '../input/input';
import { KjFieldComponent, KjFieldLabelComponent } from '../field/field';

@Component({
  standalone: true,
  imports: [
    KjDrawer,
    KjButtonComponent,
    KjInputComponent,
    KjFieldComponent,
    KjFieldLabelComponent,
  ],
  template: `
    <kj-drawer>
      <h2 style="margin: 0 0 var(--kj-space-md);">Edit profile</h2>
      <kj-field>
        <kj-field-label>Display name</kj-field-label>
        <kj-input placeholder="Jane Doe" />
      </kj-field>
      <kj-field>
        <kj-field-label>Email</kj-field-label>
        <kj-input placeholder="jane@example.com" />
      </kj-field>
      <div style="display: flex; gap: var(--kj-space-sm); justify-content: flex-end; margin-top: var(--kj-space-lg);">
        <kj-button kjVariant="ghost" (click)="ref.close()">Cancel</kj-button>
        <kj-button (click)="ref.close('saved')">Save</kj-button>
      </div>
    </kj-drawer>
  `,
})
class Body {
  protected readonly ref = inject(KjDrawerRef);
}

@Component({
  selector: 'kj-drawer-with-form-example',
  standalone: true,
  imports: [KjButtonComponent],
  template: `<kj-button (click)="open()">Open form drawer</kj-button>`,
})
export class KjDrawerWithFormExample {
  private readonly drawer = inject(KjDrawerService);
  open(): void { this.drawer.open(Body); }
}
