import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PreviewBigForm } from '../preview-tabs/big-form';
import { PreviewChat } from '../preview-tabs/chat';
import { PreviewDashboard } from '../preview-tabs/dashboard';
import { PreviewSearch } from '../preview-tabs/search';
import { PreviewSettings } from '../preview-tabs/settings';

const TABS = ['dashboard', 'settings', 'big-form', 'search', 'chat'] as const;
type Tab = typeof TABS[number];

@Component({
  selector: 'kj-theme-generator-preview',
  standalone: true,
  imports: [PreviewDashboard, PreviewSettings, PreviewBigForm, PreviewSearch, PreviewChat],
  templateUrl: './theme-generator-preview.html',
  styleUrl: './theme-generator-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorPreviewComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly tabs = TABS;
  protected readonly active = signal<Tab>(this.initialTab());

  private initialTab(): Tab {
    const q = (typeof location !== 'undefined' ? new URLSearchParams(location.search).get('preview') : null);
    return (TABS as readonly string[]).includes(q ?? '') ? (q as Tab) : 'dashboard';
  }

  protected setActive(t: Tab): void {
    this.active.set(t);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { preview: t },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
