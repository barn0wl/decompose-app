// src/services/routing/walking-policy.ts
// Tunable walking policy constants. Change these to reshape router behavior
// without touching the algorithm itself.

export interface WalkingPolicy {
  pricePerKm: number;         // CFA-equivalent penalty per km walked
  timePenalty: number;        // multiplier applied to walking duration
  maxStepDistanceM: number;   // maximum distance for a single walking edge
  maxRouteDistanceM: number;  // maximum total walking distance across a route
  maxRatio: number;           // max fraction of total distance that can be walking
}

export const DEFAULT_WALKING_POLICY: WalkingPolicy = {
  pricePerKm: 50,
  timePenalty: 1.15,
  maxStepDistanceM: 1000,
  maxRouteDistanceM: 1500,
  maxRatio: 0.5,
};
