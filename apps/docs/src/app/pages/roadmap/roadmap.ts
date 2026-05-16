import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'kj-roadmap-page',
  standalone: true,
  templateUrl: './roadmap.html',
  styleUrl: './roadmap.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoadmapPage {}
