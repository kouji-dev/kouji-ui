import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  KjTabsComponent,
  KjTabListComponent,
  KjTabComponent,
  KjTabPanelComponent,
} from '@kouji-ui/components';
import { PreviewBigForm } from '../preview-tabs/big-form';
import { PreviewChat } from '../preview-tabs/chat';
import { PreviewDashboard } from '../preview-tabs/dashboard';
import { PreviewSearch } from '../preview-tabs/search';
import { PreviewSettings } from '../preview-tabs/settings';

const TABS = ['dashboard', 'settings', 'big-form', 'search', 'chat'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  dashboard: 'Dashboard',
  settings:  'Settings',
  'big-form': 'Big form',
  search:    'Search',
  chat:      'Chat',
};

@Component({
  selector: 'kj-theme-generator-preview',
  standalone: true,
  imports: [
    KjTabsComponent,
    KjTabListComponent,
    KjTabComponent,
    KjTabPanelComponent,
    PreviewDashboard,
    PreviewSettings,
    PreviewBigForm,
    PreviewSearch,
    PreviewChat,
  ],
  templateUrl: './theme-generator-preview.html',
  styleUrl: './theme-generator-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorPreviewComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly tabs = TABS;
  protected readonly labels = TAB_LABELS;
  protected readonly active = signal<Tab>(this.initialTab());

  private initialTab(): Tab {
    const q = (typeof location !== 'undefined' ? new URLSearchParams(location.search).get('preview') : null);
    return (TABS as readonly string[]).includes(q ?? '') ? (q as Tab) : 'dashboard';
  }

  protected setActive(t: string): void {
    if (!(TABS as readonly string[]).includes(t)) return;
    this.active.set(t as Tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { preview: t },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
