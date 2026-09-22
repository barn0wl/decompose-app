// prisma/data/pricing.ts
// Price bands (used at seed time to infer prices for legacy connections) and
// boarding pricing computation.

import { TransportType } from '../../generated/prisma';
import { PricingRule, PriceBand } from './types';

export const PRICE_BANDS: PriceBand[] = [
  { maxKm: 3,        price: 150 },
  { maxKm: 7,        price: 250 },
  { maxKm: 12,       price: 400 },
  { maxKm: 20,       price: 600 },
  { maxKm: 35,       price: 800 },
  { maxKm: Infinity, price: 1200 },
];

export const TRANSPORT_MULTIPLIERS: Record<TransportType, number> = {
  communal_taxi: 1.0,
  gbaka: 1.2,
  sotra_bus: 0.7,
  walking: 0,
};

/**
 * Compute the price for a boarding that travels `distanceStops` along a route.
 * Distance is `|endSequence - startSequence|` (number of segments traveled).
 */
export function computeBoardingPrice(
  pricing: PricingRule,
  distanceStops: number
): number {
  if (pricing.type === 'flat') return pricing.price;

  for (const band of pricing.bands) {
    if (distanceStops <= band.uptoSequence) return band.price;
  }
  return pricing.bands[pricing.bands.length - 1].price;
}

/**
 * Validate a pricing rule. Throws if malformed.
 * Call at seed time to catch bad data early.
 */
export function validatePricing(pricing: PricingRule): void {
  if (pricing.type === 'flat') {
    if (typeof pricing.price !== 'number' || pricing.price < 0) {
      throw new Error('flat pricing must have a non-negative price');
    }
    return;
  }
  if (pricing.type === 'banded') {
    if (!Array.isArray(pricing.bands) || pricing.bands.length === 0) {
      throw new Error('banded pricing must have at least one band');
    }
    let prevUpto = 0;
    for (const band of pricing.bands) {
      if (typeof band.uptoSequence !== 'number' || band.uptoSequence <= prevUpto) {
        throw new Error('banded pricing: uptoSequence must be strictly increasing');
      }
      if (typeof band.price !== 'number' || band.price < 0) {
        throw new Error('banded pricing: price must be non-negative');
      }
      prevUpto = band.uptoSequence;
    }
    return;
  }
  throw new Error(`Unknown pricing type: ${(pricing as any).type}`);
}
