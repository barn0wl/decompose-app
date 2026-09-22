// src/services/routing/walking-policy.ts
// Tunable walking policy constants.
// Walking is a connector between motorized legs, not a mode.

export interface WalkingPolicy {
  timePenalty: number;         // multiplier applied to walking duration
  maxStepDistanceM: number;    // maximum distance for a single walking edge
  maxRouteDistanceM: number;   // maximum total walking distance across a route
  maxSteps: number;            // maximum number of walking legs in the whole route
  maxConsecutiveSteps: number; // maximum consecutive walking steps
  noWalkingOnlyRoute: boolean; // reject routes that are 100% walking
}

export const DEFAULT_WALKING_POLICY: WalkingPolicy = {
  timePenalty: 1.15,
  maxStepDistanceM: 500,
  maxRouteDistanceM: 1200,
  maxSteps: 3,
  maxConsecutiveSteps: 1,
  noWalkingOnlyRoute: true,
};
