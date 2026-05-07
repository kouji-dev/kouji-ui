import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import {
  KjButtonComponent,
  KjInputComponent,
  KjCheckboxComponent,
  KjRadioGroupComponent,
  KjRadioComponent,
  KjToggleComponent,
  KjBadgeComponent,
  KjAvatarComponent,
  KjKbdComponent,
  KjLinkComponent,
  KjCardComponent,
  KjCardHeaderComponent,
  KjCardTitleComponent,
  KjCardSubtitleComponent,
  KjCardContentComponent,
  KjCardFooterComponent,
  KjAccordionComponent,
  KjAccordionItemComponent,
  KjAccordionContentComponent,
  KjTabsComponent,
  KjTabComponent,
  KjTabListComponent,
  KjTabPanelComponent,
} from '@kouji-ui/components';

@Component({
  selector: 'kj-theme-generator-preview',
  standalone: true,
  imports: [
    KjButtonComponent,
    KjInputComponent,
    KjCheckboxComponent,
    KjRadioGroupComponent,
    KjRadioComponent,
    KjToggleComponent,
    KjBadgeComponent,
    KjAvatarComponent,
    KjKbdComponent,
    KjLinkComponent,
    KjCardComponent,
    KjCardHeaderComponent,
    KjCardTitleComponent,
    KjCardSubtitleComponent,
    KjCardContentComponent,
    KjCardFooterComponent,
    KjAccordionComponent,
    KjAccordionItemComponent,
    KjAccordionContentComponent,
    KjTabsComponent,
    KjTabComponent,
    KjTabListComponent,
    KjTabPanelComponent,
  ],
  templateUrl: './theme-generator-preview.html',
  styleUrl: './theme-generator-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorPreviewComponent {
  // Static demo state for components that need a model.
  readonly tab = signal<string>('overview');
  readonly checked = signal(true);
  readonly toggled = signal(true);
  readonly plan = signal<'free' | 'pro' | 'team'>('pro');
}
