import { Component, inject, OnInit, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocsService, ComponentDoc } from '../../services/docs.service';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';

@Component({
  selector: 'app-docs-index',
  standalone: true,
  imports: [RouterLink, DocsSidebarComponent],
  templateUrl: './docs-index.html',
  styleUrl: './docs-index.css',
})
export class DocsIndexComponent implements OnInit {
  protected readonly docs = inject(DocsService);
  protected readonly categories = ['base', 'inputs', 'navigation', 'overlays', 'data', 'display', 'a11y'] as const;
  protected readonly components = this.docs.components;
  protected readonly sidebar = viewChild.required<DocsSidebarComponent>('sidebar');

  ngOnInit(): void {
    this.docs.loadManifest().subscribe();
  }

  protected byCategory(cat: string): ComponentDoc[] {
    return this.docs.byCategory(cat as ComponentDoc['category']);
  }
}
