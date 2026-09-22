// src/services/routing/pricing.service.ts
// Compute prices for boardings based on route pricing rules.

import { PricingRule } from './types';

/**
 * Compute the price for a boarding given:
 *  - the route's pricing rule
 *  - the distance traveled in "stops" (number of segments)
 *
 * Examples:
 *  - flat { type: 'flat', price: 300 }, any distance → 300
 *  - banded { bands: [5:200, 15:300, 999:500] }
 *      distance 1  → 200
 *      distance 5  → 200
 *      distance 6  → 300
 *      distance 15 → 300
 *      distance 16 → 500
 *      distance 40 → 500
 */
export function computeBoardingPrice(
  pricing: PricingRule,
  distanceStops: number
): number {
  if (pricing.type === 'flat') {
    return pricing.price;
  }

  // Banded
  for (const band of pricing.bands) {
    if (distanceStops <= band.uptoSequence) {
      return band.price;
    }
  }

  // Fallback: last band (should be a catch-all like 999)
  return pricing.bands[pricing.bands.length - 1].price;
}

/**
 * Validate a pricing rule. Throws if malformed.
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
    // Last band must be a catch-all
    const lastBand = pricing.bands[pricing.bands.length - 1];
    if (lastBand.uptoSequence < 1000) {
      console.warn(`⚠️ pricing: last band uptoSequence=${lastBand.uptoSequence} may be too low; consider a larger catch-all`);
    }
    return;
  }

  throw new Error(`Unknown pricing type: ${(pricing as any).type}`);
}
