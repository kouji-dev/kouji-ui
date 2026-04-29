import { Component, inject } from '@angular/core';
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
  protected readonly components = this.docs.components;
  protected readonly categories = ['foundation', 'overlay', 'data', 'charts', 'a11y'] as const;

  protected byCategory(cat: string): ComponentDoc[] {
    return this.docs.byCategory(cat as ComponentDoc['category']);
  }
}
