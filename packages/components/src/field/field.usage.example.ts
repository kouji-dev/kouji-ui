import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjAriaDescribedBy } from '@kouji-ui/core';
import { KjInputComponent } from '../input/input';
import {
  KjFieldComponent,
  KjFieldErrorComponent,
  KjFieldGroupComponent,
  KjFieldHelpComponent,
  KjFieldLabelComponent,
} from './field';

/**
 * Common field shapes assembled into one screen — required, with help, with
 * error, and a prefix/suffix group. Use as the copy-paste starting point for
 * new forms.
 */
@Component({
  selector: 'kj-field-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KjFieldComponent,
    KjFieldLabelComponent,
    KjFieldHelpComponent,
    KjFieldErrorComponent,
    KjFieldGroupComponent,
    KjInputComponent,
    KjAriaDescribedBy,
    FormsModule,
  ],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-lg); max-width: 420px; }
  `],
  template: `
    <kj-field [kjRequired]="true" #email="kjField">
      <kj-field-label>Email</kj-field-label>
      <kj-input
        type="email"
        kjAriaDescribedBy
        [id]="email.controlId()"
        [kjDescribedBy]="$any(email.describedByIds())"
      />
      <kj-field-help>We'll never share your email.</kj-field-help>
    </kj-field>

    <kj-field [kjInvalid]="true">
      <kj-field-label>Username</kj-field-label>
      <kj-input type="text" value="invalid name" [invalid]="true" />
      <kj-field-error>Username can only contain letters and numbers.</kj-field-error>
    </kj-field>

    <kj-field>
      <kj-field-label>Price</kj-field-label>
      <kj-field-group>
        <span prefix>$</span>
        <kj-input type="text" placeholder="0.00" />
        <span suffix>USD</span>
      </kj-field-group>
    </kj-field>
  `,
})
export class KjFieldUsageExample {}
