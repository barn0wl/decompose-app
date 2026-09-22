// src/services/routing/types.ts
// Shared router types: legs, boardings, and the response shape.

import { TransportType } from '../../../generated/prisma';

// ─── PRICING ──────────────────────────────────────────────────────────────

export type PricingRule =
  | { type: 'flat'; price: number }
  | { type: 'banded'; bands: Array<{ uptoSequence: number; price: number }> };

// ─── STOPS IN A LEG ───────────────────────────────────────────────────────

export interface StopRef {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

// ─── LEGS ─────────────────────────────────────────────────────────────────

export interface BoardingLeg {
  type: 'boarding';
  routeId: string;
  routeName: string;
  transportType: TransportType;

  fromStop: StopRef;
  toStop: StopRef;
  intermediateStops: StopRef[];

  price: number;
  pricingRule: PricingRule;
  distanceStops: number;

  baseDuration: number;
  effectiveDuration: number;
  durationMultiplier: number;

  // For UI: min/max lat/lng to frame the route on a map (optional)
  fromLatitude: number;
  fromLongitude: number;
  toLatitude: number;
  toLongitude: number;
}

export interface WalkingLeg {
  type: 'walking';
  fromStop: StopRef;
  toStop: StopRef;

  distanceM: number;
  baseDuration: number;
  effectiveDuration: number;
  instructions: string;

  fromLatitude: number;
  fromLongitude: number;
  toLatitude: number;
  toLongitude: number;
}

export type Leg = BoardingLeg | WalkingLeg;

// ─── DURATION CONTEXT ─────────────────────────────────────────────────────

export interface DurationContext {
  at: Date;
  timeOfDayLabel: string;
  durationMultiplier: number;
}

// ─── RESPONSE ─────────────────────────────────────────────────────────────

export interface CalculatedRoute {
  id: string;

  legs: Leg[];

  totalPrice: number;
  totalBaseDuration: number;
  totalEffectiveDuration: number;
  totalWalkingDistanceM: number;

  boardingCount: number;
  walkingCount: number;

  durationContext: DurationContext;

  // Debug/diagnostic
  rejectionReason?: string;
}
