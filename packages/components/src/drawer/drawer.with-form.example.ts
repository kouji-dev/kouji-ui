import { Component } from '@angular/core';
import { KjDrawerTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import { KjInputComponent } from '../input/input';
import {
  KjDrawerComponent, KjDrawerHeaderComponent, KjDrawerTitleComponent,
  KjDrawerBodyComponent, KjDrawerFooterComponent,
} from './drawer';

@Component({
  selector: 'kj-drawer-with-form-example',
  standalone: true,
  imports: [
    KjDrawerTrigger, KjButtonComponent, KjInputComponent,
    KjDrawerComponent,
    KjDrawerHeaderComponent, KjDrawerTitleComponent,
    KjDrawerBodyComponent, KjDrawerFooterComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button [kjDrawerTrigger]="drawer">Edit profile</kj-button>
    <ng-template #drawer>
      <kj-drawer #d="kjDrawerContent">
        <kj-drawer-header>
          <kj-drawer-title>Edit profile</kj-drawer-title>
        </kj-drawer-header>
        <kj-drawer-body>
          <form (submit)="$event.preventDefault(); d.close('saved')" style="display:flex;flex-direction:column;gap:1rem;">
            <div style="display:flex;flex-direction:column;gap:0.25rem;">
              <span>Display name</span>
              <kj-input type="text" placeholder="Ada Lovelace" />
            </div>
            <div style="display:flex;flex-direction:column;gap:0.25rem;">
              <span>Email</span>
              <kj-input type="email" placeholder="ada@example.com" />
            </div>
          </form>
        </kj-drawer-body>
        <kj-drawer-footer>
          <kj-button kjVariant="ghost" (click)="d.close()">Cancel</kj-button>
          <kj-button kjType="submit" (click)="d.close('saved')">Save</kj-button>
        </kj-drawer-footer>
      </kj-drawer>
    </ng-template>
  `,
})
export class KjDrawerWithFormExample {}
