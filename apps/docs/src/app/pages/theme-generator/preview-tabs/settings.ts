import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  KjButtonComponent,
  KjCheckboxComponent,
  KjColorPickerComponent,
  KjFieldComponent,
  KjFieldHelpComponent,
  KjFieldLabelComponent,
  KjFileUploadComponent,
  KjInputComponent,
  KjOptionComponent,
  KjPasswordInputComponent,
  KjRadioComponent,
  KjRadioGroupComponent,
  KjSelectComponent,
  KjSliderComponent,
} from '@kouji-ui/components';

type ThemeMode = 'system' | 'light' | 'dark';

@Component({
  selector: 'kj-preview-settings',
  standalone: true,
  imports: [
    FormsModule,
    KjButtonComponent,
    KjCheckboxComponent,
    KjColorPickerComponent,
    KjFieldComponent,
    KjFieldHelpComponent,
    KjFieldLabelComponent,
    KjFileUploadComponent,
    KjInputComponent,
    KjOptionComponent,
    KjPasswordInputComponent,
    KjRadioComponent,
    KjRadioGroupComponent,
    KjSelectComponent,
    KjSliderComponent,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewSettings {
  protected readonly displayName = signal('Ada Lovelace');
  protected readonly email = signal('ada@example.com');
  protected readonly language = signal<string | undefined>('en');
  protected readonly themeMode = signal<ThemeMode>('system');
  protected readonly density = signal<number>(1);
  protected readonly brand = signal<string>('#5b6cff');
  protected readonly emailNotifications = signal<boolean>(true);
}
