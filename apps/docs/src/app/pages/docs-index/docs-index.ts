import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DocsService, ComponentDoc } from '../../services/docs.service';

@Component({
  selector: 'app-docs-index',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './docs-index.html',
  styleUrl: './docs-index.css',
})
export class DocsIndexComponent {
  private readonly docs = inject(DocsService);

  protected readonly manifest = toSignal(this.docs.getManifest());
  protected readonly components = computed(() => this.manifest()?.components ?? []);
  protected readonly categories = ['foundation', 'overlay', 'data', 'charts', 'a11y'] as const;

  protected byCategory(cat: string): ComponentDoc[] {
    return this.components().filter(c => c.category === cat);
  }
}
