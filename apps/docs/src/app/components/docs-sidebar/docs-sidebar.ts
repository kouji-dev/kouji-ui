import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DocsService, ComponentDoc } from '../../services/docs.service';

@Component({
  selector: 'kj-docs-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './docs-sidebar.html',
  styleUrl: './docs-sidebar.css',
})
export class DocsSidebarComponent {
  private readonly docs = inject(DocsService);
  protected readonly categories = ['foundation', 'overlay', 'data', 'charts', 'a11y'] as const;

  protected byCategory(cat: string): ComponentDoc[] {
    return this.docs.byCategory(cat as ComponentDoc['category']);
  }
}
