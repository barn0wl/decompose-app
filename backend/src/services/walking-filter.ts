// src/services/routing/walking-filter.ts
// Post-filter applied to candidate paths. Rejects routes where walking
// dominates. Runs after Dijkstra/Yen produce candidates, before returning.

import { TransportType } from '../../generated/prisma';
import { GraphEdge } from './graph.builder';
import { WalkingPolicy } from './walking-policy';

export interface WalkingFilterResult {
  passes: boolean;
  walkingDistanceM: number;
  totalDistanceM: number;
  ratio: number;
  reason?: string;
}

export function filterWalkingHeavy(
  path: GraphEdge[],
  policy: WalkingPolicy
): WalkingFilterResult {
  let walkingDistanceM = 0;
  let totalDistanceM = 0;

  for (const edge of path) {
    const d = edge.distanceM ?? 0;
    totalDistanceM += d;
    if (edge.transportType === TransportType.walking) {
      walkingDistanceM += d;
    }
  }

  const ratio = totalDistanceM > 0 ? walkingDistanceM / totalDistanceM : 0;

  if (walkingDistanceM > policy.maxRouteDistanceM) {
    return {
      passes: false,
      walkingDistanceM,
      totalDistanceM,
      ratio,
      reason: `walking distance ${Math.round(walkingDistanceM)}m exceeds max ${policy.maxRouteDistanceM}m`,
    };
  }

  if (ratio > policy.maxRatio) {
    return {
      passes: false,
      walkingDistanceM,
      totalDistanceM,
      ratio,
      reason: `walking ratio ${(ratio * 100).toFixed(0)}% exceeds max ${(policy.maxRatio * 100).toFixed(0)}%`,
    };
  }

  return { passes: true, walkingDistanceM, totalDistanceM, ratio };
}
