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

interface TimelineEvent {
  readonly icon: string;
  readonly tone: 'success' | 'info' | 'warning' | 'destructive';
  readonly title: string;
  readonly when: string;
}

interface ProjectRow {
  readonly name: string;
  readonly owner: string;
  readonly progress: number;
  readonly status: 'On track' | 'At risk' | 'Delayed' | 'Done';
}

const TIMELINE: readonly TimelineEvent[] = [
  { icon: '✓', tone: 'success', title: 'Build #482 succeeded on main', when: '2m ago' },
  { icon: 'i', tone: 'info', title: 'Ada Lovelace opened PR #218', when: '14m ago' },
  { icon: '!', tone: 'warning', title: 'Latency spike detected in API west-2', when: '38m ago' },
  { icon: '✓', tone: 'success', title: 'Nightly backup completed', when: '2h ago' },
  { icon: 'i', tone: 'info', title: 'Grace Hopper invited 3 teammates', when: '5h ago' },
  { icon: '×', tone: 'destructive', title: 'Worker failed on job queue:emails', when: '6h ago' },
  { icon: '✓', tone: 'success', title: 'Release v1.4.2 published', when: 'Yesterday' },
];

const CHART = [
  { label: 'Mon', value: 30 },
  { label: 'Tue', value: 55 },
  { label: 'Wed', value: 42 },
  { label: 'Thu', value: 80 },
  { label: 'Fri', value: 65 },
  { label: 'Sat', value: 90 },
  { label: 'Sun', value: 72 },
] as const;

const PROJECTS: readonly ProjectRow[] = [
  { name: 'Atlas redesign',  owner: 'Ada Lovelace', progress: 78, status: 'On track' },
  { name: 'Compiler v3',     owner: 'Grace Hopper', progress: 42, status: 'At risk' },
  { name: 'Cipher engine',   owner: 'Alan Turing',  progress: 15, status: 'Delayed' },
  { name: 'Kernel cleanup',  owner: 'Linus T.',     progress: 100, status: 'Done' },
];

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
  protected readonly timeline = TIMELINE;
  protected readonly chart = CHART;
  protected readonly projects = PROJECTS;
  protected readonly chartMax = 100;

  protected isPositive(delta: string): boolean {
    return delta.trim().startsWith('+');
  }

  protected statusTone(status: ProjectRow['status']): 'success' | 'info' | 'warning' | 'destructive' {
    switch (status) {
      case 'Done': return 'success';
      case 'On track': return 'info';
      case 'At risk': return 'warning';
      case 'Delayed': return 'destructive';
    }
  }
}
