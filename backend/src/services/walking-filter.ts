// src/services/routing/walking-filter.ts
// Post-filter applied to candidate paths. Rejects routes where walking
// is excessive, chained, or is the only mode.
//
// Rules (all enforced):
//   1. Any single walking step > maxStepDistanceM    → reject
//   2. Total walking distance > maxRouteDistanceM    → reject
//   3. Total walking steps > maxSteps                → reject
//   4. Any two consecutive walking steps             → reject
//   5. Route is 100% walking                         → reject
//      (unless origin and destination are the same — handled upstream)

import { TransportType } from '../../generated/prisma';
import { GraphEdge } from './graph.builder';
import { WalkingPolicy } from './walking-policy';

export interface WalkingFilterResult {
  passes: boolean;
  walkingDistanceM: number;
  totalDistanceM: number;
  walkingSteps: number;
  reason?: string;
}

export function filterWalkingHeavy(
  path: GraphEdge[],
  policy: WalkingPolicy
): WalkingFilterResult {
  let walkingDistanceM = 0;
  let totalDistanceM = 0;
  let walkingSteps = 0;
  let maxWalkingStepM = 0;
  let consecutiveWalkingCount = 0;
  let maxConsecutiveWalking = 0;
  let nonWalkingSteps = 0;

  for (const edge of path) {
    const isWalking = edge.transportType === TransportType.walking;
    const d = edge.distanceM ?? 0;

    totalDistanceM += d;

    if (isWalking) {
      walkingDistanceM += d;
      walkingSteps++;
      consecutiveWalkingCount++;
      if (d > maxWalkingStepM) maxWalkingStepM = d;
      if (consecutiveWalkingCount > maxConsecutiveWalking) {
        maxConsecutiveWalking = consecutiveWalkingCount;
      }
    } else {
      nonWalkingSteps++;
      consecutiveWalkingCount = 0;
    }
  }

  const base = { walkingDistanceM, totalDistanceM, walkingSteps };

  // Rule 1 — single step too long
  if (maxWalkingStepM > policy.maxStepDistanceM) {
    return {
      ...base,
      passes: false,
      reason: `single walking step ${Math.round(maxWalkingStepM)}m exceeds max ${policy.maxStepDistanceM}m`,
    };
  }

  // Rule 2 — total distance too much
  if (walkingDistanceM > policy.maxRouteDistanceM) {
    return {
      ...base,
      passes: false,
      reason: `total walking ${Math.round(walkingDistanceM)}m exceeds max ${policy.maxRouteDistanceM}m`,
    };
  }

  // Rule 3 — too many walking legs
  if (walkingSteps > policy.maxSteps) {
    return {
      ...base,
      passes: false,
      reason: `${walkingSteps} walking steps exceed max ${policy.maxSteps}`,
    };
  }

  // Rule 4 — consecutive walking steps
  if (maxConsecutiveWalking > policy.maxConsecutiveSteps) {
    return {
      ...base,
      passes: false,
      reason: `${maxConsecutiveWalking} consecutive walking steps exceed max ${policy.maxConsecutiveSteps}`,
    };
  }

  // Rule 5 — all walking
  if (policy.noWalkingOnlyRoute && nonWalkingSteps === 0 && path.length > 0) {
    return {
      ...base,
      passes: false,
      reason: `route is entirely walking`,
    };
  }

  return { ...base, passes: true };
}
