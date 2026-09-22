// src/services/routing/coalescer.ts
// Convert a raw GraphEdge[] path into a list of legs.

import { TransportType } from '../../../generated/prisma';
import { GraphEdge } from './graph.builder';
import { Leg, BoardingLeg, WalkingLeg, StopRef, PricingRule } from './types';
import { computeBoardingPrice } from './pricing.service';

export interface CoalesceOptions {
  getPricing: (routeId: string) => PricingRule;
  trafficMultiplier: number;   // applied to motorized durations
  walkingTimePenalty: number;  // applied to walking durations
}

export function coalescePath(path: GraphEdge[], opts: CoalesceOptions): Leg[] {
  const legs: Leg[] = [];
  let i = 0;

  while (i < path.length) {
    const edge = path[i];

    if (edge.transportType === TransportType.walking) {
      const walkEdges: GraphEdge[] = [edge];
      let j = i + 1;
      while (j < path.length && path[j].transportType === TransportType.walking) {
        walkEdges.push(path[j]);
        j++;
      }
      legs.push(buildWalkingLeg(walkEdges, opts));
      i = j;
      continue;
    }

    const boardingEdges: GraphEdge[] = [edge];
    let j = i + 1;
    while (
      j < path.length &&
      path[j].transportType !== TransportType.walking &&
      path[j].routeId === edge.routeId &&
      path[j].direction === edge.direction &&
      isContiguous(path[j - 1], path[j])
    ) {
      boardingEdges.push(path[j]);
      j++;
    }
    legs.push(buildBoardingLeg(boardingEdges, opts));
    i = j;
  }

  return legs;
}

function isContiguous(prev: GraphEdge, curr: GraphEdge): boolean {
  if (prev.direction === 'forward') return curr.sequence === prev.sequence + 1;
  return curr.sequence === prev.sequence - 1;
}

function edgeToStopRef(e: GraphEdge): StopRef {
  return {
    id: e.to,
    name: e.toName,
    latitude: e.toLatitude,
    longitude: e.toLongitude,
  };
}

function edgeFromStopRef(e: GraphEdge): StopRef {
  return {
    id: e.fromId,
    name: e.fromName,
    latitude: e.fromLatitude,
    longitude: e.fromLongitude,
  };
}

function buildWalkingLeg(edges: GraphEdge[], opts: CoalesceOptions): WalkingLeg {
  const first = edges[0];
  const last = edges[edges.length - 1];

  const distanceM = edges.reduce((sum, e) => sum + (e.distanceM ?? 0), 0);
  const baseDuration = edges.reduce((sum, e) => sum + e.duration, 0);
  const effectiveDuration = Math.max(1, Math.round(baseDuration * opts.walkingTimePenalty));

  return {
    type: 'walking',
    fromStop: edgeFromStopRef(first),
    toStop: edgeToStopRef(last),
    distanceM,
    baseDuration,
    effectiveDuration,
    instructions: first.instructions,
    fromLatitude: first.fromLatitude,
    fromLongitude: first.fromLongitude,
    toLatitude: last.toLatitude,
    toLongitude: last.toLongitude,
  };
}

function buildBoardingLeg(edges: GraphEdge[], opts: CoalesceOptions): BoardingLeg {
  const first = edges[0];
  const last = edges[edges.length - 1];

  const pricingRule = opts.getPricing(first.routeId);
  const distanceStops = edges.length;
  const price = computeBoardingPrice(pricingRule, distanceStops);

  const baseDuration = edges.reduce((sum, e) => sum + e.duration, 0);
  const effectiveDuration = Math.max(1, Math.round(baseDuration * opts.trafficMultiplier));

  const intermediateStops: StopRef[] = [];
  for (let k = 0; k < edges.length - 1; k++) {
    intermediateStops.push(edgeToStopRef(edges[k]));
  }

  return {
    type: 'boarding',
    routeId: first.routeId,
    routeName: first.routeName,
    transportType: first.transportType,
    fromStop: edgeFromStopRef(first),
    toStop: edgeToStopRef(last),
    intermediateStops,
    price,
    pricingRule,
    distanceStops,
    baseDuration,
    effectiveDuration,
    durationMultiplier: opts.trafficMultiplier,
    fromLatitude: first.fromLatitude,
    fromLongitude: first.fromLongitude,
    toLatitude: last.toLatitude,
    toLongitude: last.toLongitude,
  };
}
