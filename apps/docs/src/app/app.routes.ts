import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
  },
  {
    path: 'docs',
    loadComponent: () => import('./pages/docs-index/docs-index').then(m => m.DocsIndexComponent),
  },
  {
    path: 'docs/getting-started',
    loadComponent: () => import('./pages/getting-started/getting-started').then(m => m.GettingStartedComponent),
  },
  {
    path: 'docs/headless',
    loadComponent: () => import('./pages/track-index/track-index').then(m => m.TrackIndexComponent),
    data: { trackId: 'headless' },
  },
  {
    path: 'docs/components',
    loadComponent: () => import('./pages/track-index/track-index').then(m => m.TrackIndexComponent),
    data: { trackId: 'components' },
  },
  {
    path: 'docs/headless/:slug',
    loadComponent: () => import('./pages/component-doc/component-doc').then(m => m.ComponentDocComponent),
  },
  {
    path: 'docs/components/:slug',
    loadComponent: () => import('./pages/component-doc/component-doc').then(m => m.ComponentDocComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
