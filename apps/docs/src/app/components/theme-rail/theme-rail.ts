import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { KjButtonComponent, KjListComponent, KjListItemComponent } from '@kouji-ui/components';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { BUILT_IN_NAMES, type BuiltInName } from '../../lib/theme/built-in-themes';

@Component({
  selector: 'kj-theme-rail',
  standalone: true,
  imports: [KjButtonComponent, KjListComponent, KjListItemComponent],
  templateUrl: './theme-rail.html',
  styleUrl: './theme-rail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeRail {
  private readonly draftService = inject(ThemeDraftService);

  protected readonly builtIns = BUILT_IN_NAMES;
  protected readonly mySaved = computed(() => this.draftService.list().map(t => t.name));
  protected readonly currentName = computed(() => this.draftService.draft().name);

  protected readonly activeBase = computed<string>(() => {
    const n = this.currentName();
    if (n.endsWith('-fork')) {
      const base = n.slice(0, -5);
      if ((BUILT_IN_NAMES as readonly string[]).includes(base as BuiltInName)) return base;
    }
    return n;
  });

  protected onForkBuiltIn(name: BuiltInName): void {
    this.draftService.loadFork(name);
  }
  protected onLoadSaved(name: string): void {
    this.draftService.loadSaved(name);
  }
  protected onNewTheme(): void {
    this.draftService.loadFork('light');
    this.draftService.setName('');
  }
}
