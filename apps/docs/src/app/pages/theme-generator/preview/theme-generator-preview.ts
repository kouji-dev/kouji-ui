import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  KjTabsComponent,
  KjTabListComponent,
  KjTabComponent,
  KjTabPanelComponent,
} from '@kouji-ui/components';
import { ThemeDraftService } from '../../../services/theme-draft.service';
import { PreviewChat } from '../preview-tabs/chat';
import { PreviewDashboard } from '../preview-tabs/dashboard';
import { PreviewForm } from '../preview-tabs/form';
import { PreviewLanding } from '../preview-tabs/landing';
import { PreviewModal } from '../preview-tabs/modal';
import { PreviewPricing } from '../preview-tabs/pricing';
import { PreviewSettings } from '../preview-tabs/settings';
import { PreviewTokens } from '../preview-tabs/tokens';

/**
 * Eight ordered preview scenes mirroring the React reference. The order is
 * load-bearing: tabs render with a zero-padded `01..08` prefix derived from
 * array index, so reshuffling here reshuffles the numbering too.
 */
const TABS = [
  'landing',
  'form',
  'dashboard',
  'modal',
  'chat',
  'pricing',
  'settings',
  'tokens',
] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  landing:   'landing',
  form:      'form',
  dashboard: 'dashboard',
  modal:     'modal',
  chat:      'chat',
  pricing:   'pricing',
  settings:  'settings',
  tokens:    'tokens',
};

/**
 * Preview stage host — renders the tab strip and the active scene.
 *
 * Each tab carries a zero-padded numeric prefix as a `.num` span (`01 landing`).
 * The component also exposes a live region with the current theme name so
 * screen readers announce when the draft is renamed.
 */
@Component({
  selector: 'kj-theme-generator-preview',
  standalone: true,
  imports: [
    KjTabsComponent,
    KjTabListComponent,
    KjTabComponent,
    KjTabPanelComponent,
    PreviewChat,
    PreviewDashboard,
    PreviewForm,
    PreviewLanding,
    PreviewModal,
    PreviewPricing,
    PreviewSettings,
    PreviewTokens,
  ],
  templateUrl: './theme-generator-preview.html',
  styleUrl: './theme-generator-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorPreviewComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly draftService = inject(ThemeDraftService);

  protected readonly tabs = TABS;
  protected readonly labels = TAB_LABELS;
  protected readonly active = signal<Tab>(this.initialTab());

  /** Zero-padded display number for each tab, derived from array order. */
  protected num(t: Tab): string {
    const i = this.tabs.indexOf(t);
    return String(i + 1).padStart(2, '0');
  }

  protected readonly themeName = computed(() => this.draftService.draft().name || 'untitled');

  private initialTab(): Tab {
    const q = (typeof location !== 'undefined' ? new URLSearchParams(location.search).get('preview') : null);
    return (TABS as readonly string[]).includes(q ?? '') ? (q as Tab) : 'landing';
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
