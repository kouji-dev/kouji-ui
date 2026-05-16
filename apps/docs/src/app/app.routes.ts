import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shells/main-layout/main-layout').then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
      },
      {
        path: 'docs',
        loadComponent: () => import('./shells/docs-shell/docs-shell').then(m => m.DocsShellComponent),
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/docs-index/docs-index').then(m => m.DocsIndexComponent),
          },
          {
            path: 'getting-started',
            loadComponent: () => import('./pages/getting-started/getting-started').then(m => m.GettingStartedComponent),
          },
          {
            path: 'headless',
            loadComponent: () => import('./pages/track-index/track-index').then(m => m.TrackIndexComponent),
            data: { trackId: 'headless' },
          },
          {
            path: 'components',
            loadComponent: () => import('./pages/track-index/track-index').then(m => m.TrackIndexComponent),
            data: { trackId: 'components' },
          },
          {
            path: 'headless/:slug',
            loadComponent: () => import('./pages/component-doc/component-doc').then(m => m.ComponentDocComponent),
          },
          {
            path: 'components/:slug',
            loadComponent: () => import('./pages/component-doc/component-doc').then(m => m.ComponentDocComponent),
          },
        ],
      },
      {
        path: 'theme-generator',
        loadComponent: () => import('./shells/theme-generator-shell/theme-generator-shell').then(m => m.ThemeGeneratorShellComponent),
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/theme-generator/theme-generator').then(m => m.ThemeGeneratorComponent),
          },
        ],
      },
      {
        path: 'roadmap',
        loadComponent: () => import('./pages/roadmap/roadmap').then(m => m.RoadmapPage),
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
