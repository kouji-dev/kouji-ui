import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  KjAlertComponent,
  KjAlertDescriptionComponent,
  KjAlertIconComponent,
  KjAlertTitleComponent,
  KjAvatarComponent,
  KjBadgeComponent,
  KjButtonComponent,
  KjDividerComponent,
  KjProgressBarComponent,
} from '@kouji-ui/components';
import { KPI, PEOPLE } from './fixtures';

@Component({
  selector: 'kj-preview-dashboard',
  standalone: true,
  imports: [
    KjAlertComponent,
    KjAlertDescriptionComponent,
    KjAlertIconComponent,
    KjAlertTitleComponent,
    KjAvatarComponent,
    KjBadgeComponent,
    KjButtonComponent,
    KjDividerComponent,
    KjProgressBarComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewDashboard {
  protected readonly kpi = KPI;
  protected readonly people = PEOPLE;

  protected isPositive(delta: string): boolean {
    return delta.trim().startsWith('+');
  }
}
