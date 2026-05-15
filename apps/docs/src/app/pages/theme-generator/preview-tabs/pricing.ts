import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  KjBadgeComponent,
  KjButtonComponent,
  KjCardComponent,
  KjDividerComponent,
} from '@kouji-ui/components';

interface PricingTier {
  readonly id: string;
  readonly name: string;
  readonly price: string;
  readonly cadence: string;
  readonly desc: string;
  readonly features: readonly string[];
  readonly cta: string;
  readonly featured: boolean;
}

const TIERS: readonly PricingTier[] = [
  {
    id: 'starter', name: 'starter', price: 'free', cadence: '',
    desc: 'for personal projects.',
    features: ['1 workspace', '5 projects', 'community support'],
    cta: 'start free', featured: false,
  },
  {
    id: 'pro', name: 'pro', price: '$12', cadence: '/mo',
    desc: 'for serious side projects.',
    features: ['unlimited projects', 'version history', 'priority support', 'custom themes'],
    cta: 'start trial', featured: true,
  },
  {
    id: 'team', name: 'team', price: '$36', cadence: '/mo',
    desc: 'for whole product teams.',
    features: ['everything in pro', 'team workspaces', 'sso + scim', 'audit log'],
    cta: 'contact sales', featured: false,
  },
];

/**
 * Preview scene 06 — Pricing: three-tier comparison.
 *
 * Mirrors ScenePricing from the React reference. Demonstrates how the
 * primary intent and the radius-lg token combine on a featured card.
 */
@Component({
  selector: 'kj-preview-pricing',
  standalone: true,
  imports: [
    KjBadgeComponent,
    KjButtonComponent,
    KjCardComponent,
    KjDividerComponent,
  ],
  templateUrl: './pricing.html',
  styleUrl: './pricing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewPricing {
  protected readonly tiers = TIERS;
}
