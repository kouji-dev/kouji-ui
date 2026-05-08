import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputMask } from '@kouji-ui/core';
import {
  KjAccordionComponent,
  KjAccordionContentComponent,
  KjAccordionItemComponent,
  KjAccordionTriggerComponent,
  KjAlertComponent,
  KjAlertDescriptionComponent,
  KjAlertIconComponent,
  KjAlertTitleComponent,
  KjButtonComponent,
  KjDatePickerComponent,
  KjFieldComponent,
  KjFieldHelpComponent,
  KjFieldLabelComponent,
  KjInputComponent,
  KjInputOtpComponent,
  KjSelectComponent,
  KjOptionComponent,
  KjNumberInputComponent,
  KjTextareaComponent,
  KjTimePickerComponent,
} from '@kouji-ui/components';

interface FormStep {
  readonly id: 'identity' | 'contact' | 'verify' | 'review';
  readonly label: string;
}

const STEPS: readonly FormStep[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'contact', label: 'Contact' },
  { id: 'verify', label: 'Verify' },
  { id: 'review', label: 'Review' },
];

@Component({
  selector: 'kj-preview-big-form',
  standalone: true,
  imports: [
    FormsModule,
    KjInputMask,
    KjAccordionComponent,
    KjAccordionContentComponent,
    KjAccordionItemComponent,
    KjAccordionTriggerComponent,
    KjAlertComponent,
    KjAlertDescriptionComponent,
    KjAlertIconComponent,
    KjAlertTitleComponent,
    KjButtonComponent,
    KjDatePickerComponent,
    KjFieldComponent,
    KjFieldHelpComponent,
    KjFieldLabelComponent,
    KjInputComponent,
    KjInputOtpComponent,
    KjSelectComponent,
    KjOptionComponent,
    KjNumberInputComponent,
    KjTextareaComponent,
    KjTimePickerComponent,
  ],
  templateUrl: './big-form.html',
  styleUrl: './big-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewBigForm {
  protected readonly steps = STEPS;
  protected readonly currentStep = signal<FormStep['id']>('identity');

  protected readonly fullName = signal('');
  protected readonly dateOfBirth = signal<Date | null>(null);
  protected readonly phone = signal('');
  protected readonly bio = signal('');
  protected readonly email = signal('');
  protected readonly contactTime = signal<Date | string>(
    new Date(2024, 0, 1, 9, 0, 0),
  );
  protected readonly languages = signal<string[]>([]);
  protected readonly budget = signal<number>(50_000);
  protected readonly otp = signal('');

  protected stepStatus(id: FormStep['id']): 'done' | 'current' | 'todo' {
    const order = this.steps.map((s) => s.id);
    const currentIndex = order.indexOf(this.currentStep());
    const idx = order.indexOf(id);
    if (idx < currentIndex) return 'done';
    if (idx === currentIndex) return 'current';
    return 'todo';
  }
}
