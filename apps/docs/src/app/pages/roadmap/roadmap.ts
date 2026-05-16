import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { ROADMAP } from './roadmap-data';

@Component({
  selector: 'kj-roadmap-page',
  standalone: true,
  templateUrl: './roadmap.html',
  styleUrl: './roadmap.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoadmapPage {
  protected readonly stats = computed(() => ({
    shipped:   ROADMAP.filter(i => i.status === 'shipped').length,
    wip:       ROADMAP.filter(i => i.status === 'wip').length,
    next:      ROADMAP.filter(i => i.status === 'next').length,
    idea:      ROADMAP.filter(i => i.status === 'idea').length,
    candidate: ROADMAP.filter(i => i.candidate).length,
  }));
}
