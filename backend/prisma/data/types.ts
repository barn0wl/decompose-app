// prisma/data/types.ts
// Shared types for seed data.

import { StopType, TransportType } from '../../generated/prisma';

export type PricingRule =
  | { type: 'flat'; price: number }
  | { type: 'banded'; bands: Array<{ uptoSequence: number; price: number }> };

export interface AnchorStop {
  name: string;
  commune: string;
  latitude: number;
  longitude: number;
  type: StopType;
}

export interface GtfsStopDef {
  canonicalName: string;
  latitude: number;
  longitude: number;
  gtfsStopIds: string[];
}

export interface CuratedRoute {
  name: string;
  transportType: TransportType;
  stops: string[];
  durations: number[];
  pricing: PricingRule;
}

export interface PriceBand {
  maxKm: number;
  price: number;
}
