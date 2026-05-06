import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { DocsService, DocsTrack, SidebarNode } from '../../services/docs.service';
import { DocsTrackCardComponent } from '../../components/track-card/track-card';

/**
 * /docs/<trackId> landing — lists every item in a single track, grouped by
 * category. Click an item card → navigate to /docs/<trackId>/<slug>.
 *
 * Shares the docs-index layout (sidebar + main + toc-col) and the
 * `.component-grid` / `.component-card-link` CSS patterns so the visual
 * treatment matches the ecosystem index.
 */
@Component({
  selector: 'app-track-index',
  standalone: true,
  imports: [RouterLink, DocsTrackCardComponent],
  templateUrl: './track-index.html',
  styleUrl: '../docs-index/docs-index.css',
})
export class TrackIndexComponent implements OnInit {
  private readonly docs = inject(DocsService);
  private readonly route = inject(ActivatedRoute);
  protected readonly trackId = toSignal(
    this.route.data.pipe(map(d => (d['trackId'] as string) ?? '')),
    { initialValue: '' },
  );

  protected readonly track = computed<DocsTrack | null>(() => {
    const id = this.trackId();
    return this.docs.getTracks().find(t => t.id === id) ?? null;
  });

  protected readonly categories = computed<SidebarNode[]>(
    () => this.track()?.tree ?? [],
  );

  ngOnInit(): void {
    this.docs.loadManifest().subscribe();
  }
}
