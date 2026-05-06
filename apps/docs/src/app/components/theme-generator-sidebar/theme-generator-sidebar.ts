import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { BUILT_IN_NAMES, type BuiltInName } from '../../lib/theme/built-in-themes';

@Component({
  selector: 'kj-theme-generator-sidebar',
  standalone: true,
  templateUrl: './theme-generator-sidebar.html',
  styleUrl: './theme-generator-sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorSidebarComponent {
  private readonly draftService = inject(ThemeDraftService);

  protected readonly builtIns = BUILT_IN_NAMES;
  protected readonly mySaved = computed(() => this.draftService.list().map(t => t.name));
  protected readonly currentName = computed(() => this.draftService.draft().name);

  protected onForkBuiltIn(name: BuiltInName): void { this.draftService.loadFork(name); }
  protected onLoadSaved(name: string): void { this.draftService.loadSaved(name); }
  protected onNewTheme(): void { this.draftService.loadFork('light'); this.draftService.setName(''); }
}
