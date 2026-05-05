import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { DocsService, DocsTrack } from '../../services/docs.service';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';
import { DocsTrackCardComponent } from '../../components/track-card/track-card';

/**
 * /docs landing — ecosystem overview.
 *
 * Lists each docs track (one card per workspace package the docs surfaces).
 * Click a card → navigate to `/docs/<trackId>` (the track-index page that
 * lists the items inside that track).
 */
@Component({
  selector: 'app-docs-index',
  standalone: true,
  imports: [DocsSidebarComponent, DocsTrackCardComponent],
  templateUrl: './docs-index.html',
  styleUrl: './docs-index.css',
})
export class DocsIndexComponent implements OnInit {
  protected readonly docs = inject(DocsService);
  protected readonly tracks = signal<DocsTrack[]>([]);
  protected readonly sidebar = viewChild.required<DocsSidebarComponent>('sidebar');

  ngOnInit(): void {
    this.docs.loadManifest().subscribe(() => {
      this.tracks.set(this.docs.getTracks());
    });
  }

  protected itemCount(track: DocsTrack): number {
    return track.tree.reduce((acc, cat) => acc + cat.children.length, 0);
  }
}
