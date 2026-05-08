import { Component } from '@angular/core';
import { KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import { KjInputComponent } from '../input/input';
import { KjFieldComponent, KjFieldLabelComponent } from '../field/field';

@Component({
  selector: 'kj-popover-with-form-example',
  standalone: true,
  imports: [
    KjPopoverTrigger,
    KjPopoverContent,
    KjPopoverTitle,
    KjPopoverClose,
    KjButtonComponent,
    KjInputComponent,
    KjFieldComponent,
    KjFieldLabelComponent,
  ],
  template: `
    <kj-button kjPopoverTrigger #t="kjPopoverTrigger">Edit profile</kj-button>
    <kj-popover-content [kjFor]="t">
      <h3 kjPopoverTitle>Edit profile</h3>
      <kj-field>
        <kj-field-label>Display name</kj-field-label>
        <kj-input placeholder="Jane Doe" />
      </kj-field>
      <div style="display: flex; gap: var(--kj-space-sm); justify-content: flex-end; margin-top: var(--kj-space-md);">
        <kj-button kjPopoverClose kjVariant="ghost">Cancel</kj-button>
        <kj-button kjPopoverClose>Save</kj-button>
      </div>
    </kj-popover-content>
  `,
})
export class KjPopoverWithFormExample {}
