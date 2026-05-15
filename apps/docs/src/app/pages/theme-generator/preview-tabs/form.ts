import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  KjButtonComponent,
  KjCheckboxComponent,
  KjFieldComponent,
  KjFieldErrorComponent,
  KjFieldHelpComponent,
  KjFieldLabelComponent,
  KjInputComponent,
  KjOptionComponent,
  KjSelectComponent,
} from '@kouji-ui/components';

const TEAM_OPTIONS = ['just me', '2-10', '11-50', '50+'] as const;

/**
 * Preview scene 02 — Form: create-account flow.
 *
 * Mirrors SceneForm from the React reference: name + email + team + agree
 * with live email validation showing the danger intent token.
 */
@Component({
  selector: 'kj-preview-form',
  standalone: true,
  imports: [
    FormsModule,
    KjButtonComponent,
    KjCheckboxComponent,
    KjFieldComponent,
    KjFieldErrorComponent,
    KjFieldHelpComponent,
    KjFieldLabelComponent,
    KjInputComponent,
    KjOptionComponent,
    KjSelectComponent,
  ],
  templateUrl: './form.html',
  styleUrl: './form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewForm {
  protected readonly teamOptions = TEAM_OPTIONS;

  protected readonly fullName = signal('kosuke maeda');
  protected readonly email = signal('invalid-email');
  protected readonly teamSize = signal<string>('2-10');
  protected readonly agree = signal(true);

  protected readonly emailValid = computed(() => /@/.test(this.email()));
  protected readonly submitDisabled = computed(() => !this.emailValid() || !this.agree());
}
